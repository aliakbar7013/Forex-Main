const http = require('http');

http.get('http://127.0.0.1:3000/api/signals', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('HTTP Status:', res.statusCode);
      console.log('Returned signals count:', json.signals ? json.signals.length : 0);
      if (json.signals && json.signals.length > 0) {
        console.log('Sample signal:', {
          id: json.signals[0].id,
          symbol: json.signals[0].symbol,
          strategy: json.signals[0].strategy,
          status: json.signals[0].status,
          action: json.signals[0].action,
          entry: json.signals[0].entry,
          currentPrice: json.signals[0].raw_payload?.currentPrice
        });
      } else {
        console.log('Response body:', data);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message, data);
    }
  });
}).on('error', err => {
  console.error('Request error:', err.message);
});
