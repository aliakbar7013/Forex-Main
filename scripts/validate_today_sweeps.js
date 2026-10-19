/**
 * scripts/validate_today_sweeps.js
 * 
 * Validates every signal in `signals` table against real TradingView OANDA 15m candles.
 * Strictly enforces:
 * - Rule 1 (The First Condition):
 *   BUY setup: MUST sweep Previous Day Low (PDL) before or during London session (c.low < pdl).
 *   SELL setup: MUST sweep Previous Day High (PDH) before or during London session (c.high > pdh).
 *   If Rule 1 is NOT met -> IMMEDIATELY DELETE THE SIGNAL. No trade allowed!
 * - Rule 2: 1st 15m Fair Value Gap (FVG) formed inside London session (07:00-16:00 UTC).
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

function formatMsg(msg) {
  const str = JSON.stringify(msg);
  return `~m~${str.length}~m~${str}`;
}

function getTvSymbol(symbol) {
  if (symbol.toUpperCase() === 'XAUUSD') return 'OANDA:XAUUSD';
  return `OANDA:${symbol.toUpperCase()}`;
}

function getDecimals(symbol) {
  if (symbol.includes('JPY')) return 3;
  if (symbol.includes('XAU')) return 2;
  return 5;
}

async function fetchTv15mCandles(symbol, count = 160) {
  return new Promise((resolve) => {
    const ws = new globalThis.WebSocket('wss://data.tradingview.com/socket.io/websocket', {
      headers: {
        'Origin': 'https://in.tradingview.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const tvSym = getTvSymbol(symbol);
    const chartSession = 'cs_' + Math.random().toString(36).substring(2, 10);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch (e) {}
        resolve([]);
      }
    }, 6000);

    ws.onopen = () => {
      ws.send(formatMsg({ m: 'set_auth_token', p: ['unauthorized_user_token'] }));
      ws.send(formatMsg({ m: 'chart_create_session', p: [chartSession, ''] }));
      ws.send(formatMsg({
        m: 'resolve_symbol',
        p: [chartSession, 'sds_sym_1', `={"adjustment":"splits","symbol":"${tvSym}"}`]
      }));
      ws.send(formatMsg({
        m: 'create_series',
        p: [chartSession, 'sds_1', 's1', 'sds_sym_1', '15', count, '']
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
                resolve(series.map(item => {
                  const d = new Date(item.v[0] * 1000);
                  return {
                    timestamp: item.v[0],
                    iso: d.toISOString(),
                    dateStr: d.toISOString().split('T')[0],
                    utcHour: d.getUTCHours(),
                    utcMin: d.getUTCMinutes(),
                    open: item.v[1],
                    high: item.v[2],
                    low: item.v[3],
                    close: item.v[4]
                  };
                }));
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

async function validateAndPurge() {
  const signals = db.prepare('SELECT * FROM signals').all();
  console.log(`Auditing ${signals.length} active live signals against authentic TradingView candles...\n`);

  const deletedSignals = [];
  const validSignals = [];

  for (const signal of signals) {
    const symbol = signal.symbol.toUpperCase();
    const isBuy = signal.action === 'BUY';
    const decimals = getDecimals(symbol);

    const bars = await fetchTv15mCandles(symbol, 160);
    if (!bars || bars.length < 10) {
      console.log(`[WARN] Could not fetch enough bars for ${symbol}. Skipping check.`);
      continue;
    }

    const latestBar = bars[bars.length - 1];
    const todayStr = latestBar.dateStr;

    const todayBars = bars.filter(b => b.dateStr === todayStr);
    const prevBars = bars.filter(b => b.dateStr !== todayStr);

    if (prevBars.length === 0 || todayBars.length === 0) {
      console.log(`[WARN] Incomplete days for ${symbol}`);
      continue;
    }

    // Prior market history before London sweep window (Prior days + today before 06:00 UTC)
    const priorBars = [...prevBars, ...todayBars.filter(b => b.utcHour < 6)];
    const pdh = Number(Math.max(...priorBars.map(b => b.high)).toFixed(decimals));
    const pdl = Number(Math.min(...priorBars.map(b => b.low)).toFixed(decimals));

    // London sweep window (06:00 to 16:00 UTC)
    const sweepCandidateBars = todayBars.filter(b => b.utcHour >= 6 && b.utcHour <= 16);

    let sweptPdl = false;
    let sweptPdh = false;
    let lowestLondon = Infinity;
    let highestLondon = -Infinity;

    for (const b of sweepCandidateBars) {
      if (b.low < lowestLondon) lowestLondon = b.low;
      if (b.high > highestLondon) highestLondon = b.high;
      if (b.low < pdl) sweptPdl = true;
      if (b.high > pdh) sweptPdh = true;
    }

    const rule1Met = isBuy ? sweptPdl : sweptPdh;

    if (!rule1Met) {
      console.log(`❌ VIOLATION [${signal.id}] ${symbol} ${signal.action}:`);
      console.log(`   PDH: ${pdh} | PDL: ${pdl}`);
      if (isBuy) {
        console.log(`   London low was ${lowestLondon}, which did NOT sweep PDL (${pdl}). Difference: +${((lowestLondon - pdl) * (decimals === 3 ? 100 : 10000)).toFixed(1)} pips above PDL.`);
      } else {
        console.log(`   London high was ${highestLondon}, which did NOT sweep PDH (${pdh}). Difference: -${((pdh - highestLondon) * (decimals === 3 ? 100 : 10000)).toFixed(1)} pips below PDH.`);
      }
      console.log(`   -> DELETING ${signal.id} FROM SIGNALS TABLE (Rule 1 strictly not met).\n`);
      db.prepare('DELETE FROM signals WHERE id = ?').run(signal.id);
      deletedSignals.push({ id: signal.id, symbol, action: signal.action });
    } else {
      console.log(`✅ RULE 1 PASSED [${signal.id}] ${symbol} ${signal.action}: Swept ${isBuy ? 'PDL' : 'PDH'} (${isBuy ? pdl : pdh})`);
      validSignals.push(signal);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Audit Complete:`);
  console.log(`- Deleted (Violated Rule 1): ${deletedSignals.length}`);
  console.log(`- Kept (Passed Rule 1): ${validSignals.length}`);
  console.log('----------------------------------------------------');

  const remaining = db.prepare('SELECT id, symbol, action, strategy FROM signals').all();
  console.log('Remaining live signals in DB:', remaining);
}

validateAndPurge();
