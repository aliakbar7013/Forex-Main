const { createServer } = require('http');
const http = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const rawPort = process.env.PORT || 3000;
const isNumericPort = !isNaN(Number(rawPort));
const port = isNumericPort ? Number(rawPort) : rawPort;

const app = next({ 
  dev, 
  hostname: isNumericPort ? hostname : undefined, 
  port: isNumericPort ? port : undefined 
});
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

  const onListen = (err) => {
    if (err) throw err;
    console.log(`> ICT Forex Terminal running on ${isNumericPort ? `http://${hostname}:${port}` : `socket ${port}`}`);

    // Autonomous Background Worker:
    // Periodically invokes the live sync engine every 10 seconds.
    // This guarantees live price updates, 15m 1st imbalance scans, TP/SL resolutions, 
    // and backtest trade logging continue 24/7 even when no browser tabs are open.
    let isTicking = false;
    const triggerLiveSync = () => {
      if (isTicking) return;
      isTicking = true;

      const requestOptions = isNumericPort
        ? {
            hostname: '127.0.0.1',
            port: port,
            path: '/api/signals/live-sync',
            method: 'GET',
            headers: { 'User-Agent': 'ICT-Forex-Autonomous-Engine/1.0' },
            timeout: 12000
          }
        : {
            socketPath: port,
            path: '/api/signals/live-sync',
            method: 'GET',
            headers: { 'User-Agent': 'ICT-Forex-Autonomous-Engine/1.0' },
            timeout: 12000
          };

      const syncReq = http.request(requestOptions, (res) => {
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
  };

  if (isNumericPort) {
    server.listen(port, hostname, onListen);
  } else {
    server.listen(port, onListen);
  }
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});

