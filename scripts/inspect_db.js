const Database = require('better-sqlite3');
const db = new Database('./data/trading_dashboard.db');

console.log('=== LIVE SIGNALS IN DATABASE ===');
const signals = db.prepare('SELECT id, symbol, strategy, action, status, entry, sl, tp1, notes, raw_payload_json, created_at FROM signals').all();
console.log('Total signals:', signals.length);
signals.forEach(s => {
  let pl = {};
  try { pl = JSON.parse(s.raw_payload_json || '{}'); } catch(e){}
  console.log(`Status: [${s.status}] | ID: ${s.id} | Symbol: ${s.symbol} | Strategy: ${s.strategy} | Action: ${s.action} | Entry: ${s.entry} | SL: ${s.sl} | TP1: ${s.tp1} | Current: ${pl.currentPrice || 'N/A'} | Floating Pips: ${pl.floatingPips || 0} | Floating PnL: $${pl.floatingPnlUsd || 0}`);
});

console.log('\n=== BACKTEST SUMMARY ===');
const btStats = db.prepare('SELECT strategy, outcome, count(*) as count, round(avg(risk_reward_achieved), 2) as avg_rr, round(sum(realized_pnl), 2) as total_pnl FROM backtest_trades GROUP BY strategy, outcome').all();
console.table(btStats);

console.log('\n=== BACKTEST TRADES BY TRADING DAY ===');
const dayStats = db.prepare('SELECT strategy, trading_day, count(*) as count FROM backtest_trades GROUP BY strategy, trading_day ORDER BY strategy, trading_day').all();
console.table(dayStats);

console.log('\n=== SAMPLE BACKTEST TRADES (STOP HUNT) ===');
const shTrades = db.prepare("SELECT id, symbol, strategy, action, entry, sl, tp1, exit_price, outcome, realized_pnl, risk_reward_achieved, trading_day, date_executed, notes FROM backtest_trades WHERE strategy = 'STOP_HUNT' LIMIT 5").all();
console.table(shTrades);

console.log('\n=== SAMPLE BACKTEST TRADES (CBDR) ===');
const cbdrTrades = db.prepare("SELECT id, symbol, strategy, action, entry, sl, tp1, exit_price, outcome, realized_pnl, risk_reward_achieved, trading_day, date_executed, notes FROM backtest_trades WHERE strategy = 'CBDR' LIMIT 5").all();
console.table(cbdrTrades);

console.log('\n=== ALL CBDR FRIDAY TRADES ===');
const cbdrFri = db.prepare("SELECT id, symbol, strategy, action, trading_day, date_executed, notes FROM backtest_trades WHERE strategy = 'CBDR' AND trading_day = 'Friday'").all();
console.table(cbdrFri);

console.log('\n=== CURRENT LIVE RUNNING TRADES (FULL DETAILS) ===');
const liveTrades = db.prepare("SELECT id, symbol, strategy, action, status, entry, sl, tp1, session_name, notes, raw_payload_json, created_at, updated_at FROM signals WHERE status = 'IN_TRADE' ORDER BY symbol ASC").all();
console.log(`Total Live Trades Currently Running: ${liveTrades.length}`);

const formattedLive = liveTrades.map(t => {
  let pl = {};
  try { pl = JSON.parse(t.raw_payload_json || '{}'); } catch(e){}
  return {
    Pair: t.symbol,
    Strategy: t.strategy,
    Action: t.action,
    Entry: t.entry,
    CurrentPrice: pl.currentPrice || 'N/A',
    FloatingPips: (pl.floatingPips !== undefined ? (pl.floatingPips > 0 ? `+${pl.floatingPips}` : pl.floatingPips) : 0) + ' pips',
    FloatingPnL: '$' + (pl.floatingPnlUsd !== undefined ? Number(pl.floatingPnlUsd).toFixed(2) : '0.00'),
    StopLoss: t.sl,
    TakeProfit: t.tp1,
    Status: t.status,
    LastUpdated: t.updated_at
  };
});
console.table(formattedLive);



