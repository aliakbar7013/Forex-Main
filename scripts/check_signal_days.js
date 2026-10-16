const Database = require('better-sqlite3');
const db = new Database('./data/trading_dashboard.db');

const rows = db.prepare('SELECT id, symbol, strategy, created_at FROM signals').all();
console.log('Count:', rows.length);
rows.slice(0, 5).forEach(r => {
  const d = new Date(r.created_at);
  console.log(r.symbol, r.created_at, d.toLocaleDateString('en-US', { weekday: 'long' }));
});
