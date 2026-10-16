const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/trading_dashboard.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('--- RESEEDING CLEAN BACKTEST DATA ---');

// 1. Clear out backtest_trades completely
db.prepare('DELETE FROM backtest_trades').run();

// 2. We can load our compiled or fresh generator
// Let's import the generator or run the direct logic
const { seedInitialBacktestTrades, getBacktestStats } = require('../src/lib/db');

seedInitialBacktestTrades(db);

const stats = getBacktestStats();
console.log('Total trades in database now:', stats.totalTrades);
console.log('Win rate:', stats.winRate + '%');
console.log('Profit factor:', stats.profitFactor);
console.log('Avg RR:', stats.avgRiskReward + 'R');

console.log('\n--- DAY BREAKDOWN ---');
console.table(stats.dayBreakdown);

console.log('\n--- STRATEGY BREAKDOWN ---');
console.table(stats.strategyBreakdown);

console.log('\n--- VERIFY STRATEGY & DAY COMBINATIONS IN DB ---');
const combos = db.prepare('SELECT strategy, trading_day, is_cbdr_valid_day, count(*) as count, round(avg(risk_reward_achieved), 2) as avg_rr FROM backtest_trades GROUP BY strategy, trading_day ORDER BY strategy, trading_day').all();
console.table(combos);

console.log('\n--- SAMPLE 3 STOP HUNT TRADES ---');
const shSample = db.prepare("SELECT id, symbol, strategy, action, entry, sl, tp1, exit_price, outcome, risk_reward_achieved, trading_day, session, notes FROM backtest_trades WHERE strategy = 'STOP_HUNT' LIMIT 3").all();
console.log(JSON.stringify(shSample, null, 2));

console.log('\n--- SAMPLE 3 CBDR TRADES ---');
const cbdrSample = db.prepare("SELECT id, symbol, strategy, action, entry, sl, tp1, exit_price, outcome, risk_reward_achieved, trading_day, session, notes FROM backtest_trades WHERE strategy = 'CBDR' LIMIT 3").all();
console.log(JSON.stringify(cbdrSample, null, 2));

