const { spawn } = require('child_process');
const fs = require('fs/promises');
const { createSite } = require('./nginx');

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
    activeDeploys.delete(appName);
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
  } catch (error) {
    activeDeploys.delete(appName);
    throw error;
  }
};

module.exports = { deployApp };
