const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'panel.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Seed default admin if none exists
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin', 10);
      db.run("INSERT INTO users (username, password) VALUES ('admin', ?)", [hash]);
      console.log('Seeded default user: admin / admin');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    type TEXT,
    base_deploy_dir TEXT,
    ssh_key TEXT,
    domain TEXT,
    port INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
