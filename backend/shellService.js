const { exec } = require('child_process');

/**
 * Safely executes a whitelisted sudo command
 * @param {string} command 
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function execSudo(command, sudoPassword = null) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    if (sudoPassword) {
      const child = exec(`sudo -S ${command}`, (error, stdout, stderr) => {
        if (error) {
          if (stderr.includes('incorrect password')) return reject(new Error('SUDO_INVALID'));
          return reject(error);
        }
        resolve({ stdout, stderr });
      });
      child.stdin.write(sudoPassword + '\n');
      child.stdin.end();
    } else {
      exec(`sudo -n ${command}`, (error, stdout, stderr) => {
        if (error && ((stderr && stderr.toLowerCase().includes('password')) || (error.message && error.message.toLowerCase().includes('password')) || (stderr && stderr.includes('sudo: a password is required')))) {
          return reject(new Error('SUDO_REQUIRED'));
        }
        if (error) return reject(error);
        resolve({ stdout, stderr });
      });
    }
  });
}

module.exports = {
  execSudo
};
