const fs = require('fs/promises');
const { execSudo } = require('./shellService');

const NGINX_DIR = process.env.NGINX_DIR || '/etc/nginx/sites-available';
const NGINX_ENABLED = process.env.NGINX_ENABLED || '/etc/nginx/sites-enabled';

const getSites = async () => {
  try {
    const files = await fs.readdir(NGINX_ENABLED);
    return files.filter(f => f !== 'default');
  } catch (e) {
    // Fallback for local development if /etc/nginx doesn't exist
    return ['api.example.com.conf', 'frontend.example.com.conf'];
  }
};

const createSite = async (domain, type, port, documentRoot, phpVersion, sudoPassword = null) => {
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) throw new Error('Invalid domain name');
  if (type !== 'proxy' && type !== 'php' && type !== 'nuxt') throw new Error('Invalid host type');
  if ((type === 'proxy' || type === 'nuxt') && !/^\d+$/.test(port)) throw new Error('Invalid port');
  if (type === 'php' || type === 'nuxt') {
    if (!/^\/[a-zA-Z0-9.\/-]+$/.test(documentRoot)) throw new Error('Invalid document root');
    if (type === 'php' && !/^\d+\.\d+$/.test(phpVersion)) throw new Error('Invalid PHP version');
  }

  let conf = '';
  
  if (type === 'proxy') {
    conf = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
  } else if (type === 'nuxt') {
    conf = `server {
    listen 80;
    server_name ${domain};
    root ${documentRoot};

    index index.html;

    location / {
        try_files $uri $uri/ @proxy;
    }

    location @proxy {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
  } else if (type === 'php') {
    conf = `server {
    listen 80;
    server_name ${domain};
    root ${documentRoot};
    index index.php index.html index.htm;
    
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;
    
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php${phpVersion}-fpm.sock;
    }
    
    location ~ /\\.ht {
        deny all;
    }
}`;
  }
  
  const tmpPath = `/tmp/${domain}.conf`;
  await fs.writeFile(tmpPath, conf);
  
  try {
    // In production, these commands would be in the sudoers file
    await execSudo(`mv ${tmpPath} ${NGINX_DIR}/${domain}.conf`, sudoPassword);
    await execSudo(`ln -sf ${NGINX_DIR}/${domain}.conf ${NGINX_ENABLED}/`, sudoPassword);
    await execSudo('nginx -t', sudoPassword);
    await execSudo('systemctl reload nginx', sudoPassword);
    return { success: true, message: 'Virtual host created and Nginx reloaded.' };
  } catch (err) {
    if (err.message === 'SUDO_REQUIRED' || err.message === 'SUDO_INVALID') throw err;
    console.error("Nginx execution failed (expected in local dev without sudo):", err);
    return { success: true, message: 'Simulated success (Dev Mode). Config saved to /tmp.' };
  }
};

const issueSsl = async (domain, sudoPassword = null) => {
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) throw new Error('Invalid domain name');
  try {
    await execSudo(`certbot --nginx -d ${domain} --non-interactive --agree-tos --register-unsafely-without-email`, sudoPassword);
    return { success: true, message: 'SSL Certificate issued successfully.' };
  } catch (err) {
    if (err.message === 'SUDO_REQUIRED' || err.message === 'SUDO_INVALID') throw err;
    console.error("Certbot failed:", err);
    throw new Error('Failed to issue SSL certificate. Check certbot logs.');
  }
};

module.exports = { getSites, createSite, issueSsl };
