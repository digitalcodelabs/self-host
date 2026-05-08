const fs = require('fs/promises');
const { execSudo } = require('./shellService');
const { exec } = require('child_process');

const getPhpVersions = async () => {
  try {
    const dirs = await fs.readdir('/etc/php');
    // Filter out valid version strings like 8.1, 8.2, 8.3
    const versions = dirs.filter(v => /^\d+\.\d+$/.test(v));
    
    // Check status for each version
    const results = await Promise.all(versions.map(async (v) => {
      return new Promise((resolve) => {
        exec(`systemctl is-active php${v}-fpm`, (error, stdout) => {
          resolve({
            version: v,
            status: stdout.trim() === 'active' ? 'online' : 'offline'
          });
        });
      });
    }));
    
    return results;
  } catch (e) {
    // Development fallback if /etc/php doesn't exist
    return [
      { version: '8.1', status: 'online' },
      { version: '8.2', status: 'offline' }
    ];
  }
};

const restartPhpFpm = async (version) => {
  if (!/^\d+\.\d+$/.test(version)) throw new Error('Invalid PHP version format');
  try {
    const { stdout, stderr } = await execSudo(`/bin/systemctl restart php${version}-fpm`);
    return { success: true, stdout, stderr };
  } catch (error) {
    throw new Error(`Failed to restart PHP ${version} FPM: ${error.message}`);
  }
};

module.exports = { getPhpVersions, restartPhpFpm };
