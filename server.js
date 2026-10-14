const { createServer } = require('http');
const http = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Server error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> ICT Forex Terminal running on http://${hostname}:${port}`);

    // Autonomous Background Worker:
    // Periodically invokes the live sync engine every 10 seconds.
    // This guarantees live price updates, 15m 1st imbalance scans, TP/SL resolutions, 
    // and backtest trade logging continue 24/7 even when no browser tabs are open.
    let isTicking = false;
    const triggerLiveSync = () => {
      if (isTicking) return;
      isTicking = true;

      const syncReq = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/api/signals/live-sync',
        method: 'GET',
        headers: { 'User-Agent': 'ICT-Forex-Autonomous-Engine/1.0' },
        timeout: 12000
      }, (res) => {
        res.resume();
        res.on('end', () => { isTicking = false; });
      });

      syncReq.on('error', () => {
        isTicking = false;
      });

      syncReq.on('timeout', () => {
        syncReq.destroy();
        isTicking = false;
      });

      syncReq.end();
    };

    // First autonomous tick 3s after startup
    setTimeout(triggerLiveSync, 3000);
    // Recurring tick every 10 seconds
    const backgroundInterval = setInterval(triggerLiveSync, 10000);

    const shutdown = () => {
      console.log('> Shutting down ICT Forex Terminal...');
      clearInterval(backgroundInterval);
      server.close(() => {
        console.log('> HTTP server closed gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});

