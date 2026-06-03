const { spawn } = require('child_process');
const fs = require('fs/promises');
const { createSite } = require('./nginx');
const db = require('./db');
const { isPortAvailable, getNextPort } = require('./system');

const activeDeploys = new Set();

const deployApp = async (io, repoUrl, port, appName, branch = '', baseDeployDir = '/var/www', sudoPassword = null, domain = null, appType = 'node', useLegacyPeerDeps = false, sshKey = null) => {
  const log = (msg) => io.emit('deploy-log', `${msg}\n`);

  if (activeDeploys.has(appName)) {
    log(`[ERROR] A deployment for ${appName} is already in progress. Please wait.`);
    io.emit('deploy-end');
    return;
  }

  activeDeploys.add(appName);
  
  try {
  if (!/^[a-zA-Z0-9-_\.]+$/.test(appName)) {
    throw new Error('Invalid app name. Use alphanumeric characters, hyphens, underscores, and dots only.');
  }

  if (!/^\/[a-zA-Z0-9.\/-]+$/.test(baseDeployDir)) {
    throw new Error('Invalid base directory. Must be an absolute Linux path.');
  }

  if (repoUrl && repoUrl !== 'existing' && !/^[a-zA-Z0-9.\-_:/@\/]+$/.test(repoUrl)) {
    throw new Error('Invalid repository URL format.');
  }

  if (branch && !/^[a-zA-Z0-9.\-_/]+$/.test(branch)) {
    throw new Error('Invalid branch name format.');
  }

  if (sshKey && !/^[a-zA-Z0-9.\-_]+$/.test(sshKey)) {
    throw new Error('Invalid SSH key name format. Only alphanumeric, dots, dashes, and underscores are allowed.');
  }

  if (appType && !/^[a-z]+$/.test(appType)) {
    throw new Error('Invalid app type format.');
  }

  if (port && !/^[0-9]+$/.test(port.toString())) {
    throw new Error('Invalid port. Must be a number.');
  }

  let finalPort = null;
  if (appType === 'node' || appType === 'nuxt') {
    finalPort = parseInt(port || '3000', 10);
    const existingAppWithPort = db.prepare("SELECT * FROM apps WHERE port = ? AND name != ?").get(finalPort, appName);
    const physicalAvailable = await isPortAvailable(finalPort);

    if (existingAppWithPort || !physicalAvailable) {
      log(`[INFO] Port ${finalPort} is already in use. Searching for the next available port...`);
      finalPort = await getNextPort(finalPort);
      log(`[INFO] Found available port: ${finalPort}. Using this port for deployment.`);
    }
  }
  
  const deployDir = `${baseDeployDir.replace(/\/$/, '')}/${appName}`;
  
  log(`[${new Date().toISOString()}] Started ${appType} deployment for ${appName}`);

  // Setup permissions before starting
  log(`> Preparing deployment directory ${deployDir}...`);
  await require('./shellService').execSudo(`/usr/bin/mkdir -p ${deployDir}`, sudoPassword);
  await require('./shellService').execSudo(`/usr/bin/chown -R $USER:$USER ${deployDir}`, sudoPassword);
  
  const script = `#!/bin/bash
set -e
echo "> Setting up deployment directory..."
cd ${deployDir}

export GIT_SSH_COMMAND="ssh ${sshKey ? `-i ~/.ssh/${sshKey}` : ''} -o StrictHostKeyChecking=accept-new"

if [ "${repoUrl}" != "existing" ]; then
  if [ -d ".git" ]; then
    echo "> Pulling latest changes..."
    git fetch origin
    ${branch ? `git checkout ${branch}\n  git pull origin ${branch}` : `git pull`}
  elif [ -n "${repoUrl}" ]; then
    echo "> Cloning repository ${repoUrl} ${branch ? `(branch: ${branch})` : '(default branch)'}..."
    ${branch ? `git clone -b ${branch} ${repoUrl} .` : `git clone ${repoUrl} .`}
  else
    echo "> [ERROR] No repository URL provided and no existing .git directory found."
    exit 1
  fi
else
  echo "> Skipping Git operations (Existing directory deployment)."
fi

if [ "${appType}" == "laravel" ] || [ "${appType}" == "php" ]; then
  if [ "${appType}" == "laravel" ]; then
    echo "> Laravel project detected, running composer and npm..."
    if [ -f "composer.json" ]; then
      composer install --no-interaction --prefer-dist --optimize-autoloader
    fi
    if [ -f "package.json" ]; then
      npm install
      npm run build || true
    fi
    echo "> Running Laravel specific commands..."
    php artisan optimize:clear || true
    php artisan migrate --force || true
  else
    echo "> PHP project detected, skipping build steps."
  fi
  echo "> Setting correct permissions for web server..."
  chown -R www-data:www-data . || true
  echo "> [SUCCESS] PHP/Laravel Deployment completed successfully!"
  exit 0
fi

echo "> Installing Node.js dependencies..."
export PATH=$PATH:$(pwd)/node_modules/.bin
# Temporarily unset NODE_ENV to ensure devDependencies (like nuxt) are installed
OLD_NODE_ENV=$NODE_ENV
export NODE_ENV=development
npm install ${useLegacyPeerDeps ? '--legacy-peer-deps' : ''} --ignore-scripts --include=dev
export NODE_ENV=$OLD_NODE_ENV

if [ "${appType}" == "nuxt" ]; then
  echo "> Nuxt project detected, running 'npx nuxt prepare' manually..."
  npx nuxt prepare
fi

if grep -q '"build":' package.json; then
  echo "> Running build script..."
  npm run build
elif [ "${appType}" == "nuxt" ]; then
  echo "> Running 'npx nuxt build'..."
  npx nuxt build
else
  echo "> No build script found, skipping."
fi

echo "> Starting application via PM2 on port ${finalPort}..."
export PORT=${finalPort}

if [ "${appType}" == "nuxt" ] && [ -f ".output/server/index.mjs" ]; then
  echo "> Nuxt 3 output detected, starting from .output/server/index.mjs"
  pm2 start .output/server/index.mjs --name "${appName}" --interpreter node || pm2 restart "${appName}"
else
  pm2 start npm --name "${appName}" -- start || pm2 restart "${appName}"
fi

pm2 save

echo "> [SUCCESS] Node.js Deployment completed successfully!"
`;

  const scriptPath = `/tmp/deploy_${appName}_${Date.now()}.sh`;
  await fs.writeFile(scriptPath, script);
  await fs.chmod(scriptPath, 0o755);
  
  const child = spawn('bash', [scriptPath]);
  
  child.stdout.on('data', (data) => log(data.toString()));
  child.stderr.on('data', (data) => log(`[STDERR] ${data.toString()}`));
  
  child.on('close', async (code) => {
    activeDeploys.delete(appName);
    await fs.unlink(scriptPath).catch(() => {});
    
    if (code !== 0) {
      log(`[ERROR] Deployment failed with exit code ${code}`);
      io.emit('deploy-end');
      return;
    }
    
    if (domain && finalPort) {
      log(`> Attaching Nginx Virtual Host for ${domain} on port ${finalPort}...`);
      try {
        const nginxType = appType === 'nuxt' ? 'nuxt' : 'proxy';
        const docRoot = appType === 'nuxt' ? `${deployDir}/public` : null;
        const result = await createSite(domain, nginxType, finalPort, docRoot, null, sudoPassword);
        log(`> [NGINX] ${result.message}`);
      } catch (err) {
        log(`[ERROR] Failed to attach domain: ${err.message}`);
      }
    }
    
    try {
      db.prepare(
        `INSERT INTO apps (name, type, base_deploy_dir, ssh_key, domain, port) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON CONFLICT(name) DO UPDATE SET 
         type=excluded.type, base_deploy_dir=excluded.base_deploy_dir, 
         ssh_key=excluded.ssh_key, domain=excluded.domain, port=excluded.port`
      ).run(appName, appType, baseDeployDir, sshKey, domain, finalPort);
    } catch (err) {
      console.error("DB Insert Error for App:", err);
    }
    
    io.emit('deploy-end');
  });
  } catch (error) {
    activeDeploys.delete(appName);
    throw error;
  }
};

module.exports = { deployApp };
