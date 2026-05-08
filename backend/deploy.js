const { spawn } = require('child_process');
const fs = require('fs/promises');
const { createSite } = require('./nginx');

const deployApp = async (io, repoUrl, port, appName, branch = '', baseDeployDir = '/var/www', sudoPassword = null, domain = null, appType = 'node', useLegacyPeerDeps = false) => {
  const log = (msg) => io.emit('deploy-log', `${msg}\n`);
  
  if (!/^[a-zA-Z0-9-]+$/.test(appName)) {
    log(`[ERROR] Invalid app name. Use alphanumeric characters and hyphens only.`);
    io.emit('deploy-end');
    return;
  }

  if (!/^\/[a-zA-Z0-9.\/-]+$/.test(baseDeployDir)) {
    log(`[ERROR] Invalid base directory. Must be an absolute Linux path.`);
    io.emit('deploy-end');
    return;
  }

  if (repoUrl && repoUrl !== 'existing' && !/^[a-zA-Z0-9.\-_:/@\/]+$/.test(repoUrl)) {
    log(`[ERROR] Invalid repository URL format.`);
    io.emit('deploy-end');
    return;
  }

  if (branch && !/^[a-zA-Z0-9.\-_/]+$/.test(branch)) {
    log(`[ERROR] Invalid branch name format.`);
    io.emit('deploy-end');
    return;
  }
  
  const deployDir = `${baseDeployDir.replace(/\/$/, '')}/${appName}`;
  
  // Setup permissions before starting
  await require('./shellService').execSudo(`/usr/bin/mkdir -p ${deployDir}`, sudoPassword);
  await require('./shellService').execSudo(`/usr/bin/chown -R $USER:$USER ${deployDir}`, sudoPassword);
  
  log(`[${new Date().toISOString()}] Started Node.js deployment for ${appName}`);
  
  const script = `#!/bin/bash
set -e
echo "> Setting up deployment directory..."
cd ${deployDir}

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

echo "> Installing Node.js dependencies..."
export PATH=$PATH:$(pwd)/node_modules/.bin
npm install ${useLegacyPeerDeps ? '--legacy-peer-deps' : ''} --ignore-scripts

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

echo "> Starting application via PM2 on port ${port}..."
export PORT=${port}

if [ "${appType}" == "nuxt" ] && [ -f ".output/server/index.mjs" ]; then
  echo "> Nuxt 3 output detected, starting from .output/server/index.mjs"
  pm2 start .output/server/index.mjs --name "${appName}" --interpreter node || pm2 restart "${appName}"
else
  pm2 start npm --name "${appName}" -- start || pm2 restart "${appName}"
fi

pm2 save

echo "> [SUCCESS] Deployment completed successfully!"
`;

  const scriptPath = `/tmp/deploy_${appName}_${Date.now()}.sh`;
  await fs.writeFile(scriptPath, script);
  await fs.chmod(scriptPath, 0o755);
  
  const child = spawn('bash', [scriptPath]);
  
  child.stdout.on('data', (data) => log(data.toString()));
  child.stderr.on('data', (data) => log(`[STDERR] ${data.toString()}`));
  
  child.on('close', async (code) => {
    await fs.unlink(scriptPath).catch(() => {});
    
    if (code !== 0) {
      log(`[ERROR] Deployment failed with exit code ${code}`);
      io.emit('deploy-end');
      return;
    }
    
    if (domain) {
      log(`> Attaching Nginx Virtual Host for ${domain} on port ${port}...`);
      try {
        const nginxType = appType === 'nuxt' ? 'nuxt' : 'proxy';
        const docRoot = appType === 'nuxt' ? `${deployDir}/public` : null;
        const result = await createSite(domain, nginxType, port, docRoot, null, sudoPassword);
        log(`> [NGINX] ${result.message}`);
      } catch (err) {
        log(`[ERROR] Failed to attach domain: ${err.message}`);
      }
    }
    
    io.emit('deploy-end');
  });
};

module.exports = { deployApp };
