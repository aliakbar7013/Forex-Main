const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

const cbdrTrades = db.prepare(`
  SELECT id, symbol, strategy, action, entry, sl, tp1, outcome, realized_pnl, trading_day, date_executed, notes 
  FROM backtest_trades 
  WHERE strategy = 'CBDR' 
  ORDER BY date_executed DESC 
  LIMIT 25
`).all();

console.log('Total CBDR trades found (latest 25):', cbdrTrades.length);
console.table(cbdrTrades);
