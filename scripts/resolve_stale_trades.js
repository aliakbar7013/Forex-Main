const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

console.log('--- RESOLVING STALE TRADES & UPDATING ACTIVE SIGNALS ---');

// 1. Resolve AUDCHF as SL_HIT (verified on TradingView chart Image 2: Closed PnL: -0.00049 on Wednesday Oct 21)
const audchf = db.prepare('SELECT * FROM signals WHERE symbol = ?').get('AUDCHF');
if (audchf) {
  console.log('Resolving AUDCHF as SL_HIT on Wednesday 2026-10-21...');
  db.prepare(`
    UPDATE signals SET 
      status = 'SL_HIT',
      outcome = 'LOSS',
      realized_pnl_usd = -1000,
      exit_price = 0.57936,
      updated_at = '2026-10-21T18:00:00.000Z'
    WHERE id = ?
  `).run(audchf.id);

  db.prepare(`
    INSERT OR REPLACE INTO backtest_trades (
      id, signal_id, symbol, strategy, action, timeframe,
      entry, sl, tp1, tp2, tp3, risk_percent, defensive_state,
      calculated_lot_size, risk_amount_usd, outcome, exit_price,
      realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
      session, date_executed, notes, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    'bt_sig_live_audchf',
    audchf.id,
    'AUDCHF',
    'CBDR',
    'BUY',
    '15m',
    0.57982, 0.57936, 0.5812, 0.58212, null, 1, 'NORMAL',
    21.74, 1000, 'LOSS', 0.57936,
    -1000, -1, 'Wednesday', 1,
    'London (05:30 NY / 05:30 PM IST)', '2026-10-21',
    '[Broker: OANDA (TradingView Feed: OANDA:AUDCHF)] [CBDR 15m Minor Cross] Entry: 0.57982 on 1st London 15m Imbalance (0.57956 – 0.57982). Stopped out at 0.57936 (-1.0R / -$1,000) during NY session pullback. Verified on user TradingView chart.',
    '2026-10-21T05:30:00.000Z'
  );
}

// 2. Resolve EURGBP as TP1_HIT (TradingView Low reached 0.83616, below TP1 0.83651)
const eurgbp = db.prepare('SELECT * FROM signals WHERE symbol = ?').get('EURGBP');
if (eurgbp) {
  console.log('Resolving EURGBP as TP1_HIT on Wednesday 2026-10-21...');
  db.prepare(`
    UPDATE signals SET 
      status = 'TP1_HIT',
      outcome = 'WIN',
      realized_pnl_usd = 3000,
      exit_price = 0.83651,
      updated_at = '2026-10-21T18:00:00.000Z'
    WHERE id = ?
  `).run(eurgbp.id);

  db.prepare(`
    INSERT OR REPLACE INTO backtest_trades (
      id, signal_id, symbol, strategy, action, timeframe,
      entry, sl, tp1, tp2, tp3, risk_percent, defensive_state,
      calculated_lot_size, risk_amount_usd, outcome, exit_price,
      realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
      session, date_executed, notes, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    'bt_sig_live_eurgbp',
    eurgbp.id,
    'EURGBP',
    'CBDR',
    'SELL',
    '15m',
    0.83846, 0.83911, 0.83651, null, null, 1, 'NORMAL',
    15.38, 1000, 'WIN', 0.83651,
    3000, 3, 'Wednesday', 1,
    'London (04:00 NY / 05:30 PM IST)', '2026-10-21',
    '[Broker: OANDA (TradingView Feed: OANDA:EURGBP)] [CBDR 15m Minor Cross] Entry: 0.83846. 1:3 Target hit at 0.83651 (+3.0R / +$3,000).',
    '2026-10-21T04:00:00.000Z'
  );
}

// 3. Resolve AUDUSD as SL_HIT (High 0.70495 swept)
const audusd = db.prepare('SELECT * FROM signals WHERE symbol = ?').get('AUDUSD');
if (audusd) {
  console.log('Resolving AUDUSD on Wednesday 2026-10-21...');
  db.prepare(`
    UPDATE signals SET 
      status = 'SL_HIT',
      outcome = 'LOSS',
      realized_pnl_usd = -1000,
      exit_price = 0.70495,
      updated_at = '2026-10-21T18:00:00.000Z'
    WHERE id = ?
  `).run(audusd.id);
}

console.log('Resolution complete! Current signals:');
const current = db.prepare('SELECT symbol, strategy, action, status, date_of_entry FROM signals').all();
console.table(current);
