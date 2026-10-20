const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const tunnelFile = path.join(__dirname, '..', 'ACTIVE_TUNNEL.txt');

console.log('[TunnelManager] Starting persistent tunnel supervisor...');

function startTunnel() {
  console.log('[TunnelManager] Launching ssh tunnel to localhost.run...');
  
  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-R', '80:127.0.0.1:3000',
    'nokey@localhost.run'
  ]);

  ssh.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[TunnelManager STDOUT]', text.trim());
    handleOutput(text);
  });

  ssh.stderr.on('data', (data) => {
    const text = data.toString();
    console.log('[TunnelManager STDERR]', text.trim());
    handleOutput(text);
  });

  ssh.on('close', (code) => {
    console.log(`[TunnelManager] Tunnel disconnected (exit code ${code}). Reconnecting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });

  ssh.on('error', (err) => {
    console.error('[TunnelManager] Spawn error:', err.message);
  });
}

function handleOutput(text) {
  const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
  if (match) {
    const activeUrl = match[0];
    console.log(`\n==================================================`);
    console.log(`[TunnelManager] ACTIVE PUBLIC URL: ${activeUrl}`);
    console.log(`==================================================\n`);
    fs.writeFileSync(tunnelFile, activeUrl, 'utf8');
  }
}

startTunnel();
