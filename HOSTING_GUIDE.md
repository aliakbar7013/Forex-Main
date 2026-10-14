# ICT Forex Signals Terminal — Production Hosting Guide

This guide details how to host and run your website online across different hosting options.

---

## 🔑 Master Access Credentials
- **Master Owner PIN**: `9398` (Permanent root admin)
- **Role**: `Master Admin (Owner)`
- **Capabilities**: Unlocks dashboard, manages & creates trader PINs, revokes access, and copies trader PINs.

---

## Option 1: Live Cloudflare Tunnel (Zero-Configuration, Currently Active)
If running from your computer or home server, the Cloudflare tunnel forwards traffic securely without opening router ports:

```bash
# Start Next.js production server
npm run start -- -H 0.0.0.0 -p 3001

# In another terminal, start the Cloudflare tunnel
npx -y cloudflared tunnel --url http://localhost:3001
```

---

## Option 2: Linux / VPS Hosting (Ubuntu / Debian / DigitalOcean / Hetzner)

### 1. Setup Node.js 20 & Git
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git
```

### 2. Install Project Dependencies & Build
```bash
git clone <your-repo-url> forex-signals-dashboard
cd forex-signals-dashboard
npm install
npm run build
```

### 3. Keep Running 24/7 with PM2
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Optional: Nginx Reverse Proxy with HTTPS (Certbot)
```nginx
# /etc/nginx/sites-available/forex.yourdomain.com
server {
    server_name forex.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable SSL:
```bash
sudo certbot --nginx -d forex.yourdomain.com
```

---

## Option 3: Docker Container Deployment (Railway / Render / Fly.io / AWS)

Build and run with Docker:
```bash
# Build the Docker image
docker build -t forex-dashboard .

# Run the container
docker run -d -p 3001:3001 --name forex-terminal forex-dashboard
```

---

## Option 4: Cloud Platforms (Railway / Render)
1. Push this project to GitHub.
2. In **Railway** or **Render**, click **New Web Service** and link your repository.
3. Configure:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start -- -H 0.0.0.0 -p $PORT`
4. The dashboard will automatically deploy with a free HTTPS custom domain.
