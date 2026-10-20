const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const tunnelFile = path.join(__dirname, '..', 'ACTIVE_TUNNEL.txt');
let currentTunnelUrl = null;
let keepAliveTimer = null;

console.log('[TunnelKeeper] Initializing persistent tunnel supervisor...');

function pingTunnel() {
  if (!currentTunnelUrl) return;
  
  const req = https.get(currentTunnelUrl, { timeout: 10000 }, (res) => {
    console.log(`[TunnelKeeper] Keep-alive ping sent to ${currentTunnelUrl} -> HTTP ${res.statusCode}`);
    res.resume();
  });

  req.on('error', (err) => {
    console.log(`[TunnelKeeper] Keep-alive ping warning: ${err.message}`);
  });

  req.on('timeout', () => {
    req.destroy();
  });
}

function startTunnel() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  console.log('[TunnelKeeper] Launching ssh tunnel to nokey@localhost.run...');

  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-R', '80:127.0.0.1:3000',
    'nokey@localhost.run'
  ]);

  ssh.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[SSH OUT]', text.trim());
    detectUrl(text);
  });

  ssh.stderr.on('data', (data) => {
    const text = data.toString();
    console.log('[SSH ERR]', text.trim());
    detectUrl(text);
  });

  ssh.on('close', (code) => {
    console.log(`[TunnelKeeper] SSH disconnected with exit code ${code}. Reconnecting in 3 seconds...`);
    currentTunnelUrl = null;
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    setTimeout(startTunnel, 3000);
  });

  ssh.on('error', (err) => {
    console.error('[TunnelKeeper] SSH process error:', err.message);
  });
}

function detectUrl(text) {
  const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
  if (match) {
    const url = match[0];
    if (url !== currentTunnelUrl) {
      currentTunnelUrl = url;
      console.log(`\n========================================================`);
      console.log(`[TunnelKeeper] ACTIVE LIVE URL: ${url}`);
      console.log(`========================================================\n`);
      fs.writeFileSync(tunnelFile, url, 'utf8');
      
      // Start keep-alive pinging every 45 seconds to prevent activity timeout
      if (!keepAliveTimer) {
        keepAliveTimer = setInterval(pingTunnel, 45000);
      }
      setTimeout(pingTunnel, 2000);
    }
  }
}

startTunnel();
