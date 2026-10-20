const http = require('http');

http.get('http://localhost:3000/api/signals', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Signal count:', data.signals?.length);
      if (data.signals?.length) {
        const s = data.signals[0];
        console.log('Sample signal:', {
          symbol: s.symbol,
          action: s.action,
          entry: s.entry,
          sl: s.sl,
          tp1: s.tp1,
          status: s.status,
          raw_payload: s.raw_payload
        });
      }
    } catch (e) {
      console.error(e);
    }
  });
});
