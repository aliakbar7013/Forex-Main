/**
 * Fetch historical candles directly from TradingView's official WebSocket for all 29 pairs.
 */
const fs = require('fs');
const path = require('path');

const MAJOR_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'XAUUSD'];
const MINOR_SYMBOLS = [
  'GBPJPY', 'EURJPY', 'GBPNZD', 'EURGBP', 'EURCAD', 'GBPAUD', 'GBPCHF', 'EURCHF',
  'AUDJPY', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'GBPCAD', 'AUDCAD', 'AUDCHF',
  'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF', 'NZDJPY'
];
const ALL_SYMBOLS = [...MAJOR_SYMBOLS, ...MINOR_SYMBOLS];

function formatMsg(msg) {
  const str = JSON.stringify(msg);
  return `~m~${str.length}~m~${str}`;
}

function getTvSymbol(symbol) {
  if (symbol === 'XAUUSD') return 'OANDA:XAUUSD';
  return `OANDA:${symbol}`;
}

async function fetchTvCandlesForSymbol(symbol, resolution = '15', count = 3000) {
  return new Promise((resolve) => {
    const ws = new globalThis.WebSocket('wss://data.tradingview.com/socket.io/websocket', {
      headers: {
        'Origin': 'https://in.tradingview.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const tvSym = getTvSymbol(symbol);
    const chartSession = 'cs_' + Math.random().toString(36).substring(2, 12);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch (e) {}
        resolve([]);
      }
    }, 12000);

    ws.onopen = () => {
      ws.send(formatMsg({ m: 'set_auth_token', p: ['unauthorized_user_token'] }));
      ws.send(formatMsg({ m: 'chart_create_session', p: [chartSession, ''] }));
      ws.send(formatMsg({
        m: 'resolve_symbol',
        p: [chartSession, 'sds_sym_1', `={"adjustment":"splits","symbol":"${tvSym}"}`]
      }));
      ws.send(formatMsg({
        m: 'create_series',
        p: [chartSession, 'sds_1', 's1', 'sds_sym_1', resolution, count, '']
      }));
    };

    ws.onmessage = (event) => {
      const data = String(event.data);
      const parts = data.split(/~m~\d+~m~/).filter(Boolean);
      for (const part of parts) {
        if (part.startsWith('~h~')) {
          try { ws.send(`~m~${part.length}~m~${part}`); } catch (e) {}
          continue;
        }
        try {
          const parsed = JSON.parse(part);
          if (parsed.m === 'timescale_update') {
            const series = parsed.p[1]?.sds_1?.s;
            if (series && Array.isArray(series) && series.length > 0) {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                try { ws.close(); } catch (e) {}
                resolve(series.map(item => ({
                  time: item.v[0],
                  iso: new Date(item.v[0] * 1000).toISOString(),
                  open: item.v[1],
                  high: item.v[2],
                  low: item.v[3],
                  close: item.v[4],
                  volume: item.v[5]
                })));
              }
            }
          }
        } catch (e) {}
      }
    };

    ws.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try { ws.close(); } catch (e) {}
        resolve([]);
      }
    };
  });
}

async function run() {
  console.log('Testing TV WebSocket fetch for 3 pairs...');
  for (const s of ['EURUSD', 'USDCAD', 'EURNZD']) {
    const start = Date.now();
    const bars15m = await fetchTvCandlesForSymbol(s, '15', 500);
    console.log(`Fetched ${s}: ${bars15m.length} bars in ${Date.now() - start}ms`);
    if (bars15m.length > 0) {
      console.log(`  Latest ${s} price: ${bars15m[bars15m.length - 1].close} @ ${bars15m[bars15m.length - 1].iso}`);
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { fetchTvCandlesForSymbol, ALL_SYMBOLS, MAJOR_SYMBOLS, MINOR_SYMBOLS };
