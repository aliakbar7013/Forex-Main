const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'trading_dashboard.db');
const db = new Database(dbPath);

db.prepare('DELETE FROM signals').run();

const now = new Date().toISOString();

const validSignals = [
  {
    id: 'sig_cbdr_eurusd_sell',
    strategy: 'CBDR',
    symbol: 'EURUSD',
    timeframe: '15m',
    action: 'SELL',
    entry: 1.08500,
    sl: 1.08800,
    tp1: 1.07900,
    tp2: 1.07300,
    tp3: 1.06500,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 1.67,
    raw_quantity: 166666.67,
    risk_amount_usd: 500.00,
    sl_distance_price: 0.00300,
    sl_distance_pips_points: 30.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 1.07900, percentage: 50, riskReward: 2.0, hit: false },
      { label: 'TP2 (30% scale-out)', price: 1.07300, percentage: 30, riskReward: 4.0, hit: false },
      { label: 'TP3 / Runner', price: 1.06500, percentage: 20, riskReward: 6.67, hit: false }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'All strategy rules and mandatory IPDA rate differential criteria passed.',
      appliedStrategy: 'CBDR',
      checks: [
        {
          id: 'ipda_rate_differential',
          name: 'Mandatory IPDA Interest Rate Ratio Filter (Ratio = Rate_EUR (3.15%) / Rate_USD (4.50%) = 0.7)',
          passed: true,
          severity: 'ERROR',
          expected: 'SELL ONLY (Ratio < 1.0)',
          received: 'SELL (Calculated Ratio: 0.700)',
          message: 'Signal SELL aligns with Central Bank IPDA SELL_ONLY bias (ECB 3.15% / Fed 4.50% = 0.700 < 1.0)'
        },
        {
          id: 'cbdr_tf',
          name: 'Timeframe Requirement (15m)',
          passed: true,
          severity: 'ERROR',
          expected: '15m',
          received: '15m',
          message: 'Valid 15m timeframe confirmed for CBDR Model'
        },
        {
          id: 'cbdr_session',
          name: 'London Session Window (03:00 AM – 12:00 PM EST)',
          passed: true,
          severity: 'WARNING',
          expected: '03:00 AM - 12:00 PM EST',
          received: 'London Session Active',
          message: 'Signal received within active London Session trading window'
        },
        {
          id: 'cbdr_sweep_fvg',
          name: 'PDH/PDL Liquidity Sweep & 1st London FVG',
          passed: true,
          severity: 'WARNING',
          expected: 'PDH Sweep + 1st London FVG',
          received: 'PDH Swept, 1st FVG Entry',
          message: 'Liquidity sweep confirmed and entering strictly on 1st London FVG imbalance'
        }
      ]
    }),
    status: 'PENDING',
    session_name: 'London',
    notes: 'EURUSD CBDR London: Swept PDH, entering on 1st FVG with mandatory bearish yield differential (0.700 < 1.0).'
  },
  {
    id: 'sig_stophunt_gbpusd_buy',
    strategy: 'STOP_HUNT',
    symbol: 'GBPUSD',
    timeframe: '5m',
    action: 'BUY',
    entry: 1.29400,
    sl: 1.29150,
    tp1: 1.29900,
    tp2: 1.30400,
    tp3: 1.31000,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 2.00,
    raw_quantity: 200000.00,
    risk_amount_usd: 500.00,
    sl_distance_price: 0.00250,
    sl_distance_pips_points: 25.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 1.29900, percentage: 50, riskReward: 2.0, hit: true },
      { label: 'TP2 (30% scale-out)', price: 1.30400, percentage: 30, riskReward: 4.0, hit: false },
      { label: 'TP3 / Runner', price: 1.31000, percentage: 20, riskReward: 6.4, hit: false }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'All strategy rules and mandatory IPDA rate differential criteria passed.',
      appliedStrategy: 'STOP_HUNT',
      checks: [
        {
          id: 'ipda_rate_differential',
          name: 'Mandatory IPDA Interest Rate Ratio Filter (Ratio = Rate_GBP (4.75%) / Rate_USD (4.50%) = 1.056)',
          passed: true,
          severity: 'ERROR',
          expected: 'BUY ONLY (Ratio > 1.0)',
          received: 'BUY (Calculated Ratio: 1.056)',
          message: 'Signal BUY aligns with Central Bank IPDA BUY_ONLY bias (BoE 4.75% / Fed 4.50% = 1.056 > 1.0)'
        },
        {
          id: 'stophunt_tf',
          name: 'Timeframe Requirement (5m)',
          passed: true,
          severity: 'ERROR',
          expected: '5m',
          received: '5m',
          message: 'Valid 5m timeframe confirmed for Stop Hunt Model'
        }
      ]
    }),
    status: 'IN_TRADE',
    session_name: 'London',
    notes: 'GBPUSD Stop Hunt: Asian low swept, bullish CHOCH, aligns with mandatory IPDA Bullish ratio (1.056 > 1.0).'
  },
  {
    id: 'sig_stophunt_xauusd_sell',
    strategy: 'STOP_HUNT',
    symbol: 'XAUUSD',
    timeframe: '5m',
    action: 'SELL',
    entry: 2650.00,
    sl: 2660.00,
    tp1: 2630.00,
    tp2: 2610.00,
    tp3: 2590.00,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 0.50,
    raw_quantity: 50.0,
    risk_amount_usd: 500.00,
    sl_distance_price: 10.00,
    sl_distance_pips_points: 100.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 2630.00, percentage: 50, riskReward: 2.0, hit: true },
      { label: 'TP2 (30% scale-out)', price: 2610.00, percentage: 30, riskReward: 4.0, hit: false },
      { label: 'TP3 / Runner', price: 2590.00, percentage: 20, riskReward: 6.0, hit: false }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'All strategy rules and mandatory IPDA rate differential criteria passed.',
      appliedStrategy: 'STOP_HUNT',
      checks: [
        {
          id: 'ipda_rate_differential',
          name: 'Mandatory IPDA Interest Rate Ratio Filter (Ratio = Rate_CHF (0.50%) / Rate_USD (4.50%) = 0.111)',
          passed: true,
          severity: 'ERROR',
          expected: 'SELL ONLY (Ratio < 1.0)',
          received: 'SELL (Calculated Ratio: 0.111)',
          message: 'Signal SELL aligns with Central Bank IPDA SELL_ONLY bias (SNB 0.50% / Fed 4.50% = 0.111 < 1.0)'
        }
      ]
    }),
    status: 'TP1_HIT',
    session_name: 'London',
    notes: 'Gold Stop Hunt: Asian high swept, bearish CHOCH, aligns with mandatory IPDA CHF/USD < 1.0 yield ratio.'
  },
  {
    id: 'sig_cbdr_usdjpy_buy',
    strategy: 'CBDR',
    symbol: 'USDJPY',
    timeframe: '15m',
    action: 'BUY',
    entry: 154.50,
    sl: 154.10,
    tp1: 155.30,
    tp2: 156.00,
    tp3: 157.00,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 1.25,
    raw_quantity: 125000.0,
    risk_amount_usd: 500.00,
    sl_distance_price: 0.40,
    sl_distance_pips_points: 40.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 155.30, percentage: 50, riskReward: 2.0, hit: false },
      { label: 'TP2 (30% scale-out)', price: 156.00, percentage: 30, riskReward: 3.75, hit: false },
      { label: 'TP3 / Runner', price: 157.00, percentage: 20, riskReward: 6.25, hit: false }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'All strategy rules and mandatory IPDA rate differential criteria passed.',
      appliedStrategy: 'CBDR',
      checks: [
        {
          id: 'ipda_rate_differential',
          name: 'Mandatory IPDA Interest Rate Ratio Filter (Ratio = Rate_USD (4.50%) / Rate_JPY (0.25%) = 18)',
          passed: true,
          severity: 'ERROR',
          expected: 'BUY ONLY (Ratio > 1.0)',
          received: 'BUY (Calculated Ratio: 18.000)',
          message: 'Signal BUY aligns with Central Bank IPDA BUY_ONLY bias (Fed 4.50% / BoJ 0.25% = 18.00 > 1.0)'
        }
      ]
    }),
    status: 'PENDING',
    session_name: 'London',
    notes: 'USDJPY CBDR London: Aligns with strong positive Fed/BoJ interest rate differential.'
  },
  {
    id: 'sig_ny_nas100_buy',
    strategy: 'NEW_YORK',
    symbol: 'NAS100',
    timeframe: '1m',
    action: 'BUY',
    entry: 20450.00,
    sl: 20400.00,
    tp1: 20550.00,
    tp2: 20680.00,
    tp3: 20800.00,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 0.10,
    raw_quantity: 100000.0,
    risk_amount_usd: 500.00,
    sl_distance_price: 50.00,
    sl_distance_pips_points: 50.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 20550.00, percentage: 50, riskReward: 2.0, hit: false },
      { label: 'TP2 (30% scale-out)', price: 20680.00, percentage: 30, riskReward: 4.6, hit: false },
      { label: 'TP3 / Runner', price: 20800.00, percentage: 20, riskReward: 7.0, hit: false }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'New York Open strategy criteria passed. Central Bank IPDA is exempt for Indices.',
      appliedStrategy: 'NEW_YORK',
      checks: [
        {
          id: 'ipda_exempt',
          name: 'IPDA Interest Rate Filter Status',
          passed: true,
          severity: 'INFO',
          expected: 'Exempt (New York Index Strategy)',
          received: 'NEW_YORK / NAS100',
          message: 'New York Strategy (US Indices) is exempt from Central Bank IPDA interest rate direction filter.'
        },
        {
          id: 'ny_instruments',
          name: 'Valid Instruments (SPX500, NAS100, US30)',
          passed: true,
          severity: 'ERROR',
          expected: 'SPX500, NAS100, US30 (BlackBull Data)',
          received: 'NAS100',
          message: 'Valid US Index instrument verified (NAS100)'
        }
      ]
    }),
    status: 'PENDING',
    session_name: 'NY Open',
    notes: 'NY Open Strategy: 09:29 AM range marked, 1m CHOCH + FVG entry (IPDA Exempt).'
  },
  {
    id: 'sig_ny_us30_sell',
    strategy: 'NEW_YORK',
    symbol: 'US30',
    timeframe: '1m',
    action: 'SELL',
    entry: 42300.00,
    sl: 42400.00,
    tp1: 42100.00,
    tp2: 41900.00,
    tp3: 41600.00,
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 0.05,
    raw_quantity: 50000.0,
    risk_amount_usd: 500.00,
    sl_distance_price: 100.00,
    sl_distance_pips_points: 100.0,
    primary_risk_reward: 2.0,
    targets_json: JSON.stringify([
      { label: 'TP1 (50% scale-out)', price: 42100.00, percentage: 50, riskReward: 2.0, hit: true },
      { label: 'TP2 (30% scale-out)', price: 41900.00, percentage: 30, riskReward: 4.0, hit: true },
      { label: 'TP3 / Runner', price: 41600.00, percentage: 20, riskReward: 7.0, hit: true }
    ]),
    validation_json: JSON.stringify({
      isValid: true,
      overallStatus: 'PASSED',
      summary: 'New York Open strategy criteria passed. Central Bank IPDA is exempt for Indices.',
      appliedStrategy: 'NEW_YORK',
      checks: [
        {
          id: 'ipda_exempt',
          name: 'IPDA Interest Rate Filter Status',
          passed: true,
          severity: 'INFO',
          expected: 'Exempt (New York Index Strategy)',
          received: 'NEW_YORK / US30',
          message: 'New York Strategy (US Indices) is exempt from Central Bank IPDA interest rate direction filter.'
        }
      ]
    }),
    status: 'CLOSED_PROFIT',
    session_name: 'NY Open',
    notes: 'NY Open Strategy: 09:29 AM range swept, 1m CHOCH + FVG entry (IPDA Exempt).'
  }
];

const insertSignalStmt = db.prepare(`
  INSERT INTO signals (
    id, strategy, symbol, timeframe, action, entry, sl, tp1, tp2, tp3,
    risk_percent, defensive_state, calculated_lot_size, raw_quantity, risk_amount_usd,
    sl_distance_price, sl_distance_pips_points, primary_risk_reward, targets_json,
    validation_json, status, session_name, notes, raw_payload_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const s of validSignals) {
  insertSignalStmt.run(
    s.id, s.strategy, s.symbol, s.timeframe, s.action, s.entry, s.sl, s.tp1, s.tp2 || null, s.tp3 || null,
    s.risk_percent, s.defensive_state, s.calculated_lot_size, s.raw_quantity, s.risk_amount_usd,
    s.sl_distance_price, s.sl_distance_pips_points, s.primary_risk_reward, s.targets_json,
    s.validation_json, s.status, s.session_name, s.notes, '{}', now, now
  );
}

console.log('Successfully seeded ' + validSignals.length + ' strictly IPDA compliant signals!');
