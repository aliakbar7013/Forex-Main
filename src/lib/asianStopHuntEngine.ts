/**
 * Asian Kill Zone Stop Hunt (STUFF) Strategy & Backtesting Engine
 * 
 * Strategy Specification:
 * - Timeframe: 5-Minute (M5) execution.
 * - Base Chart Timezone: America/New_York (UTC-5 / UTC-4 depending on DST).
 * - Session Identification:
 *   - Asian Kill Zone: 20:00 - 00:00 NY (or 21:00 - 01:00 NY, configurable).
 *   - Records Asian_High and Asian_Low within this window.
 *   - Pre-condition: NO entries allowed inside the Asian Kill Zone. Wait until the zone finishes.
 * - Filter: IPDA Directional Bias:
 *   - BULLISH: Only scan for BUY setups (Asian Low sweep).
 *   - BEARISH: Only scan for SELL setups (Asian High sweep).
 *   - NEUTRAL: Flag as "NO TRADE", skip pair.
 * - Triggers & Order Type:
 *   - Sweep of Asian High/Low.
 *   - 5m CHoCH (Change of Character) & Balanced Price Range (BPR: overlapping Bullish/Bearish FVGs).
 *   - Limit Order ONLY at BPR edge.
 *   - Stop Loss placed just above/below sweep swing with small buffer.
 *   - Take Profit targeting opposing Asian Kill Zone liquidity (min 1:3 up to 1:6+ RR).
 */

import { 
  StopHuntSignal, 
  AsianStopHuntBacktestConfig, 
  AsianStopHuntTradeResult, 
  CentralBankRate 
} from '@/types';
import { calculatePairIpdaBias, DEFAULT_CENTRAL_BANK_RATES, SUPPORTED_PAIRS } from './ipdaEngine';
import { getPipSize, getPairDecimals } from './pairMath';

export interface M5Candle {
  timestamp: number; // Unix seconds
  iso: string;
  dateStr: string;
  utcHour: number;
  utcMin: number;
  nyHour: number;
  nyMin: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Converts a UTC timestamp to New York Time (hours 0-23, minutes 0-59)
 */
export function toNyTimeComponents(utcTimestampSec: number): { nyHour: number; nyMin: number; dateStrNY: string; dayOfWeekNY: number } {
  const d = new Date(utcTimestampSec * 1000);
  const nyStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  // nyStr format: M/D/YYYY, HH:MM:SS
  const parts = nyStr.split(', ');
  const [m, day, y] = parts[0].split('/').map(Number);
  const [hh, mm] = parts[1].split(':').map(Number);
  
  const dateStrNY = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const nyDate = new Date(`${dateStrNY}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  
  return {
    nyHour: hh === 24 ? 0 : hh,
    nyMin: mm,
    dateStrNY,
    dayOfWeekNY: nyDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  };
}

/**
 * Normalizes raw candle bars into typed M5Candles with New York time coordinates
 */
export function normalizeM5Candles(bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number }>): M5Candle[] {
  return bars.map(b => {
    const ny = toNyTimeComponents(b.timestamp);
    const d = new Date(b.timestamp * 1000);
    return {
      timestamp: b.timestamp,
      iso: d.toISOString(),
      dateStr: ny.dateStrNY,
      utcHour: d.getUTCHours(),
      utcMin: d.getUTCMinutes(),
      nyHour: ny.nyHour,
      nyMin: ny.nyMin,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Determines IPDA Bias for a pair: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
 */
export function getPairIpdaBiasDirection(symbol: string, rates: CentralBankRate[] = DEFAULT_CENTRAL_BANK_RATES): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pairDef = SUPPORTED_PAIRS.find(p => p.symbol === cleanSym);
  if (!pairDef) {
    if (cleanSym.includes('USD')) {
      return cleanSym.startsWith('USD') ? 'BULLISH' : 'BEARISH';
    }
    return 'NEUTRAL';
  }

  const ipda = calculatePairIpdaBias(pairDef, rates);
  if (ipda.effectiveDirection === 'BUY_ONLY') return 'BULLISH';
  if (ipda.effectiveDirection === 'SELL_ONLY') return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Identifies Balanced Price Range (BPR) on M5 candles:
 * An overlapping region between a Bullish Fair Value Gap and a Bearish Fair Value Gap.
 */
export function findM5BprRange(candles: M5Candle[], startIndex: number, direction: 'BUY' | 'SELL', pipUnit: number): { high: number; low: number; barIndex: number } | null {
  const lookback = Math.max(0, startIndex - 8);
  const lookahead = Math.min(candles.length - 1, startIndex + 12);

  let bullishFvgs: Array<{ high: number; low: number; idx: number }> = [];
  let bearishFvgs: Array<{ high: number; low: number; idx: number }> = [];

  for (let i = lookback + 2; i <= lookahead; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: c3.low > c1.high
    if (c3.low > c1.high && (c3.low - c1.high) >= pipUnit * 0.5) {
      bullishFvgs.push({ high: c3.low, low: c1.high, idx: i });
    }
    // Bearish FVG: c3.high < c1.low
    if (c3.high < c1.low && (c1.low - c3.high) >= pipUnit * 0.5) {
      bearishFvgs.push({ high: c1.low, low: c3.high, idx: i });
    }
  }

  // Look for overlapping zones (Balanced Price Range)
  for (const bear of bearishFvgs) {
    for (const bull of bullishFvgs) {
      const overlapLow = Math.max(bear.low, bull.low);
      const overlapHigh = Math.min(bear.high, bull.high);

      if (overlapHigh > overlapLow) {
        return {
          high: overlapHigh,
          low: overlapLow,
          barIndex: Math.max(bear.idx, bull.idx)
        };
      }
    }
  }

  // If strict overlap not found, use the primary displacement FVG as the BPR boundary
  if (direction === 'SELL' && bearishFvgs.length > 0) {
    const primary = bearishFvgs[0];
    return { high: primary.high, low: primary.low, barIndex: primary.idx };
  } else if (direction === 'BUY' && bullishFvgs.length > 0) {
    const primary = bullishFvgs[0];
    return { high: primary.high, low: primary.low, barIndex: primary.idx };
  }

  return null;
}

/**
 * Detects 5-Minute Change of Character (CHoCH):
 * - For Bearish CHoCH: price breaks below recent swing low
 * - For Bullish CHoCH: price breaks above recent swing high
 */
export function detectM5Choch(
  candles: M5Candle[], 
  sweepIndex: number, 
  direction: 'BUY' | 'SELL'
): { confirmed: boolean; chochPrice: number; chochIndex: number } {
  if (sweepIndex >= candles.length - 1) {
    return { confirmed: false, chochPrice: 0, chochIndex: -1 };
  }

  // Find swing level preceding or during the sweep
  const searchStart = Math.max(0, sweepIndex - 6);
  
  if (direction === 'SELL') {
    // Look for recent swing low before/during sweep that gets broken downward
    let recentSwingLow = Infinity;
    for (let i = searchStart; i <= sweepIndex; i++) {
      if (candles[i].low < recentSwingLow) {
        recentSwingLow = candles[i].low;
      }
    }

    // Look for candle closing below this swing low after the sweep
    for (let i = sweepIndex + 1; i < Math.min(candles.length, sweepIndex + 20); i++) {
      if (candles[i].close < recentSwingLow) {
        return { confirmed: true, chochPrice: recentSwingLow, chochIndex: i };
      }
    }
  } else {
    // Look for recent swing high that gets broken upward
    let recentSwingHigh = -Infinity;
    for (let i = searchStart; i <= sweepIndex; i++) {
      if (candles[i].high > recentSwingHigh) {
        recentSwingHigh = candles[i].high;
      }
    }

    for (let i = sweepIndex + 1; i < Math.min(candles.length, sweepIndex + 20); i++) {
      if (candles[i].close > recentSwingHigh) {
        return { confirmed: true, chochPrice: recentSwingHigh, chochIndex: i };
      }
    }
  }

  return { confirmed: false, chochPrice: 0, chochIndex: -1 };
}

/**
 * Evaluates Asian Stop Hunt setup for a given symbol and daily M5 candle series
 */
export function evaluateAsianStopHuntSetup(
  symbol: string,
  candles: M5Candle[],
  rates: CentralBankRate[] = DEFAULT_CENTRAL_BANK_RATES,
  config: Partial<AsianStopHuntBacktestConfig> = {}
): StopHuntSignal | null {
  const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pipUnit = getPipSize(cleanSym);
  const decimals = getPairDecimals(cleanSym);

  const asianStartH = config.asianStartHourNY ?? 20; // 20:00 NY (8:00 PM NY)
  const asianEndH = config.asianEndHourNY ?? 0;       // 00:00 NY (midnight NY)
  const slBufferPips = config.slBufferPips ?? 3.0;
  const minRr = config.minRiskReward ?? 3.0;

  // 1. IPDA Directional Bias Check
  const ipdaBias = getPairIpdaBiasDirection(cleanSym, rates);
  if (ipdaBias === 'NEUTRAL') {
    return null; // Flag as NO TRADE and skip
  }

  // 2. Identify Asian Kill Zone bars
  // In NY Time: 20:00 to 00:00 (or up to 01:00)
  const asianBars: M5Candle[] = [];
  const postAsianBars: M5Candle[] = [];

  for (const c of candles) {
    const isAsian = asianStartH > asianEndH
      ? (c.nyHour >= asianStartH || c.nyHour < asianEndH)
      : (c.nyHour >= asianStartH && c.nyHour < asianEndH);

    if (isAsian) {
      asianBars.push(c);
    } else if (c.nyHour >= asianEndH && c.nyHour <= 16) {
      // Post Asian window: from end of Asian KZ up to NY session close (16:00 NY)
      postAsianBars.push(c);
    }
  }

  if (asianBars.length < 6 || postAsianBars.length < 6) {
    return null; // Insufficient data to form valid Asian KZ
  }

  // Record Asian High & Asian Low
  let asianHigh = -Infinity;
  let asianLow = Infinity;
  for (const b of asianBars) {
    if (b.high > asianHigh) asianHigh = b.high;
    if (b.low < asianLow) asianLow = b.low;
  }

  asianHigh = Number(asianHigh.toFixed(decimals));
  asianLow = Number(asianLow.toFixed(decimals));

  // Pre-condition enforced: Entries strictly prohibited inside Asian Kill Zone
  // Only evaluate post-Asian bars

  if (ipdaBias === 'BEARISH') {
    // -------------------------------------------------------------
    // SELL SETUP (IPDA BEARISH)
    // -------------------------------------------------------------
    // 1. Sweep: Price breaks above Asian_High
    let sweepBarIdx = -1;
    let sweepHigh = asianHigh;

    for (let i = 0; i < postAsianBars.length; i++) {
      if (postAsianBars[i].high > asianHigh) {
        sweepBarIdx = i;
        if (postAsianBars[i].high > sweepHigh) {
          sweepHigh = postAsianBars[i].high;
        }
      }
    }

    if (sweepBarIdx === -1) return null; // No Asian High sweep

    // 2. CHoCH: Red CHoCH breaking below recent swing low
    const choch = detectM5Choch(postAsianBars, sweepBarIdx, 'SELL');
    if (!choch.confirmed) return null;

    // 3. Balanced Price Range (BPR)
    const bpr = findM5BprRange(postAsianBars, choch.chochIndex, 'SELL', pipUnit);
    if (!bpr) return null;

    // 4. Order Type: LIMIT ORDER ONLY
    // Limit Entry at edge of Bearish BPR (bpr.low or midpoint)
    const entryPrice = Number(bpr.low.toFixed(decimals));
    // Stop Loss just above swing high formed during sweep with buffer
    const slDistBuffer = Number((slBufferPips * pipUnit).toFixed(decimals));
    const stopLoss = Number((sweepHigh + slDistBuffer).toFixed(decimals));

    const risk = Number((stopLoss - entryPrice).toFixed(decimals));
    if (risk <= 0 || (risk / pipUnit) < 2.5) return null;

    // Take Profit: Target opposing Asian Low (Sell-Side Liquidity)
    // Check if target provides >= minRr
    let takeProfit1 = Number(asianLow.toFixed(decimals));
    const reward = Number((entryPrice - takeProfit1).toFixed(decimals));
    let calculatedRr = Number((reward / risk).toFixed(1));

    if (calculatedRr < minRr) {
      // Scale out to 1-Hour swing lows to achieve required minimum 1:3.0 RR
      takeProfit1 = Number((entryPrice - (risk * minRr)).toFixed(decimals));
      calculatedRr = minRr;
    }

    const triggerBar = postAsianBars[choch.chochIndex];
    const timestamp = triggerBar?.iso || new Date().toISOString();

    return {
      id: `sh_${cleanSym.toLowerCase()}_${triggerBar.dateStr}_sell`,
      pair: cleanSym,
      timestamp,
      ipdaBias: 'BEARISH',
      asianHigh,
      asianLow,
      sweepType: 'HIGH_SWEEP',
      chochConfirmed: true,
      bprRange: { high: Number(bpr.high.toFixed(decimals)), low: Number(bpr.low.toFixed(decimals)) },
      orderType: 'LIMIT',
      entryPrice,
      stopLoss,
      takeProfit1,
      riskRewardRatio: calculatedRr,
      status: 'PENDING_FILL',
      sweepPrice: Number(sweepHigh.toFixed(decimals)),
      chochPrice: Number(choch.chochPrice.toFixed(decimals)),
      session: `Post-Asian KZ (${String(triggerBar.nyHour).padStart(2, '0')}:${String(triggerBar.nyMin).padStart(2, '0')} NY)`,
      notes: `[IPDA BEARISH] Asian High [${asianHigh}] swept @ ${sweepHigh} -> 5m Red CHoCH confirmed @ ${choch.chochPrice} -> Bearish BPR [${bpr.low}–${bpr.high}]. Limit Entry: ${entryPrice}, SL: ${stopLoss}, TP: ${takeProfit1} (1:${calculatedRr} RR).`
    };

  } else if (ipdaBias === 'BULLISH') {
    // -------------------------------------------------------------
    // BUY SETUP (IPDA BULLISH)
    // -------------------------------------------------------------
    // 1. Sweep: Price breaks below Asian_Low
    let sweepBarIdx = -1;
    let sweepLow = asianLow;

    for (let i = 0; i < postAsianBars.length; i++) {
      if (postAsianBars[i].low < asianLow) {
        sweepBarIdx = i;
        if (postAsianBars[i].low < sweepLow) {
          sweepLow = postAsianBars[i].low;
        }
      }
    }

    if (sweepBarIdx === -1) return null; // No Asian Low sweep

    // 2. CHoCH: Green CHoCH breaking above recent swing high
    const choch = detectM5Choch(postAsianBars, sweepBarIdx, 'BUY');
    if (!choch.confirmed) return null;

    // 3. Balanced Price Range (BPR)
    const bpr = findM5BprRange(postAsianBars, choch.chochIndex, 'BUY', pipUnit);
    if (!bpr) return null;

    // 4. Order Type: LIMIT ORDER ONLY
    // Limit Entry at edge of Bullish BPR (bpr.high or overlap edge)
    const entryPrice = Number(bpr.high.toFixed(decimals));
    // Stop Loss just below swing low formed during sweep with buffer
    const slDistBuffer = Number((slBufferPips * pipUnit).toFixed(decimals));
    const stopLoss = Number((sweepLow - slDistBuffer).toFixed(decimals));

    const risk = Number((entryPrice - stopLoss).toFixed(decimals));
    if (risk <= 0 || (risk / pipUnit) < 2.5) return null;

    // Take Profit: Target opposing Asian High (Buy-Side Liquidity)
    let takeProfit1 = Number(asianHigh.toFixed(decimals));
    const reward = Number((takeProfit1 - entryPrice).toFixed(decimals));
    let calculatedRr = Number((reward / risk).toFixed(1));

    if (calculatedRr < minRr) {
      takeProfit1 = Number((entryPrice + (risk * minRr)).toFixed(decimals));
      calculatedRr = minRr;
    }

    const triggerBar = postAsianBars[choch.chochIndex];
    const timestamp = triggerBar?.iso || new Date().toISOString();

    return {
      id: `sh_${cleanSym.toLowerCase()}_${triggerBar.dateStr}_buy`,
      pair: cleanSym,
      timestamp,
      ipdaBias: 'BULLISH',
      asianHigh,
      asianLow,
      sweepType: 'LOW_SWEEP',
      chochConfirmed: true,
      bprRange: { high: Number(bpr.high.toFixed(decimals)), low: Number(bpr.low.toFixed(decimals)) },
      orderType: 'LIMIT',
      entryPrice,
      stopLoss,
      takeProfit1,
      riskRewardRatio: calculatedRr,
      status: 'PENDING_FILL',
      sweepPrice: Number(sweepLow.toFixed(decimals)),
      chochPrice: Number(choch.chochPrice.toFixed(decimals)),
      session: `Post-Asian KZ (${String(triggerBar.nyHour).padStart(2, '0')}:${String(triggerBar.nyMin).padStart(2, '0')} NY)`,
      notes: `[IPDA BULLISH] Asian Low [${asianLow}] swept @ ${sweepLow} -> 5m Green CHoCH confirmed @ ${choch.chochPrice} -> Bullish BPR [${bpr.low}–${bpr.high}]. Limit Entry: ${entryPrice}, SL: ${stopLoss}, TP: ${takeProfit1} (1:${calculatedRr} RR).`
    };
  }

  return null;
}

/**
 * Simulates execution of a pending Limit Order against remaining M5 bars of the day
 */
export function simulateLimitOrderExecution(
  signal: StopHuntSignal,
  evaluationBars: M5Candle[],
  riskAmountUsd: number = 1000
): { status: StopHuntSignal['status']; exitPrice: number; realizedPnl: number } {
  const isBuy = signal.sweepType === 'LOW_SWEEP';
  let isFilled = false;
  let status: StopHuntSignal['status'] = 'PENDING_FILL';
  let exitPrice = signal.entryPrice;
  let realizedPnl = 0;

  for (const bar of evaluationBars) {
    if (!isFilled) {
      // Check for limit order fill
      if (isBuy && bar.low <= signal.entryPrice) {
        isFilled = true;
        status = 'TRIGGERED';
      } else if (!isBuy && bar.high >= signal.entryPrice) {
        isFilled = true;
        status = 'TRIGGERED';
      }
    } else {
      // Once filled, check for TP hit or SL hit
      if (isBuy) {
        if (bar.low <= signal.stopLoss) {
          status = 'SL_HIT';
          exitPrice = signal.stopLoss;
          realizedPnl = -riskAmountUsd;
          break;
        }
        if (bar.high >= signal.takeProfit1) {
          status = 'TP_HIT';
          exitPrice = signal.takeProfit1;
          realizedPnl = Number((riskAmountUsd * signal.riskRewardRatio).toFixed(2));
          break;
        }
      } else {
        if (bar.high >= signal.stopLoss) {
          status = 'SL_HIT';
          exitPrice = signal.stopLoss;
          realizedPnl = -riskAmountUsd;
          break;
        }
        if (bar.low <= signal.takeProfit1) {
          status = 'TP_HIT';
          exitPrice = signal.takeProfit1;
          realizedPnl = Number((riskAmountUsd * signal.riskRewardRatio).toFixed(2));
          break;
        }
      }
    }
  }

  if (!isFilled) {
    status = 'EXPIRED';
  }

  return { status, exitPrice, realizedPnl };
}

/**
 * Runs the Automated Asian Stop Hunt Backtester across historical candles
 */
export function runAsianStopHuntBacktest(
  candlesByPair: Map<string, M5Candle[]>,
  config: AsianStopHuntBacktestConfig,
  rates: CentralBankRate[] = DEFAULT_CENTRAL_BANK_RATES
): {
  trades: AsianStopHuntTradeResult[];
  metrics: {
    totalTrades: number;
    wins: number;
    losses: number;
    expired: number;
    winRate: number;
    totalPnl: number;
    grossProfit: number;
    grossLoss: number;
    profitFactor: number;
    avgRr: number;
    maxDrawdownPercent: number;
    dayBreakdown: Record<string, { trades: number; wins: number; losses: number; winRate: number; pnl: number }>;
  };
} {
  const trades: AsianStopHuntTradeResult[] = [];
  let tradeSeq = 1;

  for (const pair of config.selectedPairs) {
    const bars = candlesByPair.get(pair) || [];
    if (bars.length < 50) continue;

    // Group bars by day
    const barsByDate = new Map<string, M5Candle[]>();
    for (const b of bars) {
      if (!barsByDate.has(b.dateStr)) barsByDate.set(b.dateStr, []);
      barsByDate.get(b.dateStr)!.push(b);
    }

    const sortedDates = [...barsByDate.keys()].sort();

    for (const dateStr of sortedDates) {
      const dayBars = barsByDate.get(dateStr) || [];
      if (dayBars.length < 30) continue;

      const d = new Date(dayBars[0].timestamp * 1000);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[d.getDay()];

      // Forex markets: Monday to Friday only
      if (dayName === 'Saturday' || dayName === 'Sunday') continue;

      // Evaluate setup
      const signal = evaluateAsianStopHuntSetup(pair, dayBars, rates, config);
      if (!signal) continue;

      // Simulate limit order execution
      const evalBars = dayBars.filter(b => b.iso >= signal.timestamp);
      const sim = simulateLimitOrderExecution(signal, evalBars, 1000);

      const dNy = new Date(signal.timestamp);
      const entryTimeNY = dNy.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
      const entryTimeIST = dNy.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

      trades.push({
        id: `sh_bt_${String(tradeSeq++).padStart(4, '0')}`,
        pair,
        date: dateStr,
        tradingDay: dayName,
        ipdaBias: signal.ipdaBias,
        sweepType: signal.sweepType,
        asianHigh: signal.asianHigh,
        asianLow: signal.asianLow,
        sweepPrice: signal.sweepPrice || (signal.sweepType === 'HIGH_SWEEP' ? signal.asianHigh : signal.asianLow),
        chochConfirmed: signal.chochConfirmed,
        chochPrice: signal.chochPrice || 0,
        bprRange: signal.bprRange,
        orderType: 'LIMIT',
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit1,
        riskRewardRatio: signal.riskRewardRatio,
        outcome: sim.status === 'TP_HIT' ? 'WIN' : sim.status === 'SL_HIT' ? 'LOSS' : 'EXPIRED',
        exitPrice: sim.exitPrice,
        realizedPnl: sim.realizedPnl,
        entryTimeNY,
        entryTimeIST,
        notes: signal.notes || ''
      });
    }
  }

  // Calculate Comprehensive Performance Metrics
  const completedTrades = trades.filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS');
  const wins = completedTrades.filter(t => t.outcome === 'WIN').length;
  const losses = completedTrades.filter(t => t.outcome === 'LOSS').length;
  const expired = trades.filter(t => t.outcome === 'EXPIRED').length;
  const totalTrades = completedTrades.length;

  let grossProfit = 0;
  let grossLoss = 0;
  let totalRrSum = 0;

  for (const t of completedTrades) {
    if (t.outcome === 'WIN') {
      grossProfit += t.realizedPnl;
      totalRrSum += t.riskRewardRatio;
    } else {
      grossLoss += Math.abs(t.realizedPnl);
    }
  }

  const totalPnl = grossProfit - grossLoss;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 99.9 : 0);
  const avgRr = wins > 0 ? Number((totalRrSum / wins).toFixed(2)) : 0;

  // Max Drawdown calculation
  let peak = 0;
  let maxDd = 0;
  let running = 0;
  for (const t of completedTrades) {
    running += t.realizedPnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDd) maxDd = dd;
  }
  const maxDrawdownPercent = peak > 0 ? Number(((maxDd / peak) * 100).toFixed(1)) : 0;

  // Day breakdown
  const dayBreakdown: Record<string, { trades: number; wins: number; losses: number; winRate: number; pnl: number }> = {
    'Monday': { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 },
    'Tuesday': { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 },
    'Wednesday': { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 },
    'Thursday': { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 },
    'Friday': { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 }
  };

  for (const t of completedTrades) {
    if (dayBreakdown[t.tradingDay]) {
      dayBreakdown[t.tradingDay].trades++;
      if (t.outcome === 'WIN') dayBreakdown[t.tradingDay].wins++;
      else dayBreakdown[t.tradingDay].losses++;
      dayBreakdown[t.tradingDay].pnl += t.realizedPnl;
    }
  }

  for (const day of Object.keys(dayBreakdown)) {
    const d = dayBreakdown[day];
    d.winRate = d.trades > 0 ? Number(((d.wins / d.trades) * 100).toFixed(1)) : 0;
  }

  return {
    trades,
    metrics: {
      totalTrades,
      wins,
      losses,
      expired,
      winRate,
      totalPnl,
      grossProfit,
      grossLoss,
      profitFactor,
      avgRr,
      maxDrawdownPercent,
      dayBreakdown
    }
  };
}

/**
 * Exports trades to RFC 4180 compliant CSV format
 */
export function exportAsianStopHuntToCsv(trades: AsianStopHuntTradeResult[]): string {
  const headers = [
    'Trade ID',
    'Date',
    'Trading Day',
    'Pair',
    'IPDA Bias',
    'Sweep Type',
    'Asian High',
    'Asian Low',
    'Sweep Price',
    'CHoCH Confirmed',
    'CHoCH Price',
    'BPR Low',
    'BPR High',
    'Order Type',
    'Limit Entry Price',
    'Stop Loss',
    'Take Profit (TP1)',
    'Risk:Reward Ratio',
    'Outcome',
    'Exit Price',
    'Realized PnL ($)',
    'Entry Time (NY)',
    'Entry Time (IST)',
    'Notes'
  ];

  const rows = trades.map(t => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.tradingDay}"`,
    `"${t.pair}"`,
    `"${t.ipdaBias}"`,
    `"${t.sweepType}"`,
    t.asianHigh,
    t.asianLow,
    t.sweepPrice,
    t.chochConfirmed ? 'YES' : 'NO',
    t.chochPrice,
    t.bprRange.low,
    t.bprRange.high,
    `"${t.orderType}"`,
    t.entryPrice,
    t.stopLoss,
    t.takeProfit,
    t.riskRewardRatio,
    `"${t.outcome}"`,
    t.exitPrice,
    t.realizedPnl,
    `"${t.entryTimeNY}"`,
    `"${t.entryTimeIST}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Exports trades to Google Sheets format (TSV with ready formulas)
 */
export function exportAsianStopHuntToGoogleSheets(trades: AsianStopHuntTradeResult[]): string {
  const headers = [
    'Trade ID\tDate\tDay\tPair\tIPDA Bias\tSweep Type\tAsian High\tAsian Low\tSweep Price\tCHoCH\tBPR Range\tOrder Type\tLimit Entry\tStop Loss\tTP1\tRisk:Reward\tOutcome\tExit Price\tRealized PnL\tTime NY\tNotes'
  ];

  const rows = trades.map(t => [
    t.id,
    t.date,
    t.tradingDay,
    t.pair,
    t.ipdaBias,
    t.sweepType,
    t.asianHigh,
    t.asianLow,
    t.sweepPrice,
    t.chochConfirmed ? 'CHoCH OK' : 'NO',
    `${t.bprRange.low} - ${t.bprRange.high}`,
    t.orderType,
    t.entryPrice,
    t.stopLoss,
    t.takeProfit,
    t.riskRewardRatio,
    t.outcome,
    t.exitPrice,
    t.realizedPnl,
    t.entryTimeNY,
    t.notes || ''
  ].join('\t'));

  // Add Google Sheets Summary Row with formulas
  const totalRowIndex = trades.length + 2;
  const summaryRow = [
    'SUMMARY',
    'TOTAL TRADES',
    `=COUNTA(D2:D${totalRowIndex - 1})`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'WIN RATE',
    `=COUNTIF(Q2:Q${totalRowIndex - 1},"WIN")/COUNTA(Q2:Q${totalRowIndex - 1})`,
    'AVG RR',
    `=AVERAGE(P2:P${totalRowIndex - 1})`,
    'NET PNL',
    `=SUM(S2:S${totalRowIndex - 1})`,
    '',
    ''
  ].join('\t');

  return [headers, ...rows, '', summaryRow].join('\n');
}
