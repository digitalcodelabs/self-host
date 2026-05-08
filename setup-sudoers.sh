#!/bin/bash
# Run this script as root (or with sudo) to configure passwordless sudo
# for the specific commands required by the self-host control panel.

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g., sudo bash setup-sudoers.sh)"
  exit 1
fi

PANEL_USER=${1:-"srvpanel"}

echo "Configuring passwordless sudo for user: $PANEL_USER"

cat << EOF > /etc/sudoers.d/$PANEL_USER
# Passwordless sudo for self-host panel commands
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

echo "Successfully created /etc/sudoers.d/$PANEL_USER"
echo "You should no longer be prompted for a sudo password in the control panel."
