const { exec } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const getCronJobs = () => {
  return new Promise((resolve, reject) => {
    // Get the crontab for the current user
    exec('crontab -l', (error, stdout, stderr) => {
      if (error) {
        // If no crontab, it returns an error
        return resolve([]);
      }
      
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const jobs = lines.map((line, index) => {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          return {
            id: index,
            schedule: parts.slice(0, 5).join(' '),
            command: parts.slice(5).join(' '),
            raw: line
          };
        }
        return { id: index, raw: line };
      });
      
      resolve(jobs);
    });
  });
};

const addCronJob = async (schedule, command) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!/^[\d\*\/\,\-]+(\s+[\d\*\/\,\-]+){4}$/.test(schedule)) {
        throw new Error('Invalid cron schedule format');
      }
      
      if (typeof command !== 'string' || command.includes('\n') || command.includes('\r')) {
        throw new Error('Command cannot contain newlines or carriage returns');
      }
      
      const currentCrontab = await new Promise((res) => {
        exec('crontab -l', (error, stdout) => res(error ? '' : stdout));
      });
      
      const newJob = `${schedule} ${command}`;
      const tmpFile = path.join(os.tmpdir(), `cron_${Date.now()}`);
      
      await fs.writeFile(tmpFile, currentCrontab + (currentCrontab.endsWith('\n') || currentCrontab === '' ? '' : '\n') + newJob + '\n');
      
      exec(`crontab ${tmpFile}`, async (error) => {
        await fs.unlink(tmpFile).catch(() => {});
        if (error) return reject(error);
        resolve({ success: true });
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { getCronJobs, addCronJob };
