const os = require('os');
const pm2 = require('pm2');

const getSystemStats = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();

  return {
    cpuLoad: (loadAvg[0] * 100 / os.cpus().length).toFixed(1), // 1 min load relative to core count
    memory: {
      total: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      used: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      percent: Math.round((usedMem / totalMem) * 100)
    }
  };
};

const getApps = () => {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);
      pm2.list((err, list) => {
        pm2.disconnect();
        if (err) return reject(err);
        
        const apps = list.map(app => ({
          id: app.pm_id,
          name: app.name,
          status: app.pm2_env.status,
          memory: Math.round(app.monit ? app.monit.memory / 1024 / 1024 : 0),
          cpu: app.monit ? app.monit.cpu : 0,
          uptime: app.pm2_env.pm_uptime
        }));
        resolve(apps);
      });
    });
  });
};

const getServices = async () => {
  const checkService = (service) => {
    return new Promise((resolve) => {
      require('child_process').exec(`systemctl is-active ${service}`, (error, stdout) => {
        const status = stdout.trim();
        resolve({
          name: service,
          status: status === 'active' ? 'online' : (status === 'unknown' ? 'unknown' : 'offline')
        });
      });
    });
  };

  const servicesToCheck = ['nginx', 'mysql', 'mariadb', 'redis-server', 'memcached'];
  try {
    const dirs = await require('fs/promises').readdir('/etc/php');
    const versions = dirs.filter(v => /^\d+\.\d+$/.test(v));
    versions.forEach(v => servicesToCheck.push(`php${v}-fpm`));
  } catch (e) {
    servicesToCheck.push('php8.1-fpm');
  }

  const results = await Promise.all(servicesToCheck.map(checkService));
  // Filter out services that aren't installed on the server (status 'unknown')
  return results.filter(s => s.status !== 'unknown');
};

const pm2Action = (appName, action) => {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);
      const cb = (err) => {
        pm2.disconnect();
        if (err) return reject(err);
        resolve();
      };
      if (action === 'restart') pm2.restart(appName, cb);
      else if (action === 'stop') pm2.stop(appName, cb);
      else if (action === 'start') pm2.start(appName, cb);
      else {
        pm2.disconnect();
        reject(new Error('Invalid action'));
      }
    });
  });
};

const getAppLogs = (appName) => {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);
      pm2.describe(appName, (err, description) => {
        pm2.disconnect();
        if (err) return reject(err);
        if (!description || description.length === 0) return reject(new Error('App not found'));
        
        const outPath = description[0].pm2_env.pm_out_log_path;
        const errPath = description[0].pm2_env.pm_err_log_path;
        
        const { exec } = require('child_process');
        exec(`tail -n 100 "${outPath}"`, (err, stdout) => {
          const outLogs = stdout || '';
          exec(`tail -n 100 "${errPath}"`, (err, stderrStdout) => {
            resolve({ out: outLogs, err: stderrStdout || '' });
          });
        });
      });
    });
  });
};

module.exports = { getSystemStats, getApps, getServices, pm2Action, getAppLogs };
