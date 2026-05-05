# Server Panel by DigitalCodeLabs

A modern, lightweight server management panel for Ubuntu/Debian, designed as a fast alternative to legacy control panels. It features a Node.js/Express backend and a Vue 3 + Vite frontend, utilizing a clean, Shadcn-inspired interface.

## 🚀 Production Installation

To install the panel on a fresh Ubuntu/Debian VPS, run the automated bootstrap script as root:

```bash
curl -sSL https://raw.githubusercontent.com/digitalcodelabs/self-host/main/install.sh | bash
```

*The script will automatically install Nginx, PHP-FPM, MariaDB, Redis, Memcached, Node.js, and set up a secure, unprivileged `srvpanel` user with fine-grained sudo permissions.*

## 💻 Local Development

To run the panel locally for development, you will need two terminal windows.

### 1. Start the Backend

```bash
cd backend
npm install
node index.js
```
*Note: The backend runs on port `3000`. If you attempt to manage Nginx or systemctl services locally, the application will fallback to "Dev Mode" safely and simulate the success unless you run it with elevated privileges (e.g., `sudo node index.js`).*

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```
*The frontend runs on port `5173`. Open `http://localhost:5173` in your browser.*

## 🔑 Default Credentials

Upon starting the backend for the first time, it will auto-seed the SQLite database with the following default administrator credentials:

- **Username:** `admin`
- **Password:** `admin`

*(Ensure you change these immediately in a production environment!)*

## ✨ Features

- **Live Dashboard:** Real-time CPU and Memory monitoring.
- **Web Server Configuration:** Manage Nginx Virtual Hosts for Node.js proxies or PHP-FPM applications.
- **PHP Manager:** Auto-detects installed PHP versions and allows 1-click FPM restarts.
- **Git Deployments:** Automated, WebSocket-streamed deployments from Git repositories.
- **App Management (PM2):** Integrated log viewer for `out.log` / `err.log` and a real-time `.env` configuration editor with auto-restart functionality.
- **Database Management:** Full MariaDB integration for provisioning databases, creating local users with automatic privilege assignment, and deleting users. Seamlessly manages connections via `.env` credentials or falls back to an interactive `sudo` privilege prompt.
- **Cron Management:** Visual crontab management for scheduled tasks.
- **Service Monitoring:** PM2 process management and systemd service tracking (Nginx, MariaDB, Redis, Memcached).
