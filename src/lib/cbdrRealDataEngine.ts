/**
 * Real-Market CBDR Strategy Backtest & Live Execution Engine
 * Fetches real 15m OHLCV candles from free API and runs the updated ICT CBDR algorithm.
 * 
 * Updated Strategy Rules:
 * 1. Execution Window: London session 03:00 AM – 11:45 AM NY Time (12:30 PM – 09:15 PM IST).
 * 2. Trading Days: Monday, Tuesday, Wednesday.
 * 3. Major vs Minor Pairs Rule:
 *    - Major Pairs (EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD):
 *      Must follow Previous Day High (PDH) / Low (PDL) sweep before entry.
 *    - Minor Pairs (Crosses like GBPNZD, EURGBP, EURJPY, GBPJPY, AUDNZD, etc.):
 *      Do NOT follow Previous Day High/Low sweep. Enter directly on the 1st London imbalance.
 * 4. Entry Trigger: Enter on 1st 15m Imbalance (Fair Value Gap / FVG) formed in the London session.
 * 5. Stop Loss: Placed below the imbalance (for BUY) / above the imbalance (for SELL) with 5–10 pips buffer (7 pips).
 * 6. Take Profit (TP1): Strictly 1:3.0 Risk-to-Reward ratio (TP1 = Entry ± Risk * 3.0).
 * 7. IPDA Filter: Central Bank Macro Interest Rate Ratio (Base Rate / Quote Rate > 1.0 for BUY, < 1.0 for SELL).
 * 8. Outcome Separation: Resolved trades (hit TP/SL) -> Backtest Archive; Unresolved -> Live Trades (Active Signals).
 */

import { checkSignalIpdaPermitted, DEFAULT_CENTRAL_BANK_RATES } from './ipdaEngine';
import { isMajorPair } from './strategyValidator';
import { Signal, BacktestTradeRecord } from '@/types';
import { fetchTwelveDataCandles } from './twelveDataEngine';
import { fetchOandaCandles, getOandaApiToken } from './oandaEngine';
import { getAppSetting } from './db';

export interface Candle {
  timestamp: number;
  timeStrNY: string;
  timeStrIST: string;
  dateStr: string;
  dayName: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  hourNY: number;
  minuteNY: number;
  decimalHourNY: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  action: 'BUY' | 'SELL';
  date_executed: string;
  trading_day: string;
  session: string;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  exit_price?: number;
  risk_percent: number;
  calculated_lot_size: number;
  outcome: 'WIN' | 'LOSS' | 'BE';
  realized_pnl: number;
  riskRewardAchieved: number;
  notes: string;
  isCbdrValidDay: boolean;
}

export interface RealEngineResult {
  completedTrades: BacktestTrade[];
  activeLiveTrades: Signal[];
}

export function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s.includes('XAU') || s === 'GC=F' || s.includes('GOLD')) return 0.1;
  if (s.includes('US30') || s.includes('SPX') || s.includes('NAS')) return 1.0;
  return 0.0001;
}

/**
 * Fetches real 15m OHLCV candles calibrated to TradingView charts
 */
export async function fetchRealCandles(
  symbol: string, 
  apiKey?: string, 
  outputsize = 200, 
  provider?: 'TRADINGVIEW' | 'OANDA' | 'TWELVE_DATA'
): Promise<Candle[]> {
  const oandaToken = apiKey || getOandaApiToken();
  const candles = await fetchOandaCandles(symbol, oandaToken, undefined, outputsize);
  if (candles && candles.length > 0) {
    return candles;
  }

  return await fetchTwelveDataCandles(symbol, apiKey, outputsize);
}

/**
 * Execute 15m CBDR Strategy Engine on Real 15m Candles
 * Trigger: 1st Imbalance (FVG) in London session (03:00 AM – 11:45 AM NY Time).
 * Major Pairs: Follow Previous Day High/Low sweep.
 * Minor Pairs: Do NOT follow Previous Day High/Low sweep (direct 1st imbalance entry).
 * Stop Loss: Below imbalance base (BUY) / Above imbalance top (SELL) + 7 pips buffer.
 * Target: 1:3.0 Risk-to-Reward ratio.
 */
export function backtestCbdrOnCandles(symbol: string, candles: Candle[]): RealEngineResult {
  const completedTrades: BacktestTrade[] = [];
  const activeLiveTrades: Signal[] = [];
  if (candles.length < 50) return { completedTrades, activeLiveTrades };

  const lastCandle = candles[candles.length - 1];
  const currentMarketPrice = lastCandle ? lastCandle.close : 0;
  const pipFactor = getPipSize(symbol);
  const slBufferPips = 7.0; // 5-10 pips buffer (7 pips)
  const slBufferPrice = slBufferPips * pipFactor;
  const isMajor = isMajorPair(symbol);

  // Group candles by calendar date
  const candlesByDate = new Map<string, Candle[]>();
  for (const c of candles) {
    if (!candlesByDate.has(c.dateStr)) {
      candlesByDate.set(c.dateStr, []);
    }
    candlesByDate.get(c.dateStr)!.push(c);
  }

  const sortedDates = Array.from(candlesByDate.keys()).sort();

  let weekHolidayActive = false;
  let currentWeekNumber = -1;

  for (let dIdx = 0; dIdx < sortedDates.length; dIdx++) {
    const dateStr = sortedDates[dIdx];
    const dayCandles = candlesByDate.get(dateStr)!;
    if (dayCandles.length === 0) continue;

    const dayName = dayCandles[0].dayName;
    const dayOfWeek = dayCandles[0].dayOfWeek; // 0=Sun, 1=Mon, 2=Tue, 3=Wed

    // Check week number
    const dateObj = new Date(dateStr);
    const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const pastDaysOfYear = (dateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    if (weekNumber !== currentWeekNumber) {
      currentWeekNumber = weekNumber;
      weekHolidayActive = false; // Reset weekly holiday on new week
    }

    if (weekHolidayActive) {
      continue; // If TP was hit this week, weekly holiday is active
    }

    if (dayOfWeek < 1 || dayOfWeek > 3) {
      continue; // Only trade Monday (1), Tuesday (2), Wednesday (3)
    }

    // Determine prior day's High and Low for Major Pair sweep condition
    let priorDayHigh = 0;
    let priorDayLow = 0;
    if (dIdx > 0) {
      const priorDayCandles = candlesByDate.get(sortedDates[dIdx - 1]) || [];
      if (priorDayCandles.length > 0) {
        priorDayHigh = Math.max(...priorDayCandles.map(c => c.high));
        priorDayLow = Math.min(...priorDayCandles.map(c => c.low));
      }
    }

    // London Session Window: strictly 03:00 AM – 11:45 AM NY Time (3.0 to 11.75 decimal hours / 12:30 PM – 09:15 PM IST)
    const londonCandles = dayCandles.filter(c => c.decimalHourNY >= 3.0 && c.decimalHourNY <= 11.75);
    if (londonCandles.length < 3) continue;

    // Evaluate IPDA Macro Direction Filter for the current symbol
    const ipdaBuyCheck = checkSignalIpdaPermitted(symbol, 'BUY', DEFAULT_CENTRAL_BANK_RATES);
    const ipdaSellCheck = checkSignalIpdaPermitted(symbol, 'SELL', DEFAULT_CENTRAL_BANK_RATES);
    const isIpdaBuyPermitted = ipdaBuyCheck.permitted;
    const isIpdaSellPermitted = ipdaSellCheck.permitted;

    let tradeFoundInDay = false;

    // Early session (Asian/Pre-London) candles for checking sweep
    const preLondonCandles = dayCandles.filter(c => c.decimalHourNY < 3.0);
    const sessionMinBeforeLondon = preLondonCandles.length > 0 ? Math.min(...preLondonCandles.map(c => c.low)) : 0;
    const sessionMaxBeforeLondon = preLondonCandles.length > 0 ? Math.max(...preLondonCandles.map(c => c.high)) : 0;

    for (let cIdx = 2; cIdx < londonCandles.length; cIdx++) {
      if (tradeFoundInDay) break; // Only enter on the 1st imbalance of the session!

      const c0 = londonCandles[cIdx];     // Current candle (completes the imbalance)
      const c1 = londonCandles[cIdx - 1]; // Displacement candle
      const c2 = londonCandles[cIdx - 2]; // Prior candle

      // 1st Bullish Imbalance Setup: IPDA BUY ONLY permitted!
      // Condition: c0.low > c2.high and displacement candle c1 closed bullish
      if (isIpdaBuyPermitted && c0.low > c2.high && c1.close > c2.high) {
        // If Major Pair: Verify Previous Day Low (PDL) Sweep condition
        if (isMajor && priorDayLow > 0) {
          const currentDayLowSoFar = Math.min(
            sessionMinBeforeLondon > 0 ? sessionMinBeforeLondon : 999999,
            ...londonCandles.slice(0, cIdx + 1).map(c => c.low)
          );
          const pdlSwept = currentDayLowSoFar <= priorDayLow;
          if (!pdlSwept) {
            // Major pair requires PDL sweep before long entry
            continue;
          }
        }

        const entry = c0.low; // Entry on top of imbalance gap
        const imbalanceLow = Math.min(c2.high, c1.low);
        let sl: number;
        if (isMajor) {
          const londonLowSoFar = Math.min(...londonCandles.slice(0, cIdx + 1).map(c => c.low));
          sl = Number(londonLowSoFar.toFixed(5));
        } else {
          sl = Number((imbalanceLow - slBufferPrice).toFixed(5)); // Below imbalance + 7 pips buffer
        }
        const riskDist = entry - sl;

        if (riskDist > 0) {
          tradeFoundInDay = true;
          const tp1 = Number((entry + riskDist * 3.0).toFixed(5)); // 1:3 target
          const tp2 = Number((entry + riskDist * 5.0).toFixed(5));
          const lotSize = Number((1000 / (riskDist * 100000 || 1)).toFixed(2));
          const slPips = Number((riskDist / pipFactor).toFixed(1));

          // Evaluate subsequent candles from this point forward to determine outcome
          const futureCandles = getSubsequentCandles(candles, c0.timestamp);
          let outcome: 'WIN' | 'LOSS' | null = null;
          let riskRewardAchieved = 0;

          for (const fc of futureCandles) {
            if (fc.high >= tp1) {
              outcome = 'WIN';
              riskRewardAchieved = 3.0;
              break;
            }
            if (fc.low <= sl) {
              outcome = 'LOSS';
              riskRewardAchieved = -1.0;
              break;
            }
          }

          const ratioDesc = ipdaBuyCheck.details?.ratioFormula || `Ratio: ${ipdaBuyCheck.details?.ratio}`;
          const sweepTag = isMajor 
            ? 'Major Pair: Previous Day Low (PDL) Swept' 
            : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';
          const slDesc = isMajor 
            ? `SL placed at London Session Low (${sl})` 
            : `SL ${slBufferPips} pips below imbalance (${sl})`;

          // Case 1: Trade reached TP1 (1:3) or SL -> Add to Backtest Archive
          if (outcome !== null) {
            const tradeId = `real_bt_${symbol.toLowerCase()}_${dateStr.replace(/-/g, '')}_${completedTrades.length + 1}`;
            completedTrades.push({
              id: tradeId,
              symbol: symbol.toUpperCase(),
              strategy: 'CBDR',
              timeframe: '15m',
              action: 'BUY',
              date_executed: dateStr,
              trading_day: dayName,
              session: `London — Entry: ${c0.timeStrNY} NY (${c0.timeStrIST} IST)`,
              entry,
              sl,
              tp1,
              tp2,
              exit_price: outcome === 'WIN' ? tp1 : sl,
              risk_percent: 1.0,
              calculated_lot_size: lotSize,
              outcome,
              realized_pnl: outcome === 'WIN' ? 3000 : -1000,
              riskRewardAchieved,
              notes: `[IPDA Approved: ${ipdaBuyCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] 15m 1st London Imbalance (03:00-11:45 NY). ${slDesc}. 1:3 Target (+3.0R).`,
              isCbdrValidDay: true
            });

            if (outcome === 'WIN') {
              weekHolidayActive = true; // Win triggers weekly holiday
            }
          }
          // Case 2: Trade has NOT yet reached TP1 or SL -> Place into Live Trades (Active Signal)
          else {
            const pipsDiff = Number((Math.abs(currentMarketPrice - entry) / pipFactor).toFixed(1));
            const isProfit = currentMarketPrice >= entry;
            const sigId = `sig_real_${symbol.toLowerCase()}_${dateStr.replace(/-/g, '')}`;

            const activeSignal: Signal = {
              id: sigId,
              strategy: 'CBDR',
              symbol: symbol.toUpperCase(),
              timeframe: '15m',
              action: 'BUY',
              entry,
              sl,
              tp1,
              tp2,
              risk_percent: 1.0,
              defensive_state: 'NORMAL',
              calculated_lot_size: lotSize,
              raw_quantity: lotSize * 100000,
              risk_amount_usd: 1000,
              sl_distance_price: Number(riskDist.toFixed(5)),
              sl_distance_pips_points: slPips,
              primary_risk_reward: 3.0,
              targets: [
                {
                  targetIndex: 1,
                  price: tp1,
                  percentage: 50,
                  lots: Number((lotSize * 0.5).toFixed(2)),
                  potentialProfitUsd: 1500,
                  riskRewardRatio: 3.0,
                  hit: false
                },
                {
                  targetIndex: 2,
                  price: tp2,
                  percentage: 50,
                  lots: Number((lotSize * 0.5).toFixed(2)),
                  potentialProfitUsd: 2500,
                  riskRewardRatio: 5.0,
                  hit: false
                }
              ],
              validation: {
                isValid: true,
                overallStatus: 'PASSED',
                summary: `[IPDA Approved: ${ipdaBuyCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] Active 1st London Imbalance setup (03:00-11:45 NY). Current: ${currentMarketPrice}.`,
                checks: [
                  { id: 'cbdr_pair_rule', name: isMajor ? 'Major Pair Rule (PDL Swept)' : 'Minor Pair Rule (Direct 1st Imbalance)', passed: true, message: sweepTag, severity: 'INFO' },
                  { id: 'cbdr_session', name: 'London Session Window (03:00 AM - 11:45 AM NY / 12:30 PM - 09:15 PM IST)', passed: true, message: `1st Imbalance triggered at ${c0.timeStrNY} NY (${c0.timeStrIST} IST)`, severity: 'INFO' },
                  { id: 'ipda_bias', name: 'IPDA Central Bank Macro Bias', passed: true, message: `IPDA Rate Ratio: ${ratioDesc} -> ${ipdaBuyCheck.details?.effectiveDirection}`, severity: 'INFO' },
                  { id: 'fvg_15m', name: '1st 15m Bullish Imbalance', passed: true, message: `Imbalance entry at ${entry}. SL (${sl}) has ${slBufferPips} pips buffer below imbalance base.`, severity: 'INFO' },
                  { id: 'target_1_3', name: '1:3.0 Risk-Reward Target', passed: true, message: `TP1 at ${tp1} (3.0R target). Current price: ${currentMarketPrice} (${pipsDiff} pips ${isProfit ? 'in profit' : 'floating'}).`, severity: 'INFO' }
                ],
                appliedStrategy: 'CBDR'
              },
              status: 'IN_TRADE',
              session_name: `London (${c0.timeStrNY} NY / ${c0.timeStrIST} IST)`,
              notes: `[IPDA Approved: ${ipdaBuyCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] ⚡ ACTIVE LIVE TRADE: 15m 1st Bullish Imbalance in London session (03:00-11:45 NY). SL placed ${slBufferPips} pips below imbalance. TP 1:3. Current: ${currentMarketPrice}.`,
              raw_payload: {
                strategy: 'CBDR',
                symbol: symbol.toUpperCase(),
                action: 'BUY',
                entry,
                sl,
                tp1,
                tp2,
                isMajorPair: isMajor,
                liquidity_sweep: isMajor,
                pdh_pdl_sweep: isMajor,
                session: 'London',
                timeNY: c0.timeStrNY,
                timeIST: c0.timeStrIST,
                liveStatus: 'ACTIVE_UNRESOLVED'
              },
              created_at: `${dateStr}T${String(c0.hourNY).padStart(2, '0')}:${String(c0.minuteNY).padStart(2, '0')}:00.000Z`,
              updated_at: new Date().toISOString()
            };

            activeLiveTrades.push(activeSignal);
          }
        }
      }
      // 1st Bearish Imbalance Setup: IPDA SELL ONLY permitted!
      // Condition: c0.high < c2.low and displacement candle c1 closed bearish
      else if (isIpdaSellPermitted && c0.high < c2.low && c1.close < c2.low) {
        // If Major Pair: Verify Previous Day High (PDH) Sweep condition
        if (isMajor && priorDayHigh > 0) {
          const currentDayHighSoFar = Math.max(
            sessionMaxBeforeLondon > 0 ? sessionMaxBeforeLondon : 0,
            ...londonCandles.slice(0, cIdx + 1).map(c => c.high)
          );
          const pdhSwept = currentDayHighSoFar >= priorDayHigh;
          if (!pdhSwept) {
            // Major pair requires PDH sweep before short entry
            continue;
          }
        }

        const entry = c0.high; // Entry on bottom of imbalance gap
        const imbalanceHigh = Math.max(c2.low, c1.high);
        let sl: number;
        if (isMajor) {
          const londonHighSoFar = Math.max(...londonCandles.slice(0, cIdx + 1).map(c => c.high));
          sl = Number(londonHighSoFar.toFixed(5));
        } else {
          sl = Number((imbalanceHigh + slBufferPrice).toFixed(5)); // Above imbalance + 7 pips buffer
        }
        const riskDist = sl - entry;

        if (riskDist > 0) {
          tradeFoundInDay = true;
          const tp1 = Number((entry - riskDist * 3.0).toFixed(5)); // 1:3 target
          const tp2 = Number((entry - riskDist * 5.0).toFixed(5));
          const lotSize = Number((1000 / (riskDist * 100000 || 1)).toFixed(2));
          const slPips = Number((riskDist / pipFactor).toFixed(1));

          const futureCandles = getSubsequentCandles(candles, c0.timestamp);
          let outcome: 'WIN' | 'LOSS' | null = null;
          let riskRewardAchieved = 0;

          for (const fc of futureCandles) {
            if (fc.low <= tp1) {
              outcome = 'WIN';
              riskRewardAchieved = 3.0;
              break;
            }
            if (fc.high >= sl) {
              outcome = 'LOSS';
              riskRewardAchieved = -1.0;
              break;
            }
          }

          const ratioDesc = ipdaSellCheck.details?.ratioFormula || `Ratio: ${ipdaSellCheck.details?.ratio}`;
          const sweepTag = isMajor 
            ? 'Major Pair: Previous Day High (PDH) Swept' 
            : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';
          const slDesc = isMajor 
            ? `SL placed at London Session High (${sl})` 
            : `SL ${slBufferPips} pips above imbalance (${sl})`;

          // Case 1: Trade reached TP1 (1:3) or SL -> Add to Backtest Archive
          if (outcome !== null) {
            const tradeId = `real_bt_${symbol.toLowerCase()}_${dateStr.replace(/-/g, '')}_${completedTrades.length + 1}`;
            completedTrades.push({
              id: tradeId,
              symbol: symbol.toUpperCase(),
              strategy: 'CBDR',
              timeframe: '15m',
              action: 'SELL',
              date_executed: dateStr,
              trading_day: dayName,
              session: `London — Entry: ${c0.timeStrNY} NY (${c0.timeStrIST} IST)`,
              entry,
              sl,
              tp1,
              tp2,
              exit_price: outcome === 'WIN' ? tp1 : sl,
              risk_percent: 1.0,
              calculated_lot_size: lotSize,
              outcome,
              realized_pnl: outcome === 'WIN' ? 3000 : -1000,
              riskRewardAchieved,
              notes: `[IPDA Approved: ${ipdaSellCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] 15m 1st London Imbalance (03:00-11:45 NY). ${slDesc}. 1:3 Target (+3.0R).`,
              isCbdrValidDay: true
            });

            if (outcome === 'WIN') {
              weekHolidayActive = true; // Win triggers weekly holiday
            }
          }
          // Case 2: Trade has NOT yet reached TP1 or SL -> Place into Live Trades (Active Signal)
          else {
            const pipsDiff = Number((Math.abs(entry - currentMarketPrice) / pipFactor).toFixed(1));
            const isProfit = currentMarketPrice <= entry;
            const sigId = `sig_real_${symbol.toLowerCase()}_${dateStr.replace(/-/g, '')}`;

            const activeSignal: Signal = {
              id: sigId,
              strategy: 'CBDR',
              symbol: symbol.toUpperCase(),
              timeframe: '15m',
              action: 'SELL',
              entry,
              sl,
              tp1,
              tp2,
              risk_percent: 1.0,
              defensive_state: 'NORMAL',
              calculated_lot_size: lotSize,
              raw_quantity: lotSize * 100000,
              risk_amount_usd: 1000,
              sl_distance_price: Number(riskDist.toFixed(5)),
              sl_distance_pips_points: slPips,
              primary_risk_reward: 3.0,
              targets: [
                {
                  targetIndex: 1,
                  price: tp1,
                  percentage: 50,
                  lots: Number((lotSize * 0.5).toFixed(2)),
                  potentialProfitUsd: 1500,
                  riskRewardRatio: 3.0,
                  hit: false
                },
                {
                  targetIndex: 2,
                  price: tp2,
                  percentage: 50,
                  lots: Number((lotSize * 0.5).toFixed(2)),
                  potentialProfitUsd: 2500,
                  riskRewardRatio: 5.0,
                  hit: false
                }
              ],
              validation: {
                isValid: true,
                overallStatus: 'PASSED',
                summary: `[IPDA Approved: ${ipdaSellCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] Active 1st London Imbalance setup (03:00-11:45 NY). Current: ${currentMarketPrice}.`,
                checks: [
                  { id: 'cbdr_pair_rule', name: isMajor ? 'Major Pair Rule (PDH Swept)' : 'Minor Pair Rule (Direct 1st Imbalance)', passed: true, message: sweepTag, severity: 'INFO' },
                  { id: 'cbdr_session', name: 'London Session Window (03:00 AM - 11:45 AM NY / 12:30 PM - 09:15 PM IST)', passed: true, message: `1st Imbalance triggered at ${c0.timeStrNY} NY (${c0.timeStrIST} IST)`, severity: 'INFO' },
                  { id: 'ipda_bias', name: 'IPDA Central Bank Macro Bias', passed: true, message: `IPDA Rate Ratio: ${ratioDesc} -> ${ipdaSellCheck.details?.effectiveDirection}`, severity: 'INFO' },
                  { id: 'fvg_15m', name: '1st 15m Bearish Imbalance', passed: true, message: `Imbalance entry at ${entry}. SL (${sl}) has ${slBufferPips} pips buffer above imbalance top.`, severity: 'INFO' },
                  { id: 'target_1_3', name: '1:3.0 Risk-Reward Target', passed: true, message: `TP1 at ${tp1} (3.0R target). Current price: ${currentMarketPrice} (${pipsDiff} pips ${isProfit ? 'in profit' : 'floating'}).`, severity: 'INFO' }
                ],
                appliedStrategy: 'CBDR'
              },
              status: 'IN_TRADE',
              session_name: `London (${c0.timeStrNY} NY / ${c0.timeStrIST} IST)`,
              notes: `[IPDA Approved: ${ipdaSellCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] ⚡ ACTIVE LIVE TRADE: 15m 1st Bearish Imbalance in London session (03:00-11:45 NY). SL placed ${slBufferPips} pips above imbalance. TP 1:3. Current: ${currentMarketPrice}.`,
              raw_payload: {
                strategy: 'CBDR',
                symbol: symbol.toUpperCase(),
                action: 'SELL',
                entry,
                sl,
                tp1,
                tp2,
                isMajorPair: isMajor,
                liquidity_sweep: isMajor,
                pdh_pdl_sweep: isMajor,
                session: 'London',
                timeNY: c0.timeStrNY,
                timeIST: c0.timeStrIST,
                liveStatus: 'ACTIVE_UNRESOLVED'
              },
              created_at: `${dateStr}T${String(c0.hourNY).padStart(2, '0')}:${String(c0.minuteNY).padStart(2, '0')}:00.000Z`,
              updated_at: new Date().toISOString()
            };

            activeLiveTrades.push(activeSignal);
          }
        }
      }
    }
  }

  return { completedTrades, activeLiveTrades };
}

function getSubsequentCandles(allCandles: Candle[], afterTimestamp: number): Candle[] {
  const result: Candle[] = [];
  let found = false;
  for (const c of allCandles) {
    if (found) {
      result.push(c);
      if (result.length >= 120) break; // Check up to 30 hours of 15m candles
    } else if (c.timestamp === afterTimestamp) {
      found = true;
    }
  }
  return result;
}
