# 🚀 Hostinger Deployment Guide: ICT Forex Terminal (Live 24/7 After Build)

This guide provides step-by-step instructions for deploying your **ICT CBDR Institutional Forex Signals Terminal** to **Hostinger** so that it continues to **run live 24/7** with real-time TradingView market feeds, automatic 15m 1st imbalance entries, 1:3 RR target executions, stop loss enforcement, and live backtest archiving.

---

## 📦 What Was Built & Prepared For You

1. **Autonomous 24/7 Live Engine in `server.js`**:
   - Ticks every 10 seconds autonomously in the background.
   - Evaluates active trades against 1:3 RR Take Profits and Stop Losses (London Low/High for Majors; 1st Imbalance Low/High for Minors).
   - Automatically writes completed trades to SQLite `backtest_trades` with today's real entry date (`Wednesday, 2026-10-14`).
   - Runs whether a user has a browser tab open or not!
2. **Pre-Built Deployment Packages**:
   - **Upload Zip**: `C:\Users\aliak\.gemini\antigravity\scratch\hostinger_upload.zip` *(Contains pre-built production `.next`, `data/trading_dashboard.db`, `server.js`, `Dockerfile`, `docker-compose.yml`, etc.)*
   - **Extracted Folder**: `C:\Users\aliak\.gemini\antigravity\scratch\HOSTINGER_UPLOAD_FILES`
3. **Master Admin Credentials**:
   - **Email**: `admin@forex.com`
   - **Password**: `AdminPassword123!`
   - **User Manager**: Allows creating accounts with strategy permissions and duration limits (7d, 30d, 6m, 1y, lifetime).

---

## 🌟 Choose Your Hostinger Hosting Type:

| Hostinger Option | Best For | Live 24/7 Background Support | Setup Difficulty |
| :--- | :--- | :--- | :--- |
| **Hostinger VPS (Docker)** | Professional 24/7 automated trading & instant 1-command deployment | ⭐⭐⭐⭐⭐ 100% Native Continuous | Easiest (1 command) |
| **Hostinger VPS (PM2)** | Standard Ubuntu server setup with Node.js 20 & PM2 | ⭐⭐⭐⭐⭐ 100% Native Continuous | Moderate |
| **Hostinger Web / Cloud (hPanel)** | Shared / Cloud hosting with hPanel Node.js manager | ⭐⭐⭐⭐ Runs on web requests + browser active | Easy |

---

## 🛠️ Method 1: Hostinger VPS with Docker (Fastest & Recommended)

If you have a Hostinger KVM VPS (Ubuntu 22.04 or 24.04):

### Step 1: Connect to your Hostinger VPS via SSH
Open PowerShell or Terminal on your PC and run:
```bash
ssh root@YOUR_HOSTINGER_VPS_IP
```
*(Enter your VPS password set in the Hostinger dashboard)*

### Step 2: Install Docker (Takes 30 seconds)
```bash
curl -fsSL https://get.docker.com | sh
```

### Step 3: Upload or Clone the Files
Upload the project files or `hostinger_upload.zip` into `/var/www/forex-terminal`:
```bash
mkdir -p /var/www/forex-terminal
cd /var/www/forex-terminal
# If using GitHub: git clone <your-repo> .
# Or upload hostinger_upload.zip using SFTP / FileZilla to /var/www/forex-terminal and run:
unzip hostinger_upload.zip
```

### Step 4: Start the Terminal
Run one command:
```bash
docker compose up -d --build
```
Your application is now running live on port `3000`! The `./data` folder is mounted as a persistent volume so your SQLite database (`trading_dashboard.db`) and all 268+ backtest records are completely safe across updates.

### Step 5: Connect Your Domain & Free SSL (Nginx)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
Create `/etc/nginx/sites-available/forex`:
```nginx
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

## 🛠️ Method 2: Hostinger VPS with Node.js 20 & PM2

If you prefer running directly on Ubuntu with PM2 instead of Docker:

### Step 1: Connect via SSH
```bash
ssh root@YOUR_HOSTINGER_VPS_IP
```

### Step 2: Install Node.js 20, Build Tools & PM2
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git
sudo npm install -g pm2
```

### Step 3: Put Files in `/var/www/forex-terminal`
```bash
mkdir -p /var/www/forex-terminal
cd /var/www/forex-terminal
# Upload hostinger_upload.zip and extract:
unzip hostinger_upload.zip
```

### Step 4: Install Dependencies & Build
```bash
npm install
npm run build
```

### Step 5: Launch 24/7 with PM2
```bash
# Start with our configured ecosystem file:
pm2 start ecosystem.config.cjs

# Save PM2 process so it restarts automatically on VPS reboot:
pm2 save
pm2 startup
```

---

## 🛠️ Method 3: Hostinger Web / Cloud Hosting (hPanel Node.js)

If you have Hostinger Cloud Hosting or Web Hosting with the **hPanel Node.js Application Manager**:

### Step 1: Upload Files via File Manager
1. Log in to **Hostinger hPanel**.
2. Go to **Websites** ➔ **Manage** ➔ **File Manager**.
3. Navigate to your website folder (e.g., `public_html`).
4. Upload `hostinger_upload.zip` (located on your PC at `C:\Users\aliak\.gemini\antigravity\scratch\hostinger_upload.zip`).
5. Right-click `hostinger_upload.zip` and click **Extract**.

### Step 2: Configure the Node.js Application in hPanel
1. In hPanel, search for **Node.js** (under **Advanced**).
2. Click **Create Application**:
   - **Node.js version**: `20.x`
   - **Application mode**: `Production`
   - **Application root**: `public_html` (or your chosen subfolder)
   - **Application startup file**: `server.js` *(our custom server entrypoint)*
3. Click **Create**.

### Step 3: Install Production Dependencies
1. In the Node.js App settings in hPanel, open **NPM Commands** (or open the Hostinger **SSH Terminal**).
2. Run:
   ```bash
   npm install --omit=dev
   ```
3. Click **Restart Application** in hPanel.

---

## 🔐 Logging In to Your Live Terminal
1. Open your domain or VPS IP in your browser: `https://yourdomain.com` (or `http://YOUR_VPS_IP:3000`).
2. Enter Master Admin PIN: **`9398`**.
3. You can generate additional client PINs or revoke access anytime from the top navigation bar.

---

## ⚡ How the Terminal Operates Live After Build
- **TradingView Real-Time Quotes**: Every 10 seconds, the server queries the live OANDA feed on TradingView across all 29 currency pairs.
- **ICT Strategy Execution**:
  - **Major Pairs** (with USD): Evaluates 15m 1st Imbalance during London Session (07:00 - 16:00 UTC / 03:00 - 12:00 NY) with PDH/PDL sweep, Stop Loss at London Session Low/High, and Target at 1:3 RR.
  - **Minor Pairs** (without USD): Evaluates 15m 1st Imbalance during London Session (07:00 - 16:00 UTC / 03:00 - 12:00 NY) without requiring PDH/PDL sweep, Stop Loss directly above/below the imbalance, and Target at 1:3 RR.
- **Auto Backtest Archiving**: Every completed trade (TP or SL) is permanently saved into the SQLite database with the exact date executed (`Wednesday, 2026-10-14`), outcome, PnL, and full chart breakdown.
- **Instant Telegram Alerts**: If configured via the Telegram settings modal, buy/sell alerts and trade resolutions are dispatched instantly to your phone.
