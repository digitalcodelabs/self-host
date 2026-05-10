require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const db = require('./db');
const { getSystemStats, getApps, getServices, pm2Action, systemctlAction, getSshKeys, generateSshKey } = require('./system');
const { execSudo } = require('./shellService');
const { getSites, createSite, issueSsl } = require('./nginx');
const { getCronJobs, addCronJob } = require('./cron');
const { deployApp } = require('./deploy');
const { getPhpVersions, restartPhpFpm } = require('./php');
const { getDatabases, createDatabase, createUser, getUsers, deleteUser, restartMariaDb } = require('./mariadb');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-panel-key';

app.set('trust proxy', 1); // Trust the Nginx reverse proxy
app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- Public Routes ---
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 login requests
  duration: 15 * 60, // per 15 minutes by IP
});

const loginLimiter = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ error: 'Too many login attempts from this IP, please try again after 15 minutes' });
    });
};

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'User not found' });
    
    if (bcrypt.compareSync(currentPassword, user.password)) {
      const hashed = bcrypt.hashSync(newPassword, 10);
      db.run("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Password updated successfully' });
      });
    } else {
      res.status(401).json({ error: 'Incorrect current password' });
    }
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// --- Protected Routes ---
app.get('/api/system/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/apps', authenticateToken, async (req, res) => {
  try {
    const apps = await getApps();
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/apps/action', authenticateToken, async (req, res) => {
  const { appName, action } = req.body;
  try {
    await pm2Action(appName, action);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/services', authenticateToken, async (req, res) => {
  try {
    const services = await getServices();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SSH Key Management ---
app.get('/api/system/ssh-key', authenticateToken, async (req, res) => {
  try {
    const keys = await getSshKeys();
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/ssh-key', authenticateToken, async (req, res) => {
  try {
    const { keyName } = req.body;
    const key = await generateSshKey(keyName || 'id_ed25519');
    res.json(key); // { filename, publicKey }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/services/action', authenticateToken, async (req, res) => {
  try {
    const { serviceName, action, sudoPassword } = req.body;
    await systemctlAction(serviceName, action, sudoPassword);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/nginx/restart', authenticateToken, async (req, res) => {
  try {
    const { sudoPassword } = req.body;
    await execSudo('systemctl restart nginx', sudoPassword);
    res.json({ success: true, message: 'Nginx restarted successfully' });
  } catch (error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/nginx/sites', authenticateToken, async (req, res) => {
  try {
    const sites = await getSites();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/nginx/sites', authenticateToken, async (req, res) => {
  try {
    const { domain, type, port, documentRoot, phpVersion, sudoPassword } = req.body;
    const result = await createSite(domain, type, port, documentRoot, phpVersion, sudoPassword);
    res.json(result);
  } catch (error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/nginx/ssl', authenticateToken, async (req, res) => {
  try {
    const { domain, sudoPassword } = req.body;
    const result = await issueSsl(domain, sudoPassword);
    res.json(result);
  } catch (error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cron', authenticateToken, async (req, res) => {
  try {
    const jobs = await getCronJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cron', authenticateToken, async (req, res) => {
  try {
    const { schedule, command } = req.body;
    const result = await addCronJob(schedule, command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deploy', authenticateToken, async (req, res) => {
  const { repoUrl, branch, appName, domain, port, deployDir, sudoPassword, appType, useLegacyPeerDeps, sshKey } = req.body;
  try {
    await deployApp(io, repoUrl, port, appName, branch, deployDir, sudoPassword, domain, appType, useLegacyPeerDeps, sshKey);
    res.json({ success: true, message: 'Deployment started' });
  } catch (error) {
    console.error('[Deploy API Error]', error);
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PHP Routes
app.get('/api/php/versions', authenticateToken, async (req, res) => {
  try {
    const versions = await getPhpVersions();
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/php/restart', authenticateToken, async (req, res) => {
  try {
    const { version } = req.body;
    const result = await restartPhpFpm(version);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/databases', authenticateToken, async (req, res) => {
  try {
    const { action, dbName, username, password, host, sudoPassword } = req.body;
    if (action === 'list') {
      const dbs = await getDatabases(sudoPassword);
      const users = await getUsers(sudoPassword);
      return res.json({ databases: dbs, users: users });
    } else if (action === 'list_users') {
      const users = await getUsers(sudoPassword);
      return res.json(users);
    } else if (action === 'create_db') {
      await createDatabase(dbName, sudoPassword);
      return res.json({ success: true });
    } else if (action === 'create_user') {
      await createUser(dbName, username, password, sudoPassword);
      return res.json({ success: true });
    } else if (action === 'delete_user') {
      await deleteUser(username, host, sudoPassword);
      res.json({ success: true });
    } else if (action === 'restart') {
      await restartMariaDb(sudoPassword);
      res.json({ success: true });
    } else {   res.status(400).json({ error: 'Invalid action' }); }
  } catch (error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

const fs = require('fs/promises');

app.get('/api/apps/:name/env', authenticateToken, async (req, res) => {
  try {
    const appName = req.params.name;
    const { baseDeployDir = '/var/www' } = req.query;
    if (!/^[a-zA-Z0-9-]+$/.test(appName)) return res.status(400).json({error: 'Invalid app name'});
    const envPath = `${baseDeployDir.replace(/\/$/, '')}/${appName}/.env`;
    try {
      const content = await fs.readFile(envPath, 'utf8');
      res.json({ content });
    } catch(e) {
      res.json({ content: '' });
    }
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/apps/:name/env', authenticateToken, async (req, res) => {
  try {
    const appName = req.params.name;
    const { content, baseDeployDir = '/var/www' } = req.body;
    if (!/^[a-zA-Z0-9-]+$/.test(appName)) return res.status(400).json({error: 'Invalid app name'});
    const envPath = `${baseDeployDir.replace(/\/$/, '')}/${appName}/.env`;
    await fs.writeFile(envPath, content || '', 'utf8');
    res.json({ success: true });
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/apps/:name', authenticateToken, async (req, res) => {
  try {
    const appName = req.params.name;
    const { sudoPassword, baseDeployDir = '/var/www' } = req.body;
    if (!/^[a-zA-Z0-9-]+$/.test(appName)) return res.status(400).json({error: 'Invalid app name'});
    
    // Stop and delete from PM2 (ignore errors if it doesn't exist)
    try {
      await execSudo(`/usr/bin/pm2 delete ${appName}`, sudoPassword);
      await execSudo(`/usr/bin/pm2 save`, sudoPassword);
    } catch(e) { console.log('PM2 delete skipped or failed'); }
    
    // Delete application directory safely
    const deployDir = `${baseDeployDir.replace(/\/$/, '')}/${appName}`;
    
    // Strict safety checks to prevent catastrophic deletions
    const forbiddenPaths = ['/', '/var', '/var/www', '/etc', '/usr', '/bin', '/sbin', '/dev', '/sys', '/root', '/home'];
    if (forbiddenPaths.includes(deployDir) || !deployDir.startsWith('/')) {
      return res.status(400).json({ error: 'Unsafe directory deletion prevented.' });
    }
    
    await execSudo(`/bin/bash -c "if [ -d '${deployDir}' ]; then rm -rf '${deployDir}'; fi"`, sudoPassword);
    
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch(e) {
    if (e.message === 'SUDO_REQUIRED' || e.message === 'SUDO_INVALID') return res.status(403).json({ error: e.message });
    res.status(500).json({error: e.message});
  }
});

app.post('/api/apps/:name/redeploy', authenticateToken, async (req, res) => {
  try {
    const appName = req.params.name;
    const { sudoPassword, appType = 'node', baseDeployDir = '/var/www' } = req.body;
    if (!/^[a-zA-Z0-9-]+$/.test(appName)) return res.status(400).json({error: 'Invalid app name'});
    
    const deployDir = `${baseDeployDir.replace(/\/$/, '')}/${appName}`;
    const script = `#!/bin/bash
set -e
cd ${deployDir}

if [ -d ".git" ]; then
  echo "> Pulling latest changes..."
  git fetch origin
  git pull
fi

if [ "${appType}" == "laravel" ]; then
  if [ -f "composer.json" ]; then composer install --no-interaction --prefer-dist --optimize-autoloader; fi
  if [ -f "package.json" ]; then npm install && npm run build || true; fi
  php artisan optimize:clear || true
  php artisan migrate --force || true
  chown -R www-data:www-data . || true
  exit 0
fi

if [ "${appType}" == "php" ]; then exit 0; fi

export PATH=$PATH:$(pwd)/node_modules/.bin
OLD_NODE_ENV=$NODE_ENV
export NODE_ENV=development
npm install --ignore-scripts --include=dev
export NODE_ENV=$OLD_NODE_ENV

if [ "${appType}" == "nuxt" ]; then npx nuxt prepare; fi
if grep -q '"build":' package.json; then npm run build; elif [ "${appType}" == "nuxt" ]; then npx nuxt build; fi

pm2 restart "${appName}"
`;

    const scriptPath = `/tmp/redeploy_${appName}_${Date.now()}.sh`;
    await fs.writeFile(scriptPath, script);
    await fs.chmod(scriptPath, 0o755);
    
    const { spawn } = require('child_process');
    const child = spawn('bash', [scriptPath]);
    
    child.stdout.on('data', (data) => io.emit('deploy-log', data.toString()));
    child.stderr.on('data', (data) => io.emit('deploy-log', `[STDERR] ${data.toString()}`));
    
    child.on('close', async (code) => {
      await fs.unlink(scriptPath).catch(() => {});
      io.emit('deploy-end');
    });
    
    res.json({ success: true, message: 'Redeployment started' });
  } catch(e) {
    if (e.message === 'SUDO_REQUIRED' || e.message === 'SUDO_INVALID') return res.status(403).json({ error: e.message });
    res.status(500).json({error: e.message});
  }
});

const { deleteSite } = require('./nginx');

app.delete('/api/nginx/sites/:domain', authenticateToken, async (req, res) => {
  try {
    const domain = req.params.domain;
    const { sudoPassword } = req.body;
    const result = await deleteSite(domain, sudoPassword);
    res.json(result);
  } catch(error) {
    if (error.message === 'SUDO_REQUIRED' || error.message === 'SUDO_INVALID') return res.status(403).json({ error: error.message });
    res.status(500).json({error: error.message});
  }
});

const { getAppLogs } = require('./system');

app.get('/api/apps/:name/logs', authenticateToken, async (req, res) => {
  try {
    const appName = req.params.name;
    const logs = await getAppLogs(appName);
    res.json(logs);
  } catch (e) { res.status(500).json({error: e.message}); }
});

// --- Serve Frontend in Production ---
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// --- WebSockets ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('Admin connected via WebSocket:', socket.id);
  socket.on('deploy', async (data) => {
    try {
      await deployApp(
        io, 
        data.repoUrl || data.repo, 
        data.port, 
        data.appName || data.name, 
        data.branch || '', 
        data.deployDir || '/var/www', 
        data.sudoPassword || null, 
        data.domain || null, 
        data.appType || 'node', 
        data.useLegacyPeerDeps || false,
        data.sshKey || null
      );
    } catch (error) {
      console.error('[Socket Deploy Error]', error);
      socket.emit('deploy-log', `[ERROR] ${error.message}`);
      socket.emit('deploy-end');
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Backend running on ${HOST}:${PORT}`));
