# ICT Forex Signals Terminal — Production Hosting Guide

This guide details how to build and host your terminal online across different hosting platforms (Hostinger, Render, Railway, VPS, Docker).

---

## 🔑 Master Admin Credentials
- **Master Admin Email**: `admin@forex.com`
- **Master Admin Password**: `AdminPassword123!`
- **Role**: `Master Admin`
- **User Management Panel**: From the dashboard header, open **Manage Users** to create trader accounts with custom durations (7 Days, 30 Days, 6 Months, 1 Year, or Lifetime) and assign specific strategy access (`CBDR`, `STOP_HUNT`, or `ALL`).

---

## 🚀 Quick Deployment Options

### Option 1: One-Click Cloud Hosting (Render / Railway / Fly.io) — Recommended
Since the codebase is synced to GitHub (`https://github.com/aliakbar7013/Forex-Main.git`), cloud deployment is completely automatic:

1. **Log in to [Render.com](https://render.com) or [Railway.app](https://railway.app)**.
2. Click **New Web Service** and connect your GitHub repository `Forex-Main`.
3. Configure the settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Node Version**: 20+
4. Click **Deploy**. Your terminal will be live with a free SSL HTTPS link!

---

### Option 2: Hostinger VPS or Linux VPS (Ubuntu / Debian / DigitalOcean)

#### 1. Setup Node.js 20 & Git on your VPS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git
```

#### 2. Clone the Repository & Build
```bash
git clone https://github.com/aliakbar7013/Forex-Main.git forex-terminal
cd forex-terminal
npm install
npm run build
```

#### 3. Keep Running 24/7 with PM2
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### 4. Nginx Reverse Proxy with Free SSL (Certbot)
```nginx
# /etc/nginx/sites-available/forex
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/forex /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com
```

---

### Option 3: Docker Deployment (1 Command)
```bash
docker compose up -d --build
```
This builds and starts the terminal container with persistent SQLite database storage mounted in `./data`.

---

### Option 4: Instant Public Access (Cloudflare Tunnel)
If you want to host from your computer or home server with zero router configuration:
```bash
# In the terminal directory:
node server.js

# In a second terminal window:
npx cloudflared tunnel --url http://localhost:3000
```
This generates a secure, free public HTTPS link accessible on any mobile device or browser worldwide.
