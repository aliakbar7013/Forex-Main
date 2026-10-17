const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

console.log('--- RESEEDING BACKTEST DATABASE WITH PRISTINE 28-WEEK DATASET ---');

// 1. Clear out backtest_trades completely
db.prepare('DELETE FROM backtest_trades').run();
console.log('Cleared backtest_trades table.');

// 2. Generate and insert pristine dataset
const { generateSixMonthsBacktestDataset } = require('./test_dataset_generator.js');
const dataset = generateSixMonthsBacktestDataset();

const insertStmt = db.prepare(`
  INSERT INTO backtest_trades (
    id, signal_id, symbol, strategy, action, timeframe, entry, sl, tp1, tp2, tp3,
    risk_percent, defensive_state, calculated_lot_size, risk_amount_usd,
    outcome, exit_price, realized_pnl, risk_reward_achieved, trading_day, is_cbdr_valid_day,
    session, date_executed, notes, created_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?
  )
`);

const insertMany = db.transaction((trades) => {
  for (const t of trades) {
    insertStmt.run(
      t.id,
      t.signal_id || null,
      t.symbol,
      t.strategy,
      t.action,
      t.timeframe,
      t.entry,
      t.sl,
      t.tp1,
      t.tp2 || null,
      t.tp3 || null,
      t.risk_percent,
      t.defensive_state,
      t.calculated_lot_size,
      t.risk_amount_usd,
      t.outcome,
      t.exit_price || (t.outcome === 'WIN' ? t.tp1 : t.sl),
      t.realized_pnl,
      t.riskRewardAchieved,
      t.trading_day,
      t.isCbdrValidDay ? 1 : 0,
      t.session,
      t.date_executed,
      t.notes || null,
      t.created_at
    );
  }
});

insertMany(dataset);
console.log(`Inserted ${dataset.length} trades into backtest_trades.`);

// 3. Validation Queries
console.log('\n--- STRATEGY COUNTS ---');
const stratCounts = db.prepare('SELECT strategy, count(*) as count, sum(case when outcome=\'WIN\' then 1 else 0 end) as wins, sum(case when outcome=\'LOSS\' then 1 else 0 end) as losses, round(avg(risk_reward_achieved), 2) as avg_rr, round(sum(realized_pnl), 2) as total_pnl FROM backtest_trades GROUP BY strategy').all();
console.table(stratCounts);

console.log('\n--- DAY BREAKDOWN (CBDR vs STOP HUNT) ---');
const dayBreakdown = db.prepare('SELECT strategy, trading_day, count(*) as count, sum(case when outcome=\'WIN\' then 1 else 0 end) as wins, sum(case when outcome=\'LOSS\' then 1 else 0 end) as losses FROM backtest_trades GROUP BY strategy, trading_day ORDER BY strategy, case trading_day when \'Monday\' then 1 when \'Tuesday\' then 2 when \'Wednesday\' then 3 when \'Thursday\' then 4 when \'Friday\' then 5 end').all();
console.table(dayBreakdown);

console.log('\n--- MONTHLY BREAKDOWN ---');
const monthly = db.prepare('SELECT substr(date_executed, 1, 7) as month, count(*) as total, sum(case when strategy=\'CBDR\' then 1 else 0 end) as cbdr, sum(case when strategy=\'STOP_HUNT\' then 1 else 0 end) as stop_hunt FROM backtest_trades GROUP BY month ORDER BY month').all();
console.table(monthly);

console.log('\n--- OCTOBER 2026 TRADES ---');
const oct = db.prepare('SELECT id, date_executed, trading_day, strategy, symbol, action, entry, sl, tp1, outcome, risk_reward_achieved, notes FROM backtest_trades WHERE date_executed >= \'2026-10-01\' ORDER BY date_executed ASC').all();
console.log(oct.map(t => `${t.date_executed} (${t.trading_day}) | ${t.strategy} ${t.symbol} ${t.action} | Entry: ${t.entry} SL: ${t.sl} TP: ${t.tp1} | ${t.outcome} (${t.risk_reward_achieved}R)\n  Notes: ${t.notes}`).join('\n\n'));
