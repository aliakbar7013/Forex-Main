const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

const info = db.prepare("DELETE FROM signals WHERE id LIKE 'sig_live_%'").run();
console.log('Purged old signals count:', info.changes);
