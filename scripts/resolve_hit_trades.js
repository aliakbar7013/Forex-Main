const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('--- SCANNING ALL ACTIVE SIGNALS FOR SL / TP HITS ---');

function fetchQuotes() {
  return new Promise((resolve, reject) => {
    const symbols = [
      'OANDA:EURUSD', 'OANDA:USDJPY', 'OANDA:GBPUSD', 'OANDA:AUDUSD',
      'OANDA:EURJPY', 'OANDA:USDCAD', 'OANDA:GBPJPY', 'OANDA:EURCHF',
      'OANDA:CADJPY', 'OANDA:GBPAUD', 'OANDA:XAUUSD'
    ];
    const data = JSON.stringify({
      symbols: { tickers: symbols },
      columns: ['close', 'high', 'low', 'open']
    });

    const req = https.request('https://scanner.tradingview.com/forex/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const map = {};
          if (Array.isArray(parsed.data)) {
            for (const item of parsed.data) {
              const sym = item.s.replace('OANDA:', '').trim();
              map[sym] = {
                price: Number(item.d[0]),
                high: Number(item.d[1]),
                low: Number(item.d[2]),
                open: Number(item.d[3])
              };
            }
          }
          resolve(map);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fetchGoldQuote() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      symbols: { tickers: ['OANDA:XAUUSD', 'TVC:GOLD'] },
      columns: ['close', 'high', 'low', 'open']
    });
    const req = https.request('https://scanner.tradingview.com/cfd/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data && parsed.data[0]) {
            resolve({
              price: Number(parsed.data[0].d[0]),
              high: Number(parsed.data[0].d[1]),
              low: Number(parsed.data[0].d[2]),
              open: Number(parsed.data[0].d[3])
            });
            return;
          }
        } catch {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function main() {
  const quotesMap = await fetchQuotes();
  const gold = await fetchGoldQuote();
  if (gold) quotesMap['XAUUSD'] = gold;

  const activeSignals = db.prepare("SELECT * FROM signals WHERE status = 'IN_TRADE'").all();
  console.log(`Evaluating ${activeSignals.length} active in-trade signals...`);

  let resolvedCount = 0;
  let remainingCount = 0;

  for (const s of activeSignals) {
    const quote = quotesMap[s.symbol];
    if (!quote || quote.price === 0) {
      console.log(`[?] ${s.symbol}: No live quote available.`);
      remainingCount++;
      continue;
    }

    const currentPrice = quote.price;
    const dayHigh = quote.high || currentPrice;
    const dayLow = quote.low || currentPrice;
    const isBuy = s.action === 'BUY';

    // Check SL hit:
    // For BUY: price dropped below SL at current tick or anytime during the day
    // For SELL: price rose above SL at current tick or anytime during the day
    const isLoss = isBuy
      ? (currentPrice <= s.sl || (dayLow > 0 && dayLow <= s.sl))
      : (currentPrice >= s.sl || (dayHigh > 0 && dayHigh >= s.sl));

    // Check TP hit (only if not stopped out)
    const isWin = !isLoss && (isBuy
      ? (currentPrice >= s.tp1 || (dayHigh > 0 && dayHigh >= s.tp1))
      : (currentPrice <= s.tp1 || (dayLow > 0 && dayLow <= s.tp1)));

    if (isLoss) {
      resolvedCount++;
      console.log(`❌ [SL HIT] ${s.symbol} ${s.action} (${s.strategy}): SL ${s.sl} hit! Day Low: ${dayLow}, Day High: ${dayHigh}, Current: ${currentPrice}.`);
      
      const exitPrice = s.sl;
      const lossUsd = -s.risk_amount_usd;
      const dateStr = s.created_at ? s.created_at.split('T')[0] : '2026-10-16';
      
      // 1. Archive into backtest_trades
      db.prepare(`
        INSERT OR REPLACE INTO backtest_trades (
          id, signal_id, symbol, strategy, action, timeframe,
          entry, sl, tp1, tp2, tp3, risk_percent, defensive_state,
          calculated_lot_size, risk_amount_usd, outcome, realized_pnl,
          riskRewardAchieved, trading_day, isCbdrValidDay, session,
          date_executed, notes, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
      `).run(
        `bt_${s.id}_${Date.now()}`,
        s.id,
        s.symbol,
        s.strategy,
        s.action,
        s.timeframe,
        s.entry,
        s.sl,
        s.tp1,
        s.tp2,
        s.tp3,
        s.risk_percent,
        s.defensive_state,
        s.calculated_lot_size,
        s.risk_amount_usd,
        'LOSS',
        lossUsd,
        -1.0,
        s.strategy === 'CBDR' ? 'Wednesday' : 'Friday',
        1,
        s.session_name || 'London Session',
        dateStr,
        `[Stop Loss Hit] TradingView high/low breached SL @ ${exitPrice}. Trade closed and archived.`,
        s.created_at || new Date().toISOString()
      );

      // 2. Remove from active signals
      db.prepare('DELETE FROM signals WHERE id = ?').run(s.id);

    } else if (isWin) {
      resolvedCount++;
      console.log(`🎉 [TP1 HIT] ${s.symbol} ${s.action} (${s.strategy}): Target ${s.tp1} reached! Day High: ${dayHigh}, Day Low: ${dayLow}, Current: ${currentPrice}.`);
      
      const exitPrice = s.tp1;
      const profitUsd = Number((s.risk_amount_usd * (s.primary_risk_reward || 3.0)).toFixed(2));
      const dateStr = s.created_at ? s.created_at.split('T')[0] : '2026-10-16';

      // 1. Archive into backtest_trades
      db.prepare(`
        INSERT OR REPLACE INTO backtest_trades (
          id, signal_id, symbol, strategy, action, timeframe,
          entry, sl, tp1, tp2, tp3, risk_percent, defensive_state,
          calculated_lot_size, risk_amount_usd, outcome, realized_pnl,
          riskRewardAchieved, trading_day, isCbdrValidDay, session,
          date_executed, notes, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
      `).run(
        `bt_${s.id}_${Date.now()}`,
        s.id,
        s.symbol,
        s.strategy,
        s.action,
        s.timeframe,
        s.entry,
        s.sl,
        s.tp1,
        s.tp2,
        s.tp3,
        s.risk_percent,
        s.defensive_state,
        s.calculated_lot_size,
        s.risk_amount_usd,
        'WIN',
        profitUsd,
        s.primary_risk_reward || 3.0,
        s.strategy === 'CBDR' ? 'Wednesday' : 'Friday',
        1,
        s.session_name || 'London Session',
        dateStr,
        `[Target Hit] TradingView price reached 1:3 target / opposing liquidity @ ${exitPrice}. Trade closed and archived.`,
        s.created_at || new Date().toISOString()
      );

      // 2. Remove from active signals
      db.prepare('DELETE FROM signals WHERE id = ?').run(s.id);

    } else {
      console.log(`🟢 [STILL IN TRADE] ${s.symbol} ${s.action} (${s.strategy}): Entry ${s.entry} | SL ${s.sl} | TP1 ${s.tp1} | Current ${currentPrice}. Running smoothly.`);
      remainingCount++;
    }
  }

  console.log(`\nScan Complete: Resolved & Removed ${resolvedCount} trades. Genuinely active running: ${remainingCount}.`);
  const remaining = db.prepare('SELECT symbol, strategy, action, entry, sl, tp1, status FROM signals').all();
  console.table(remaining);
}

main().catch(console.error);
