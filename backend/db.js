const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new DatabaseSync(path.join(__dirname, 'panel.sqlite'));

// Create tables synchronously
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

// Seed default admin if none exists
const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!user) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run('admin', hash);
  console.log('Seeded default user: admin / admin');
}

db.exec(`CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  type TEXT,
  base_deploy_dir TEXT,
  ssh_key TEXT,
  domain TEXT,
  port INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = db;
