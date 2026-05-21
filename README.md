# Server Panel by [DigitalCodeLabs](https://digitalcodelabs.dev)

A modern, lightweight server management panel for Ubuntu/Debian, designed as a fast alternative to legacy control panels. It features a Node.js/Express backend and a Vue 3 + Vite frontend, utilizing a clean, Shadcn-inspired interface.

## 🚀 Production Installation

To install the panel on a fresh Ubuntu/Debian VPS, run the automated bootstrap script as root:

```bash
curl -sSL https://raw.githubusercontent.com/digitalcodelabs/self-host/main/install.sh | bash
```

*The script will automatically install Nginx, PHP-FPM, MariaDB, Redis, Memcached, Node.js, and set up a secure, unprivileged `srvpanel` user with fine-grained sudo permissions.*

**Installation Path:** The entire panel (backend and frontend) will be installed and served from `/opt/srvpanel`.

## 💻 Local Development

To run the panel locally for development, you will need two terminal windows.

### 1. Start the Backend

```bash
cd backend
npm install
node index.js
```
*Note: The backend runs on port `7777`. If you attempt to manage Nginx or systemctl services locally, the application will fallback to "Dev Mode" safely and simulate the success unless you run it with elevated privileges (e.g., `sudo node index.js`).*

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

## ⚙️ Environment Configuration

For enhanced security and functionality, you can create a `.env` file inside the `backend/` directory to configure the panel.

```env
# Secure your JWT sessions (defaults to a static key if omitted)
JWT_SECRET=your_super_secret_random_string_here

# MariaDB connection credentials (Optional)
# If omitted, the panel gracefully prompts for your sudo password 
# via the UI when performing database management actions.
DB_USER=dbadmin
DB_PASS=dbadmin_password
```

## 🛠️ Troubleshooting

If you encounter issues after running the installation script on a live server, here are the most common solutions:

### 1. "404 Not Found" when accessing your Server IP
If you see a generic white Nginx "404 Not Found" page when navigating to your server's IP address, it means another Nginx configuration (like a default Ubuntu config) is catching the traffic before the panel does.
- **Fix:** Force the panel to be the default server block by editing its configuration:
  `sudo nano /etc/nginx/sites-available/srvpanel.conf`
  Change `listen 80;` to `listen 80 default_server;`
  Then apply the change: `sudo systemctl restart nginx`

### 2. Panel is inaccessible or returns "502 Bad Gateway"
If Nginx is working but the panel isn't loading, the Node.js backend (`srvpanel.service`) might not be running.
- **Fix:** Check the service status and start it if it is inactive:
  `sudo systemctl status srvpanel`
  `sudo systemctl start srvpanel`
  *(Note: The `install.sh` script handles this automatically, but if it failed, you can start it manually).*

### 3. I can access the panel on Port 8080, but not Port 80
The panel's backend runs internally on port `8080`. While it can be accessed directly via your server's IP address on port `8080` (unless blocked by a firewall like UFW), it is highly recommended to access the panel via Port `80` (or `443` if SSL is configured) so Nginx can securely proxy your traffic. If Port 80 isn't working, verify your Nginx syntax with `sudo nginx -t` and restart Nginx.

## ✨ Features

- **Live Dashboard:** Real-time CPU, Memory, Disk, Network, and Running apps monitoring. Includes dynamic service management with instant visual feedback via modern toast notifications.
- **Advanced Git Deployments:** Automated, WebSocket-streamed deployments from Git repositories. Supports multiple app stacks including **Node.js, Nuxt.js, Native Laravel, and Vanilla PHP**.
- **Automated SSL & Virtual Hosts:** 1-click Nginx Virtual Host creation and secure proxy routing. Auto-issues SSL certificates utilizing Certbot.
- **Dedicated SSH Key Management:** Generate custom deployment SSH keys (ed25519) directly from the interface to securely pull private GitHub/GitLab repositories.
- **App Management Suite:** 
  - **1-Click Redeploys:** Gracefully pull the latest code, run build scripts, and restart your app without leaving the dashboard.
  - **Secure Deletion:** Remove applications securely from PM2 and Nginx registries with built-in safety mechanisms that protect system directories.
  - **Live Configuration:** Integrated log viewer for `out.log` / `err.log` and a real-time `.env` configuration editor with auto-restart functionality.
- **Database Provisioning:** Full MariaDB integration for provisioning databases, creating local users with automatic privilege assignment, and deleting users. Seamlessly manages connections via `.env` credentials or falls back to an interactive `sudo` privilege prompt.
- **System Architecture:** Clean, headless daemon architecture utilizing an advanced "Sudo Prompt" modal system. Safely allows elevated execution of systemctl/nginx operations without exposing a root shell.
- **PHP Manager:** Auto-detects installed PHP versions and allows 1-click FPM restarts.
- **Cron Management:** Visual crontab management for scheduled tasks.
