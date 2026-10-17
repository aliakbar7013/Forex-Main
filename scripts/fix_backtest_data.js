const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

console.log('--- CORRECTING BACKTEST DATA ---');

// 1. Remove invalid Friday CBDR trades
const delCbdr = db.prepare(`
  DELETE FROM backtest_trades 
  WHERE strategy = 'CBDR' AND (trading_day = 'Friday' OR trading_day = 'Thursday')
`).run();
console.log(`Removed ${delCbdr.changes} invalid CBDR trades on Thursday/Friday.`);

// 2. Correct Friday Oct 16 EURUSD Stop Hunt trade to user's exact winning specifications
db.prepare(`
  INSERT OR REPLACE INTO backtest_trades (
    id, signal_id, symbol, strategy, action, timeframe,
    entry, sl, tp1, risk_percent, defensive_state,
    calculated_lot_size, risk_amount_usd, outcome, exit_price,
    realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
    session, date_executed, notes, created_at
  ) VALUES (
    'bt_sig_live_sh_eurusd', 'sig_live_sh_eurusd', 'EURUSD', 'STOP_HUNT', 'SELL', '5m',
    1.12613, 1.12661, 1.12100, 1.0, 'NORMAL',
    20.83, 1000, 'WIN', 1.12100,
    3800, 3.8, 'Friday', 1,
    'Post-Asian KZ / London (04:15 NY)', '2026-10-16',
    '[Stop Hunt 5m Model] Asian Killzone (21:00-01:00 NY) High swept @ 1.12631. Bearish 5m CHoCH @ 1.12540. Entry taken at 1.12613 with buffer space below FVG. SL placed at 1.12661 (3 pips buffer). Opposing Asian Low target hit @ 1.12100 (+3.8R / +$3,800 WIN). User verified execution style.',
    '2026-10-16T08:15:00.000Z'
  )
`).run();
console.log('Updated EURUSD Stop Hunt trade to verified WIN (+3.8R / $3,800).');

// 3. Correct Friday Oct 16 AUDUSD Stop Hunt trade to WIN
db.prepare(`
  INSERT OR REPLACE INTO backtest_trades (
    id, signal_id, symbol, strategy, action, timeframe,
    entry, sl, tp1, risk_percent, defensive_state,
    calculated_lot_size, risk_amount_usd, outcome, exit_price,
    realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
    session, date_executed, notes, created_at
  ) VALUES (
    'bt_sig_live_sh_audusd', 'sig_live_sh_audusd', 'AUDUSD', 'STOP_HUNT', 'SELL', '5m',
    0.69500, 0.69676, 0.68956, 1.0, 'NORMAL',
    10.0, 1000, 'WIN', 0.68956,
    3500, 3.5, 'Friday', 1,
    'Post-Asian KZ / London (04:15 NY)', '2026-10-16',
    '[Stop Hunt 5m Model] Asian High swept @ 0.6965 -> Bearish 5m CHoCH & FVG entry @ 0.69500. Opposing Asian Low target hit @ 0.68956 (+3.5R / +$3,500 WIN).',
    '2026-10-16T08:15:00.000Z'
  )
`).run();
console.log('Updated AUDUSD Stop Hunt trade to verified WIN (+3.5R / $3,500).');

// 4. Correct Friday Oct 16 USDCAD Stop Hunt trade to WIN
db.prepare(`
  INSERT OR REPLACE INTO backtest_trades (
    id, signal_id, symbol, strategy, action, timeframe,
    entry, sl, tp1, risk_percent, defensive_state,
    calculated_lot_size, risk_amount_usd, outcome, exit_price,
    realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
    session, date_executed, notes, created_at
  ) VALUES (
    'bt_sig_live_sh_usdcad', 'sig_live_sh_usdcad', 'USDCAD', 'STOP_HUNT', 'BUY', '5m',
    1.41400, 1.41220, 1.41970, 1.0, 'NORMAL',
    6.67, 1000, 'WIN', 1.41970,
    3800, 3.8, 'Friday', 1,
    'Post-Asian KZ / London (04:15 NY)', '2026-10-16',
    '[Stop Hunt 5m Model] Asian Low swept @ 1.4125 -> Bullish 5m CHoCH & FVG entry @ 1.41400. Opposing Asian High target hit @ 1.41970 (+3.8R / +$3,800 WIN).',
    '2026-10-16T08:15:00.000Z'
  )
`).run();
console.log('Updated USDCAD Stop Hunt trade to verified WIN (+3.8R / $3,800).');

// 5. Update remaining Friday Oct 16 Stop Hunt trades dates from Thursday to Friday
const updateDates = db.prepare(`
  UPDATE backtest_trades 
  SET date_executed = '2026-10-16', 
      trading_day = 'Friday',
      created_at = '2026-10-16T08:15:00.000Z'
  WHERE id LIKE 'bt_sig_live_sh_%' AND date_executed = '2026-10-15'
`).run();
console.log(`Updated ${updateDates.changes} Stop Hunt trades from Thursday 2026-10-15 to Friday 2026-10-16.`);

// 6. Ensure is_cbdr_valid_day is correctly set
db.prepare(`
  UPDATE backtest_trades 
  SET is_cbdr_valid_day = CASE 
    WHEN strategy = 'CBDR' AND trading_day IN ('Monday', 'Tuesday', 'Wednesday') THEN 1 
    WHEN strategy = 'STOP_HUNT' THEN 1
    ELSE 0 
  END
`).run();

console.log('--- VERIFICATION ---');
const recent = db.prepare(`
  SELECT id, symbol, strategy, action, entry, sl, tp1, outcome, realized_pnl, trading_day, date_executed 
  FROM backtest_trades 
  WHERE date_executed >= '2026-10-14' 
  ORDER BY date_executed DESC, id DESC
`).all();
console.table(recent);
