#!/bin/bash
# DigitalCodeLabs Server Panel Installer
# Run as root: curl -sSL https://digitalcodelabs.dev/install.sh | bash

set -e

PANEL_USER="srvpanel"
PANEL_DIR="/opt/srvpanel"
PORT=8080

# 1. Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

echo "🚀 Starting Installation of Server Panel..."

# 2. Update and install core dependencies
echo "📦 Installing system dependencies (Nginx, Certbot, PHP, MariaDB, Redis, Memcached, Git)..."
apt-get update -y
apt-get install -y curl git unzip nginx certbot python3-certbot-nginx sqlite3 ufw sudo software-properties-common mariadb-server redis-server memcached php-fpm php-mysql php-memcached php-gd php-imagick php-curl php-mbstring php-xml php-zip php-bcmath php-intl

# 3. Install Node.js (LTS) & PM2
if ! command -v node &> /dev/null; then
    echo "🟩 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "🟩 Installing PM2..."
    npm install -g pm2
fi

# 3.5 Install Composer
if ! command -v composer &> /dev/null; then
    echo "🎵 Installing Composer..."
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# 4. Create the dedicated, unprivileged panel user
if ! id "$PANEL_USER" &>/dev/null; then
    echo "👤 Creating dedicated user: $PANEL_USER..."
    useradd -r -d $PANEL_DIR -s /bin/bash $PANEL_USER
fi

echo "⚙️ Configuring PM2 as a standalone system service..."
PM2_BIN=$(which pm2)
NODE_BIN_DIR=$(dirname $(which node))
env PATH=$PATH:$NODE_BIN_DIR $PM2_BIN startup systemd -u $PANEL_USER --hp $PANEL_DIR

# 5. Setup Secure Sudoers Rules for the Panel User
# This allows the panel to manage Nginx, PM2, and systemctl securely without full root access
echo "🔒 Configuring sudoers permissions..."
cat <<EOF > /etc/sudoers.d/$PANEL_USER
$PANEL_USER ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop nginx
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl start nginx
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart php*-fpm
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart mysql
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart mariadb
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart redis-server
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart memcached
$PANEL_USER ALL=(ALL) NOPASSWD: /usr/bin/mysql
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/mv /tmp/*.conf /etc/nginx/sites-available/*
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/ln -sf /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/rm /etc/nginx/sites-available/*
$PANEL_USER ALL=(ALL) NOPASSWD: /bin/rm /etc/nginx/sites-enabled/*
$PANEL_USER ALL=(ALL) NOPASSWD: /usr/bin/certbot
$PANEL_USER ALL=(ALL) NOPASSWD: /usr/bin/mkdir -p /var/www/*
$PANEL_USER ALL=(ALL) NOPASSWD: /usr/bin/chown -R * /var/www/*
EOF
chmod 0440 /etc/sudoers.d/$PANEL_USER

# 6. Clone Repository and Build
echo "📁 Cloning Repository..."
rm -rf $PANEL_DIR
git clone https://github.com/digitalcodelabs/self-host.git $PANEL_DIR

echo "🛠️ Building Frontend..."
cd $PANEL_DIR/frontend
npm install
npm run build

echo "🛠️ Installing Backend Dependencies..."
cd $PANEL_DIR/backend
npm install

echo "🔒 Generating secure configuration..."
RANDOM_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
cat <<EOF > $PANEL_DIR/backend/.env
JWT_SECRET=$RANDOM_SECRET
EOF

echo "🔑 Setting Permissions..."
chown -R $PANEL_USER:$PANEL_USER $PANEL_DIR

# 7. Setup Systemd Service to keep backend running
echo "⚙️ Creating Systemd service..."
NODE_BIN=$(which node)
cat <<EOF > /etc/systemd/system/srvpanel.service
[Unit]
Description=Server Management Panel Backend
After=network.target

[Service]
Type=simple
User=$PANEL_USER
WorkingDirectory=$PANEL_DIR/backend
ExecStart=$NODE_BIN index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now srvpanel

# 8. Firewall & Nginx Panel Proxy
echo "🌐 Configuring Nginx reverse proxy for panel..."
# Note: In production, you would ask the user for a domain name and run certbot here.
cat <<EOF > /etc/nginx/sites-available/srvpanel.conf
server {
    listen 80 default_server;
    server_name _; # Catch-all, access via IP for now

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/srvpanel.conf /etc/nginx/sites-enabled/
# Remove default nginx welcome page
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo "✅ Installation Complete!"
SERVER_IP=$(ip route get 1.1.1.1 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')
echo "Navigate to http://${SERVER_IP} to access your panel."
echo "Powered by DigitalCodeLabs.dev"
