const { execSudo } = require('./shellService');
const { exec } = require('child_process');

const execMysql = (query, sudoPassword) => {
  return new Promise((resolve, reject) => {
    const dbUser = process.env.DB_USER;
    const dbPass = process.env.DB_PASS;
    
    if (dbUser && dbPass) {
      // Use configured credentials
      exec(`mysql -u ${dbUser} -p${dbPass} -Bse "${query}"`, (error, stdout, stderr) => {
        if (error) return reject(error);
        resolve({ stdout, stderr });
      });
    } else {
      // Fallback to sudo mysql
      execSudo(`/usr/bin/mysql -Bse "${query}"`, sudoPassword).then(resolve).catch(reject);
    }
  });
};

const getDatabases = async (sudoPassword) => {
  const { stdout } = await execMysql(`SHOW DATABASES;`, sudoPassword);
  const lines = stdout.split('\n').map(l => l.trim()).filter(l => l && l !== 'Database');
  return lines;
};

const createDatabase = async (dbName, sudoPassword) => {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) throw new Error('Invalid database name');
  await execMysql(`CREATE DATABASE IF NOT EXISTS \\\`${dbName}\\\`;`, sudoPassword);
};

const createUser = async (dbName, username, password, sudoPassword) => {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) throw new Error('Invalid database name');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Invalid username');
  
  const escapedPassword = password.replace(/'/g, "'\\''");
  const query = `CREATE DATABASE IF NOT EXISTS \\\`${dbName}\\\`; CREATE USER IF NOT EXISTS '${username}'@'localhost' IDENTIFIED BY '${escapedPassword}'; GRANT ALL PRIVILEGES ON \\\`${dbName}\\\`.* TO '${username}'@'localhost'; FLUSH PRIVILEGES;`;
  
  await execMysql(query, sudoPassword);
};

const getUsers = async (sudoPassword) => {
  const { stdout } = await execMysql(`SELECT User, Host FROM mysql.user;`, sudoPassword);
  const lines = stdout.split('\n').map(l => {
    const parts = l.split('\t');
    if (parts.length === 2) return { username: parts[0], host: parts[1] };
    return null;
  }).filter(u => u && u.username);
  return lines;
};

const deleteUser = async (username, host, sudoPassword) => {
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Invalid username');
  if (!/^[a-zA-Z0-9_%\.]+$/.test(host)) host = 'localhost'; // default safeguard
  await execMysql(`DROP USER '${username}'@'${host}';`, sudoPassword);
};

const restartMariaDb = async (sudoPassword) => {
  await execSudo(`/bin/systemctl restart mariadb`, sudoPassword);
};

module.exports = { getDatabases, createDatabase, createUser, getUsers, deleteUser, restartMariaDb };
