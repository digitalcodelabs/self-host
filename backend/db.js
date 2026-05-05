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
});

module.exports = db;
