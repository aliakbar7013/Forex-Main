const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(baseDir, '..', 'HOSTINGER_UPLOAD_FILES');
const zipFile = path.resolve(baseDir, '..', 'hostinger_upload.zip');

console.log('Source directory:', baseDir);
console.log('Target directory:', targetDir);

// 1. Reset target directory
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// 2. Copy root configuration files
const rootFiles = [
  'app.js',
  '.htaccess',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'server.js',
  'ecosystem.config.cjs',
  'Dockerfile',
  'docker-compose.yml',
  'HOSTINGER_DEPLOYMENT_GUIDE.md',
  'HOSTING_GUIDE.md'
];

for (const file of rootFiles) {
  const src = path.join(baseDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, file));
    console.log('✓ Copied:', file);
  }
}

// 3. Copy public and data directories
const publicSrc = path.join(baseDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(targetDir, 'public'), { recursive: true });
  console.log('✓ Copied: public directory');
}

const dataSrc = path.join(baseDir, 'data');
if (fs.existsSync(dataSrc)) {
  fs.cpSync(dataSrc, path.join(targetDir, 'data'), { recursive: true });
  console.log('✓ Copied: data directory (SQLite db)');
}

// 4. Copy .next production build (excluding compiler cache)
const nextSrc = path.join(baseDir, '.next');
const nextDest = path.join(targetDir, '.next');
fs.mkdirSync(nextDest, { recursive: true });

const nextItems = fs.readdirSync(nextSrc);
for (const item of nextItems) {
  if (item === 'cache') continue; // Skip heavy cache
  fs.cpSync(path.join(nextSrc, item), path.join(nextDest, item), { recursive: true });
}
console.log('✓ Copied: .next production build (server, static, manifests)');

// 5. Create README in targetDir
fs.writeFileSync(
  path.join(targetDir, 'README_HOSTINGER.txt'),
  `=============================================================
ICT FOREX TERMINAL - HOSTINGER DEPLOYMENT PACKAGE
=============================================================

This package contains all pre-compiled files needed to run
your ICT Forex Signals Terminal on Hostinger hPanel with zero errors.

HOW TO DEPLOY ON HOSTINGER HPANEL (AVOIDING 503 ERRORS):
-------------------------------------------------------------
1. Upload and extract all contents (or hostinger_upload.zip)
   directly into your Hostinger 'public_html' folder (via Hostinger File Manager).

2. In Hostinger hPanel -> Advanced -> Node.js:
   - Node version: 20.x
   - Application mode: Production
   - Application startup file: app.js (or server.js)
   - Application root: public_html

3. In the Node.js panel, click 'Run NPM Install' (or in Hostinger Terminal run):
   npm install --omit=dev

4. Click 'Start Application' (or 'Restart Application') in hPanel.

5. Open your domain! Log in with Master Admin credentials:
   - Email: admin@forex.com
   - Password: AdminPassword123!

WHY ERROR 503 HAPPENS ON HOSTINGER & HOW THIS PACKAGE FIXES IT:
-------------------------------------------------------------
- Fix 1: Added 'app.js' which Hostinger hPanel Phusion Passenger expects by default.
- Fix 2: Added Hostinger-compatible '.htaccess' rewrite and Passenger directives.
- Fix 3: Handled UNIX domain sockets in server.js so Passenger doesn't get 'NaN' port error.
- Fix 4: Pre-bundled SQLite and JSON database dumps in ./data and ./public/data.
=============================================================
`
);

// 6. Create hostinger_upload.zip using tar.exe
try {
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  execSync(`tar.exe -a -c -f "${zipFile}" -C "${targetDir}" .`);
  const stats = fs.statSync(zipFile);
  console.log(`\n🎉 SUCCESS: hostinger_upload.zip created! Size: ${Math.round(stats.size / 1024)} KB`);
  console.log(`Location: ${zipFile}`);
} catch (err) {
  console.error('Failed to create zip with tar.exe:', err.message);
}
