const ws = new globalThis.WebSocket('wss://data.tradingview.com/socket.io/websocket', {
  headers: {
    'Origin': 'https://in.tradingview.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
});

function formatMsg(msg) {
  const str = JSON.stringify(msg);
  return `~m~${str.length}~m~${str}`;
}

ws.onopen = () => {
  console.log('Connected to TradingView WebSocket!');
  const chartSession = 'cs_' + Math.random().toString(36).substring(2, 12);

  ws.send(formatMsg({ m: 'set_auth_token', p: ['unauthorized_user_token'] }));
  ws.send(formatMsg({ m: 'chart_create_session', p: [chartSession, ''] }));
  ws.send(formatMsg({
    m: 'resolve_symbol',
    p: [chartSession, 'sds_sym_1', '={\"adjustment\":\"splits\",\"symbol\":\"OANDA:EURNZD\"}']
  }));
  ws.send(formatMsg({
    m: 'create_series',
    p: [chartSession, 'sds_1', 's1', 'sds_sym_1', '60', 3000, '']
  }));
};

ws.onmessage = (event) => {
  const data = String(event.data);
  const parts = data.split(/~m~\d+~m~/).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('~h~')) {
      ws.send(`~m~${part.length}~m~${part}`);
      continue;
    }
    try {
      const parsed = JSON.parse(part);
      if (parsed.m === 'timescale_update') {
        const series = parsed.p[1]?.sds_1?.s;
        if (series && Array.isArray(series)) {
          console.log('SUCCESS! Total OANDA bars received directly from TradingView:', series.length);
          const earliest = new Date(series[0].v[0] * 1000).toISOString();
          const latest = new Date(series[series.length - 1].v[0] * 1000).toISOString();
          console.log('Earliest date:', earliest, 'Latest date:', latest);
          ws.close();
          process.exit(0);
        }
      }
    } catch (e) {}
  }
};

ws.onerror = (err) => {
  console.log('WS error:', err);
};

setTimeout(() => {
  console.log('Timeout waiting for TradingView WS');
  ws.close();
  process.exit(0);
}, 6000);
