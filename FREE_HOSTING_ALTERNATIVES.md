# 🌐 100% Free Hosting Alternatives for ICT Forex Terminal

If you don't want to use Hostinger or pay for any hosting subscriptions, here are the **4 best 100% FREE alternatives** that support this full-stack Next.js app, SQLite database, and 24/7 live market scanner.

---

## ⚡ Option 1: Self-Host from your PC/Laptop via Free Cloudflare Tunnel (Easiest & 100% Free Forever)

**Why this is the best for forex traders:**
- **Cost**: \$0.00 forever (no credit card, no subscriptions).
- **Zero restrictions**: No memory limits, no CPU throttling, and your SQLite database (`data/trading_dashboard.db`) never gets wiped or put to sleep.
- **Works on any device**: Cloudflare provides a secure, public HTTPS link (e.g. `https://xxxx.trycloudflare.com` or your own custom domain) so you can open your dashboard on your iPhone, Android, or work computer.
- **24/7 Live Execution**: The live TradingView scanner and autonomous trade evaluator continue ticking uninterrupted.

### How to use it:
We have created a **1-click batch launcher** inside your project folder:
1. Open the folder: `C:\Users\aliak\.gemini\antigravity\scratch\forex-signals-dashboard`
2. Double-click **`start-free-live.bat`**.
3. It will automatically start your production server on port 3000 and print your live public HTTPS link in green text.
4. Open the link on your phone or any browser, enter Master PIN **`9398`**, and you're live!

*(Note: Your current live public link is already active right now at: `https://limited-select-bass-dale.trycloudflare.com`)*

---

## ☁️ Option 2: Render.com (100% Free Cloud Web Service)

Render offers a free tier for web applications with automated GitHub deployments and free SSL certificates.

### Step-by-Step Setup:
1. Create a free account at [render.com](https://render.com).
2. Push your project code to a free GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "ICT Forex Terminal"
   git remote add origin https://github.com/YOUR_USERNAME/forex-terminal.git
   git push -u origin main
   ```
3. In Render dashboard, click **New +** ➔ **Web Service**.
4. Connect your GitHub repository.
5. Set the settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Click **Create Web Service**. Render will build and deploy your app at `https://your-app.onrender.com`.

> [!TIP]
> **Keep Render Awake 24/7 for Free:** Free Render apps spin down after 15 minutes of inactivity. To keep your app running 24/7 without spending money, go to [cron-job.org](https://cron-job.org) (100% free) or [uptimerobot.com](https://uptimerobot.com) and create a free monitor that pings `https://your-app.onrender.com/api/signals` every 10 minutes.

---

## 🚀 Option 3: Fly.io (Free Tier with Free Persistent SQLite Disk)

Fly.io is specifically designed for running Dockerized apps with persistent SQLite databases.

### Step-by-Step Setup:
1. Create a free account at [fly.io](https://fly.io).
2. Install the Fly CLI in PowerShell:
   ```powershell
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```
3. In your terminal inside the project folder:
   ```bash
   fly auth login
   fly launch --no-deploy
   ```
4. Create a free 1GB persistent volume for your SQLite database:
   ```bash
   fly volumes create forex_data --size 1
   ```
5. Deploy:
   ```bash
   fly deploy
   ```
6. Fly.io gives you an instant HTTPS URL (`https://ict-forex-terminal.fly.dev`) with persistent data!

---

## 🏛️ Option 4: Oracle Cloud "Always Free" VPS (Full Linux Server Forever Free)

Oracle Cloud offers the most generous free cloud tier in the tech industry:
- **Specs**: Up to 4 ARM Ampere vCPUs, 24 GB RAM, 200 GB SSD, and dedicated public IPv4 address — **100% Free Forever**.
- **No Sleep**: Never suspends, never throttles, runs 24/7 continuously.

### Step-by-Step Setup:
1. Sign up for **Oracle Cloud Free Tier** at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
2. Create an **Ubuntu 22.04 or 24.04 Always Free VM Instance**.
3. SSH into your Oracle VPS:
   ```bash
   ssh ubuntu@YOUR_ORACLE_IP
   ```
4. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
5. Clone your code and run:
   ```bash
   docker compose up -d --build
   ```
6. Your terminal runs 24/7/365 permanently without paying anything.

---

## 🔑 Master Admin PIN
Across all platforms, unlock the terminal using:
- **PIN**: `9398`
