@echo off
title ICT Forex Terminal - 100%% Free 24/7 Live Runner
color 0A

echo =====================================================================
echo           ICT CBDR FOREX SIGNALS TERMINAL (FREE 24/7 RUNNER)
echo =====================================================================
echo.
echo Starting Production Terminal on http://localhost:3000...
echo.

:: Ensure dependencies are present
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

:: Ensure production build is present
if not exist .next (
  echo Creating initial production build...
  call npm run build
)

:: Start Node.js production server with autonomous background live sync
start "ICT Forex Server" cmd /k "node server.js"

:: Wait 3 seconds for server to bind port 3000
timeout /t 3 /nobreak > nul

echo.
echo =====================================================================
echo Starting Free Cloudflare Public Tunnel (No port forwarding needed)...
echo =====================================================================
echo.
echo Your public live HTTPS link will appear below:
echo (Share this link to access from your phone or any device anywhere)
echo.

:: Launch Cloudflare Tunnel
call npx cloudflared tunnel --url http://localhost:3000

pause
