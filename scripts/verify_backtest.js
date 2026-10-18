const Database = require('better-sqlite3');
const db = new Database('data/trading_dashboard.db');

// 1. Check distinct symbols
const symbols = db.prepare('SELECT DISTINCT symbol FROM backtest_trades ORDER BY symbol ASC').all().map(r => r.symbol);
console.log('Total distinct symbols in backtest:', symbols.length);
console.log('Symbols:', symbols.join(', '));

// 2. Check monthly distribution
const months = db.prepare("SELECT substr(date_executed, 1, 7) as ym, count(*) as count FROM backtest_trades GROUP BY ym ORDER BY ym ASC").all();
console.log('\nMonthly trade distribution:');
console.table(months);

// 3. Check for any pricing mismatch
const trades = db.prepare('SELECT id, symbol, strategy, action, outcome, entry, sl, tp1, exit_price, risk_reward_achieved, notes FROM backtest_trades').all();
let exitMismatches = 0;
let rrMismatches = 0;

for (const t of trades) {
  const expectedExit = t.outcome === 'WIN' ? t.tp1 : t.sl;
  if (Math.abs(t.exit_price - expectedExit) > 0.0001) {
    console.error('Mismatch exit_price in', t.id, t.symbol, 'exit:', t.exit_price, 'expected:', expectedExit);
    exitMismatches++;
  }
  const isBuy = t.action === 'BUY';
  const risk = isBuy ? (t.entry - t.sl) : (t.sl - t.entry);
  const reward = isBuy ? (t.tp1 - t.entry) : (t.entry - t.tp1);
  const ratio = reward / risk;
  // If it's a CBDR trade, check strict 1:3.0 RR
  if (t.strategy === 'CBDR') {
    if (Math.abs(ratio - 3.0) > 0.05) {
      console.error('CBDR RR not 3.0 in', t.id, t.symbol, 'ratio:', ratio, 'reward:', reward, 'risk:', risk);
      rrMismatches++;
    }
  }
}

console.log('\nTotal exit price mismatches:', exitMismatches);
console.log('Total RR ratio mismatches (CBDR):', rrMismatches);

// 4. Sample a minor pair trade notes
const minorSample = db.prepare("SELECT symbol, trading_day, date_executed, entry, sl, tp1, exit_price, outcome, notes FROM backtest_trades WHERE strategy = 'CBDR' AND symbol = 'GBPJPY' LIMIT 2").all();
console.log('\nSample Minor Pair (GBPJPY):');
console.log(JSON.stringify(minorSample, null, 2));

// 5. Sample a major pair trade notes
const majorSample = db.prepare("SELECT symbol, trading_day, date_executed, entry, sl, tp1, exit_price, outcome, notes FROM backtest_trades WHERE strategy = 'CBDR' AND symbol = 'USDCAD' LIMIT 2").all();
console.log('\nSample Major Pair (USDCAD):');
console.log(JSON.stringify(majorSample, null, 2));
