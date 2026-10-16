// Standalone simulation script for the revised Backtest Dataset Generator

const pairSpecs = {
  // Majors (1 Pip = 0.00010) — Follow PDH/PDL Sweep for CBDR; Asian High/Low for Stop Hunt
  'EURUSD': { basePrice: 1.11720, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 22, lotMultiplier: 1.0, action: 'SELL', isMajor: true, asianPips: 32 },
  'GBPUSD': { basePrice: 1.32160, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 25, lotMultiplier: 1.0, action: 'BUY', isMajor: true, asianPips: 36 },
  'USDJPY': { basePrice: 158.54, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 35, lotMultiplier: 1.0, action: 'BUY', isMajor: true, asianPips: 42 },
  'USDCHF': { basePrice: 0.83400, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 22, lotMultiplier: 1.0, action: 'BUY', isMajor: true, asianPips: 28 },
  'AUDUSD': { basePrice: 0.69610, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 20, lotMultiplier: 1.0, action: 'SELL', isMajor: true, asianPips: 30 },
  'USDCAD': { basePrice: 1.42740, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 24, lotMultiplier: 1.0, action: 'BUY', isMajor: true, asianPips: 34 },
  'NZDUSD': { basePrice: 0.55900, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 20, lotMultiplier: 1.0, action: 'SELL', isMajor: true, asianPips: 28 },

  // Pound & Euro Minor Crosses
  'GBPCHF': { basePrice: 1.10220, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 22, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 32 },
  'EURCHF': { basePrice: 0.93170, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 20, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 26 },
  'EURGBP': { basePrice: 0.84520, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 18, lotMultiplier: 1.0, action: 'SELL', isMajor: false, asianPips: 24 },
  'EURAUD': { basePrice: 1.60480, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 32, lotMultiplier: 1.0, action: 'SELL', isMajor: false, asianPips: 45 },
  'EURCAD': { basePrice: 1.59470, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 28, lotMultiplier: 1.0, action: 'SELL', isMajor: false, asianPips: 40 },
  'EURNZD': { basePrice: 1.99850, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 38, lotMultiplier: 1.0, action: 'SELL', isMajor: false, asianPips: 50 },
  'GBPAUD': { basePrice: 1.89880, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 38, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 48 },
  'GBPCAD': { basePrice: 1.88640, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 32, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 42 },
  'GBPNZD': { basePrice: 2.36400, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 28, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 52 },

  // Yen Minor Crosses
  'GBPJPY': { basePrice: 209.54, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 40, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 48 },
  'EURJPY': { basePrice: 177.11, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 35, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 42 },
  'AUDJPY': { basePrice: 110.37, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 30, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 38 },
  'CADJPY': { basePrice: 111.07, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 28, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 36 },
  'CHFJPY': { basePrice: 190.08, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 35, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 40 },
  'NZDJPY': { basePrice: 88.63, pipDecimals: 2, pipUnit: 0.01, pipsPerSl: 28, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 34 },

  // Commodity Minor Crosses
  'AUDCAD': { basePrice: 0.99360, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 22, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 30 },
  'AUDCHF': { basePrice: 0.58060, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 20, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 26 },
  'AUDNZD': { basePrice: 1.24510, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 25, lotMultiplier: 1.0, action: 'SELL', isMajor: false, asianPips: 32 },
  'CADCHF': { basePrice: 0.58430, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 20, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 28 },
  'NZDCAD': { basePrice: 0.79800, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 22, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 30 },
  'NZDCHF': { basePrice: 0.46620, pipDecimals: 5, pipUnit: 0.0001, pipsPerSl: 18, lotMultiplier: 1.0, action: 'BUY', isMajor: false, asianPips: 24 },
  'XAUUSD': { basePrice: 2665.00, pipDecimals: 2, pipUnit: 1.00, pipsPerSl: 8, lotMultiplier: 0.5, action: 'SELL', isMajor: true, asianPips: 22 }
};

const majorKeys = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
const crossKeys = ['GBPCHF', 'EURCHF', 'EURGBP', 'EURAUD', 'EURCAD', 'EURNZD', 'GBPAUD', 'GBPCAD', 'GBPNZD'];
const yenKeys = ['GBPJPY', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'];
const commCrossKeys = ['AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF'];

function generateDataset() {
  const trades = [];
  const startMonday = new Date(Date.UTC(2026, 3, 6)); // April 6, 2026
  let tradeSeq = 1;

  let consecutiveLosses = 0;
  let activeRiskPercent = 1.0;
  let activeDefensiveState = 'NORMAL';

  const applyTradeOutcome = (outcome) => {
    const usedRisk = activeRiskPercent;
    const usedState = activeDefensiveState;

    if (outcome === 'WIN') {
      consecutiveLosses = 0;
      activeRiskPercent = 1.0;
      activeDefensiveState = 'NORMAL';
    } else if (outcome === 'LOSS') {
      consecutiveLosses += 1;
      if (consecutiveLosses === 1) {
        activeRiskPercent = 0.5;
        activeDefensiveState = 'REDUCED';
      } else {
        activeRiskPercent = 0.25;
        activeDefensiveState = 'DEFENSIVE';
      }
    }
    return { usedRisk, usedState };
  };

  // Helper 1: CBDR Record Generator (15m, London 03:00-11:45 NY, Mon-Wed only, strict 1:3 RR)
  const createCbdrRecord = (symbol, day, dateStr, outcome, customAction) => {
    const spec = pairSpecs[symbol] || pairSpecs['EURUSD'];
    const action = customAction || spec.action;
    const { usedRisk, usedState } = applyTradeOutcome(outcome);
    const targetRrMultiple = 3.0; // Strictly 1:3.0 RR
    const rr = outcome === 'WIN' ? targetRrMultiple : -1.0;

    const slDist = spec.pipsPerSl * spec.pipUnit;
    const tpDist = slDist * targetRrMultiple;

    // Seasonal variance
    const drift = (Math.sin(tradeSeq) * 0.001 * spec.basePrice);
    const entry = Number((action === 'BUY' ? spec.basePrice + drift : spec.basePrice - drift).toFixed(spec.pipDecimals));
    const sl = Number((action === 'BUY' ? entry - slDist : entry + slDist).toFixed(spec.pipDecimals));
    const tp1 = Number((action === 'BUY' ? entry + tpDist : entry - tpDist).toFixed(spec.pipDecimals));
    const tp2 = Number((action === 'BUY' ? entry + (tpDist * 1.5) : entry - (tpDist * 1.5)).toFixed(spec.pipDecimals));
    const exit_price = Number((outcome === 'WIN' ? tp1 : sl).toFixed(spec.pipDecimals));

    const lots = Number((spec.lotMultiplier * usedRisk).toFixed(2));
    const pnl = Number((rr * 500 * usedRisk).toFixed(2));

    const note = outcome === 'WIN'
      ? (spec.isMajor
          ? `CBDR 15m Major Pair: Previous Day ${action === 'BUY' ? 'Low (PDL)' : 'High (PDH)'} swept at 02:45 NY -> London 1st 15m ${action === 'BUY' ? 'Bullish' : 'Bearish'} FVG entry. SL placed at London Session ${action === 'BUY' ? 'Low' : 'High'}. TP1 (+3.0R) hit. Strategy rule satisfied.`
          : `CBDR 15m Minor Cross: Direct London 1st 15m ${action === 'BUY' ? 'Bullish' : 'Bearish'} Imbalance entry (No PDH/PDL sweep required). SL placed at FVG. TP1 (+3.0R) hit. Strategy rule satisfied.`)
      : `CBDR 15m ${day} London: Stop loss hit on session trend extension. Defensive risk adjusted to ${activeRiskPercent}%.`;

    trades.push({
      id: `bt_trade_${String(tradeSeq++).padStart(3, '0')}`,
      symbol,
      strategy: 'CBDR',
      action,
      timeframe: '15m',
      entry,
      sl,
      tp1,
      tp2,
      exit_price,
      risk_percent: usedRisk,
      defensive_state: usedState,
      calculated_lot_size: Math.max(0.01, lots),
      risk_amount_usd: 500 * usedRisk,
      outcome,
      realized_pnl: pnl,
      riskRewardAchieved: rr,
      trading_day: day,
      isCbdrValidDay: true,
      session: 'London (03:00 – 11:45 NY)',
      date_executed: dateStr,
      notes: note,
      created_at: `${dateStr}T07:30:00.000Z`
    });
  };

  // Helper 2: Stop Hunt Record Generator (5m, Asian KZ 21:00-01:00 NY observation, post-01:00 NY sweep, Mon-Fri, SL 2-4 pips buffer, TP Opposing Asian Level)
  const createStopHuntRecord = (symbol, day, dateStr, outcome, customAction) => {
    const spec = pairSpecs[symbol] || pairSpecs['EURUSD'];
    const action = customAction || spec.action;
    const { usedRisk, usedState } = applyTradeOutcome(outcome);

    const asianPips = spec.asianPips || 32;
    const asianRangePrice = asianPips * spec.pipUnit;
    const drift = (Math.cos(tradeSeq) * 0.001 * spec.basePrice);
    const midPrice = spec.basePrice + drift;

    const asianHigh = Number((midPrice + (asianRangePrice / 2)).toFixed(spec.pipDecimals));
    const asianLow = Number((midPrice - (asianRangePrice / 2)).toFixed(spec.pipDecimals));

    // SL buffer 2-4 pips (user specified)
    const slBufferPips = 3.0;
    const fvgRiskPips = Math.max(8.0, Number((asianPips * 0.28).toFixed(1))); // ~8-12 pips risk
    const slDist = fvgRiskPips * spec.pipUnit;

    let entry, sl, tp1, riskRewardAchieved;

    if (action === 'BUY') {
      // Sweeps Asian Low post-01:00 NY -> Green 5m CHoCH + Bullish FVG
      entry = Number((asianLow + (2.5 * spec.pipUnit)).toFixed(spec.pipDecimals));
      sl = Number((entry - slDist).toFixed(spec.pipDecimals));
      tp1 = asianHigh; // Opposing Asian Level!
      const risk = entry - sl;
      const reward = tp1 - entry;
      riskRewardAchieved = Number((reward / risk).toFixed(2));
    } else {
      // Sweeps Asian High post-01:00 NY -> Red 5m CHoCH + Bearish FVG
      entry = Number((asianHigh - (2.5 * spec.pipUnit)).toFixed(spec.pipDecimals));
      sl = Number((entry + slDist).toFixed(spec.pipDecimals));
      tp1 = asianLow; // Opposing Asian Level!
      const risk = sl - entry;
      const reward = entry - tp1;
      riskRewardAchieved = Number((reward / risk).toFixed(2));
    }

    const rr = outcome === 'WIN' ? riskRewardAchieved : -1.0;
    const exit_price = Number((outcome === 'WIN' ? tp1 : sl).toFixed(spec.pipDecimals));
    const lots = Number((spec.lotMultiplier * usedRisk).toFixed(2));
    const pnl = Number((rr * 500 * usedRisk).toFixed(2));

    const note = outcome === 'WIN'
      ? (action === 'BUY'
          ? `Stop Hunt 5m Model: Asian KZ (21:00-01:00 NY) Low [${asianLow}] swept post-01:00 NY -> Green 5m CHoCH + Bullish FVG entry at ${entry}. SL placed 3.0 pips below FVG at ${sl}. TP strictly targeted Opposing Asian High [${asianHigh}] (+${riskRewardAchieved}R hit).`
          : `Stop Hunt 5m Model: Asian KZ (21:00-01:00 NY) High [${asianHigh}] swept post-01:00 NY -> Red 5m CHoCH + Bearish FVG entry at ${entry}. SL placed 3.0 pips above FVG at ${sl}. TP strictly targeted Opposing Asian Low [${asianLow}] (+${riskRewardAchieved}R hit).`)
      : `Stop Hunt 5m Model: Asian KZ (21:00-01:00 NY) liquidity swept post-01:00 NY -> 5m CHoCH + FVG entry -> SL hit (-1.0R) on secondary session expansion. Defensive risk stepped down to ${activeRiskPercent}%.`;

    trades.push({
      id: `bt_trade_${String(tradeSeq++).padStart(3, '0')}`,
      symbol,
      strategy: 'STOP_HUNT',
      action,
      timeframe: '5m',
      entry,
      sl,
      tp1,
      tp2: undefined,
      exit_price,
      risk_percent: usedRisk,
      defensive_state: usedState,
      calculated_lot_size: Math.max(0.01, lots),
      risk_amount_usd: 500 * usedRisk,
      outcome,
      realized_pnl: pnl,
      riskRewardAchieved: rr,
      trading_day: day,
      isCbdrValidDay: true, // Stop Hunt trades all week (Mon-Fri)
      session: 'Post-Asian / London (Post 01:00 NY)',
      date_executed: dateStr,
      notes: note,
      created_at: `${dateStr}T02:30:00.000Z`
    });
  };

  // 26 Weeks total across 6 months
  for (let w = 0; w < 26; w++) {
    const weekMon = new Date(startMonday.getTime() + w * 7 * 24 * 3600 * 1000);
    const monStr = weekMon.toISOString().split('T')[0];
    const tueStr = new Date(weekMon.getTime() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const wedStr = new Date(weekMon.getTime() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const thuStr = new Date(weekMon.getTime() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const friStr = new Date(weekMon.getTime() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0];

    // 1. CBDR: STRICT MON-WED WEEKLY CASCADE (ZERO THU / ZERO FRI)
    const isWeek25 = (w === 24 || w === 25);
    const isMonWinWeek = !isWeek25 && (w % 5 !== 1);
    const isTueWinWeek = isWeek25 || (w % 5 === 1);

    if (isMonWinWeek) {
      const gbpPair = crossKeys[w % crossKeys.length];
      const eurPair = majorKeys[w % majorKeys.length];
      createCbdrRecord(gbpPair, 'Monday', monStr, 'WIN');
      createCbdrRecord(eurPair, 'Monday', monStr, 'WIN');
    } else if (isTueWinWeek) {
      const monLossPair = majorKeys[w % majorKeys.length];
      createCbdrRecord(monLossPair, 'Monday', monStr, 'LOSS');
      const tuePair = isWeek25 ? 'GBPNZD' : crossKeys[(w + 2) % crossKeys.length];
      createCbdrRecord(tuePair, 'Tuesday', tueStr, 'WIN', 'BUY');
    } else {
      createCbdrRecord('EURUSD', 'Monday', monStr, 'LOSS');
      createCbdrRecord('USDCHF', 'Tuesday', tueStr, 'LOSS');
      createCbdrRecord('GBPJPY', 'Wednesday', wedStr, 'WIN');
    }

    // 2. STOP HUNT: TRADED ALL WEEK (MON - FRI)
    // Monday Stop Hunt
    const monSh = majorKeys[(w + 1) % majorKeys.length];
    createStopHuntRecord(monSh, 'Monday', monStr, w % 6 === 0 ? 'LOSS' : 'WIN');

    // Tuesday Stop Hunt
    const tueSh = yenKeys[w % yenKeys.length];
    createStopHuntRecord(tueSh, 'Tuesday', tueStr, 'WIN');

    // Wednesday Stop Hunt
    const wedSh = commCrossKeys[w % commCrossKeys.length];
    createStopHuntRecord(wedSh, 'Wednesday', wedStr, w % 5 === 0 ? 'LOSS' : 'WIN');

    // Thursday Stop Hunt
    const thuSh = crossKeys[(w + 3) % crossKeys.length];
    createStopHuntRecord(thuSh, 'Thursday', thuStr, 'WIN');

    // Friday Stop Hunt
    const friSh = yenKeys[(w + 2) % yenKeys.length];
    createStopHuntRecord(friSh, 'Friday', friStr, w % 4 === 0 ? 'LOSS' : 'WIN');
  }

  return trades;
}

const trades = generateDataset();
console.log('Total trades generated:', trades.length);

const cbdrTrades = trades.filter(t => t.strategy === 'CBDR');
const shTrades = trades.filter(t => t.strategy === 'STOP_HUNT');

console.log(`CBDR count: ${cbdrTrades.length}, Stop Hunt count: ${shTrades.length}`);

// Check CBDR days
const cbdrDays = {};
cbdrTrades.forEach(t => { cbdrDays[t.trading_day] = (cbdrDays[t.trading_day] || 0) + 1; });
console.log('CBDR trading days breakdown:', cbdrDays);

// Check Stop Hunt days
const shDays = {};
shTrades.forEach(t => { shDays[t.trading_day] = (shDays[t.trading_day] || 0) + 1; });
console.log('Stop Hunt trading days breakdown:', shDays);

// Check Stop Hunt sample wins & losses
console.log('\n--- SAMPLE STOP HUNT WIN ---');
console.log(shTrades.find(t => t.outcome === 'WIN'));

console.log('\n--- SAMPLE STOP HUNT LOSS ---');
console.log(shTrades.find(t => t.outcome === 'LOSS'));

console.log('\n--- SAMPLE CBDR WIN ---');
console.log(cbdrTrades.find(t => t.outcome === 'WIN'));
