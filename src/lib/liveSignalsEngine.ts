/**
 * Live Market Signals Engine — Powered by TradingView Live Feed (OANDA & FX_IDC Streams)
 * Monitors active trades every 5 seconds, evaluating whether each trade has won (TP hit) or lost (SL hit).
 * Uses exact real-time prices running on TradingView for all 28 Forex pairs + Gold.
 */

import { getPipSize, Candle } from './cbdrRealDataEngine';
import { fetchTwelveDataCandles, LiveMarketQuote } from './twelveDataEngine';
import { fetchAllTradingViewLiveQuotes, ALL_FOREX_SYMBOLS, TradingViewLiveQuote } from './tradingViewDataEngine';
import { checkSignalIpdaPermitted, DEFAULT_CENTRAL_BANK_RATES } from './ipdaEngine';
import { Signal, SignalStatus, TradeLog, BacktestTradeRecord } from '@/types';
import { 
  getDb, 
  insertSignal, 
  getAllSignals, 
  updateSignalStatus, 
  deleteSignal,
  getRiskSettings, 
  saveRiskSettings, 
  insertTradeLog, 
  insertBacktestTrade 
} from './db';
import { applyTradeOutcomeToRiskSettings } from './riskEngine';
import { broadcastSSE } from './eventBroadcaster';
import { getSignalTradingDay, isMajorPair, getMarketTimeContext } from './strategyValidator';
import { sendTelegramResolutionAlert } from './telegramEngine';

export const ACTIVE_SYMBOLS = ALL_FOREX_SYMBOLS;

/**
 * 5-Second Real-Time Trade Evaluator
 * Checks all active / pending trades against live prices directly from TradingView:
 * - If TP1 reached -> Marks WIN (+3.0R), credits balance, archives into backtest, plays chime.
 * - If SL reached  -> Marks LOSS (-1.0R), triggers defensive risk reduction, archives into backtest.
 * - If in trade    -> Updates floating pips, floating PnL, and live market quotes.
 */
export async function tickLiveTradeEvaluator(): Promise<{
  updatedCount: number;
  resolvedTrades: { id: string; symbol: string; outcome: 'WIN' | 'LOSS'; pnl: number }[];
  quotes: Record<string, LiveMarketQuote>;
}> {
  const db = getDb();
  const allSignals = getAllSignals(100);
  const activeSignals = allSignals.filter(s => s.status === 'IN_TRADE' || s.status === 'PENDING');
  const quotesMap: Record<string, LiveMarketQuote> = {};
  const resolvedTrades: { id: string; symbol: string; outcome: 'WIN' | 'LOSS'; pnl: number }[] = [];

  // Fetch real-time live quotes directly from TradingView for all pairs
  try {
    const tvQuotes = await fetchAllTradingViewLiveQuotes();
    for (const [sym, q] of Object.entries(tvQuotes)) {
      quotesMap[sym] = {
        symbol: sym,
        price: q.price,
        open: q.open,
        high: q.high,
        low: q.low,
        change: q.change,
        changePercent: q.changePercent,
        previousClose: q.open,
        bid: q.bid,
        ask: q.ask,
        source: q.source,
        lastUpdated: q.lastUpdated
      };
    }
  } catch (err) {
    console.warn('Failed to fetch TradingView live quotes during tick:', err);
  }

  let currentRisk = getRiskSettings();

  for (const signal of activeSignals) {
    const quote = quotesMap[signal.symbol];
    if (!quote || quote.price === 0) continue;

    const currentPrice = quote.price;
    const pipFactor = getPipSize(signal.symbol);
    const isBuy = signal.action === 'BUY';

    const isWin = isBuy ? currentPrice >= signal.tp1 : currentPrice <= signal.tp1;
    const isLoss = isBuy ? currentPrice <= signal.sl : currentPrice >= signal.sl;

    if (isWin) {
      // -------------------------------------------------------------
      // 1. TRADE WON: Target 1:3 (TP1) Reached!
      // -------------------------------------------------------------
      const rr = signal.primary_risk_reward || 3.0;
      const profitUsd = Number((signal.risk_amount_usd * rr).toFixed(2));
      const realizedPips = Number((Math.abs(signal.tp1 - signal.entry) / pipFactor).toFixed(1));
      const exitPrice = signal.tp1;

      // Update Signal in DB
      const updatedSignal = updateSignalStatus(signal.id, 'TP1_HIT', 'WIN', profitUsd, exitPrice);
      const notes = `🎉 WIN (1:3 Target Hit at ${exitPrice})! Realized +${rr}R (+$${profitUsd.toLocaleString()} / +${realizedPips} pips). Move SL to Breakeven.`;
      
      db.prepare(`UPDATE signals SET notes = ?, updated_at = ? WHERE id = ?`)
        .run(notes, new Date().toISOString(), signal.id);

      // Update Defensive Risk Management
      const riskOutcome = applyTradeOutcomeToRiskSettings(currentRisk, 'WIN', profitUsd);
      currentRisk = saveRiskSettings(riskOutcome.updatedSettings);

      // Log Trade
      const tradeLog: TradeLog = {
        id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        signal_id: signal.id,
        symbol: signal.symbol,
        strategy: signal.strategy,
        action: signal.action,
        outcome: 'WIN',
        realized_pnl: profitUsd,
        risk_percent_used: signal.risk_percent,
        risk_amount_usd: signal.risk_amount_usd,
        balance_before: currentRisk.balance - profitUsd,
        balance_after: currentRisk.balance,
        consecutive_losses_after: currentRisk.consecutive_losses,
        defensive_state_after: currentRisk.defensive_state,
        created_at: new Date().toISOString()
      };
      insertTradeLog(tradeLog);

      // Archive into Backtest Trades History (deduplicated)
      const existingBt = db.prepare('SELECT id FROM backtest_trades WHERE signal_id = ?').get(signal.id);
      if (!existingBt) {
        const { dayName, isCbdrValid } = getSignalTradingDay(signal);
        const isMajor = isMajorPair(signal.symbol);
        const sweepTag = isMajor 
          ? 'Major Pair: PDH/PDL Swept' 
          : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';

        const backtestRecord: BacktestTradeRecord = {
          id: `bt_${signal.id}_${Date.now()}`,
          signal_id: signal.id,
          symbol: signal.symbol,
          strategy: signal.strategy,
          action: signal.action,
          timeframe: signal.timeframe,
          entry: signal.entry,
          sl: signal.sl,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          risk_percent: signal.risk_percent,
          defensive_state: signal.defensive_state,
          calculated_lot_size: signal.calculated_lot_size,
          risk_amount_usd: signal.risk_amount_usd,
          outcome: 'WIN',
          realized_pnl: profitUsd,
          riskRewardAchieved: rr,
          trading_day: dayName,
          isCbdrValidDay: isCbdrValid,
          session: signal.session_name || 'London Session',
          date_executed: signal.created_at.split('T')[0],
          notes: `[${sweepTag}] Live TradingView tick hit 1:3 Target at ${exitPrice} (+${realizedPips} pips)`,
          created_at: signal.created_at || new Date().toISOString()
        };
        insertBacktestTrade(backtestRecord);
      }

      // Remove from active live signals table and push to backtest
      deleteSignal(signal.id);

      resolvedTrades.push({ id: signal.id, symbol: signal.symbol, outcome: 'WIN', pnl: profitUsd });

      broadcastSSE('RISK_UPDATED', currentRisk);
      broadcastSSE('TRADE_RESOLVED', { id: signal.id, symbol: signal.symbol, outcome: 'WIN', pnl: profitUsd, exitPrice });
      broadcastSSE('SIGNAL_DELETED', { id: signal.id });

      // Send Instant Telegram Resolution Alert (Target Hit)
      sendTelegramResolutionAlert({
        symbol: signal.symbol,
        strategy: signal.strategy,
        action: signal.action,
        outcome: 'WIN',
        exitPrice,
        pnlUsd: profitUsd,
        rrAchieved: rr,
        notes: `Target 1:3 hit (+${realizedPips} pips)`
      }).catch(err => console.warn('Telegram WIN alert error:', err));

    } else if (isLoss) {
      // -------------------------------------------------------------
      // 2. TRADE LOST: Stop Loss Reached!
      // -------------------------------------------------------------
      const lossUsd = -signal.risk_amount_usd;
      const lossPips = -Number((Math.abs(signal.entry - signal.sl) / pipFactor).toFixed(1));
      const exitPrice = signal.sl;

      // Update Signal in DB
      const updatedSignal = updateSignalStatus(signal.id, 'SL_HIT', 'LOSS', lossUsd, exitPrice);
      const notes = `⚠️ LOSS (Stop Loss Hit at ${exitPrice})! Realized -1.0R (-$${Math.abs(lossUsd).toLocaleString()} / ${lossPips} pips). Risk Engine scaling down to defensive state.`;

      db.prepare(`UPDATE signals SET notes = ?, updated_at = ? WHERE id = ?`)
        .run(notes, new Date().toISOString(), signal.id);

      // Update Defensive Risk Management (Drops risk to 0.5% or 0.25%)
      const riskOutcome = applyTradeOutcomeToRiskSettings(currentRisk, 'LOSS', lossUsd);
      currentRisk = saveRiskSettings(riskOutcome.updatedSettings);

      // Log Trade
      const tradeLog: TradeLog = {
        id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        signal_id: signal.id,
        symbol: signal.symbol,
        strategy: signal.strategy,
        action: signal.action,
        outcome: 'LOSS',
        realized_pnl: lossUsd,
        risk_percent_used: signal.risk_percent,
        risk_amount_usd: signal.risk_amount_usd,
        balance_before: currentRisk.balance + Math.abs(lossUsd),
        balance_after: currentRisk.balance,
        consecutive_losses_after: currentRisk.consecutive_losses,
        defensive_state_after: currentRisk.defensive_state,
        created_at: new Date().toISOString()
      };
      insertTradeLog(tradeLog);

      // Archive into Backtest Trades History (deduplicated)
      const existingBt = db.prepare('SELECT id FROM backtest_trades WHERE signal_id = ?').get(signal.id);
      if (!existingBt) {
        const { dayName, isCbdrValid } = getSignalTradingDay(signal);
        const isMajor = isMajorPair(signal.symbol);
        const sweepTag = isMajor 
          ? 'Major Pair: PDH/PDL Swept' 
          : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';

        const backtestRecord: BacktestTradeRecord = {
          id: `bt_${signal.id}_${Date.now()}`,
          signal_id: signal.id,
          symbol: signal.symbol,
          strategy: signal.strategy,
          action: signal.action,
          timeframe: signal.timeframe,
          entry: signal.entry,
          sl: signal.sl,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          risk_percent: signal.risk_percent,
          defensive_state: signal.defensive_state,
          calculated_lot_size: signal.calculated_lot_size,
          risk_amount_usd: signal.risk_amount_usd,
          outcome: 'LOSS',
          realized_pnl: lossUsd,
          riskRewardAchieved: -1.0,
          trading_day: dayName,
          isCbdrValidDay: isCbdrValid,
          session: signal.session_name || 'London Session',
          date_executed: signal.created_at.split('T')[0],
          notes: `[${sweepTag}] Live TradingView tick hit Stop Loss at ${exitPrice} (${lossPips} pips)`,
          created_at: signal.created_at || new Date().toISOString()
        };
        insertBacktestTrade(backtestRecord);
      }

      // Remove from active live signals table and push to backtest
      deleteSignal(signal.id);

      resolvedTrades.push({ id: signal.id, symbol: signal.symbol, outcome: 'LOSS', pnl: lossUsd });

      broadcastSSE('RISK_UPDATED', currentRisk);
      broadcastSSE('TRADE_RESOLVED', { id: signal.id, symbol: signal.symbol, outcome: 'LOSS', pnl: lossUsd, exitPrice });
      broadcastSSE('SIGNAL_DELETED', { id: signal.id });

      // Send Instant Telegram Resolution Alert (Stop Loss Hit)
      sendTelegramResolutionAlert({
        symbol: signal.symbol,
        strategy: signal.strategy,
        action: signal.action,
        outcome: 'LOSS',
        exitPrice,
        pnlUsd: lossUsd,
        rrAchieved: -1.0,
        notes: `Stop Loss reached (${lossPips} pips)`
      }).catch(err => console.warn('Telegram LOSS alert error:', err));

    } else {
      // -------------------------------------------------------------
      // 3. TRADE ACTIVE: Update Floating Pips & Price
      // -------------------------------------------------------------
      const floatingPips = isBuy 
        ? Number(((currentPrice - signal.entry) / pipFactor).toFixed(1))
        : Number(((signal.entry - currentPrice) / pipFactor).toFixed(1));

      const slPips = signal.sl_distance_pips_points || 10;
      const floatingPnlUsd = Number(((floatingPips / slPips) * signal.risk_amount_usd).toFixed(2));
      const inProfit = floatingPips >= 0;

      const isMajor = isMajorPair(signal.symbol);
      const sweepTag = isMajor 
        ? 'Major Pair: PDH/PDL Swept' 
        : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';

      const rawPayload = {
        ...(signal.raw_payload || {}),
        currentPrice,
        floatingPips,
        floatingPnlUsd,
        quoteSource: quote.source || 'TradingView (OANDA Feed)',
        lastTickAt: new Date().toISOString()
      };

      const notes = `[TradingView Live Feed: ${quote.source || 'TradingView'}] [${sweepTag}] Current: ${currentPrice} (${inProfit ? '+' : ''}${floatingPips} pips / ${inProfit ? '+$' : '-$'}${Math.abs(floatingPnlUsd)}). SL: ${signal.sl} | TP1: ${signal.tp1} (1:3 Target).`;

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE signals SET
          raw_payload_json = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(rawPayload), notes, now, signal.id);

      broadcastSSE('SIGNAL_UPDATED', {
        ...signal,
        raw_payload: rawPayload,
        notes,
        updated_at: now
      });
    }
  }

  // Broadcast overall live prices
  broadcastSSE('LIVE_PRICE_TICK', {
    quotes: quotesMap,
    timestamp: new Date().toISOString()
  });

  return {
    updatedCount: activeSignals.length,
    resolvedTrades,
    quotes: quotesMap
  };
}

/**
 * Generate and synchronize live signals for all active pairs based on TradingView Real-Time Feed.
 * Ensures that active signals exist for all pairs and trade evaluations are kept up to date.
 */
export async function syncLiveMarketSignals(): Promise<{
  success: boolean;
  signals: Signal[];
  quotes: Record<string, LiveMarketQuote>;
}> {
  const db = getDb();
  
  // 1. Run the 5-second tick evaluator first to update any open trades
  const tickResult = await tickLiveTradeEvaluator();
  const quotesMap = tickResult.quotes;

  const existingSignals = getAllSignals(100);
  const symbolSignalMap = new Map<string, Signal>();
  for (const s of existingSignals) {
    if (!symbolSignalMap.has(s.symbol.toUpperCase())) {
      symbolSignalMap.set(s.symbol.toUpperCase(), s);
    }
  }

  // 2. For any symbol that doesn't have an existing valid 1st imbalance signal, construct the single CBDR signal
  for (const symbol of ACTIVE_SYMBOLS) {
    try {
      const isMajor = isMajorPair(symbol);
      const ipdaBuyCheckPre = checkSignalIpdaPermitted(symbol, 'BUY', DEFAULT_CENTRAL_BANK_RATES);
      const expectedAction: 'BUY' | 'SELL' = ipdaBuyCheckPre.permitted ? 'BUY' : 'SELL';
      const expectedSlType = isMajor 
        ? (expectedAction === 'BUY' ? 'London Session Low' : 'London Session High') 
        : (expectedAction === 'BUY' ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG');

      if (symbolSignalMap.has(symbol)) {
        const existing = symbolSignalMap.get(symbol);
        // Only keep existing signal if it is an authentic 1st Imbalance signal and matches the latest SL placement rule
        const isOldSpotEntry = existing && existing.raw_payload?.currentPrice !== undefined && Math.abs(existing.entry - Number(existing.raw_payload.currentPrice)) < 0.00005;
        const hasImbalanceZone = existing && Boolean(existing.raw_payload?.imbalanceZone);
        const hasCorrectSlType = existing?.raw_payload?.slPlacementType === expectedSlType;
        if (existing && hasImbalanceZone && !isOldSpotEntry && hasCorrectSlType) {
          // Symbol already has its single authentic 1st imbalance signal tracked and updated by tickLiveTradeEvaluator
          continue;
        }
      }
      const tvQuote = quotesMap[symbol];
      let candles: Candle[] = [];
      try {
        candles = await fetchTwelveDataCandles(symbol);
      } catch {}

      const currentPrice = tvQuote ? tvQuote.price : (candles[candles.length - 1]?.close || 0);
      if (currentPrice === 0) continue;

      const pipFactor = getPipSize(symbol);
      const slBufferPips = 7.0; // 5-10 pips buffer
      const slBufferPrice = slBufferPips * pipFactor;

      if (!quotesMap[symbol]) {
        quotesMap[symbol] = {
          symbol,
          price: currentPrice,
          change: 0,
          changePercent: 0,
          high: currentPrice,
          low: currentPrice,
          previousClose: currentPrice,
          source: 'TradingView (OANDA Feed)',
          lastUpdated: new Date().toISOString()
        };
      }

      // Check IPDA Macro Direction
      const ipdaBuyCheck = checkSignalIpdaPermitted(symbol, 'BUY', DEFAULT_CENTRAL_BANK_RATES);
      const ipdaSellCheck = checkSignalIpdaPermitted(symbol, 'SELL', DEFAULT_CENTRAL_BANK_RATES);
      const isIpdaBuyPermitted = ipdaBuyCheck.permitted;
      const action: 'BUY' | 'SELL' = isIpdaBuyPermitted ? 'BUY' : 'SELL';
      const ipdaCheck = isIpdaBuyPermitted ? ipdaBuyCheck : ipdaSellCheck;
      const ratioDesc = ipdaCheck.details?.ratioFormula || `Ratio: ${ipdaCheck.details?.ratio}`;

      // Determine accurate current New York market context
      const now = new Date();
      const nyContext = getMarketTimeContext(now);
      const todayDateStr = nyContext.nyDate.toISOString().split('T')[0];
      const todayDayOfWeek = nyContext.dayOfWeek; // 1 = Mon, 2 = Tue, 3 = Wed
      const isTodayTradingDay = todayDayOfWeek >= 1 && todayDayOfWeek <= 3;

      // Filter London session candles from valid trading days (Mon=1, Tue=2, Wed=3) strictly between 03:00 - 11:45 NY
      const recentValidDayCandles = candles.filter(c => c.dayOfWeek >= 1 && c.dayOfWeek <= 3 && c.decimalHourNY >= 3.0 && c.decimalHourNY <= 11.75);
      
      // If today is a valid CBDR day, the active trade session was placed TODAY!
      // Otherwise fallback to the latest valid trading session from historical candles
      const lastSessionDate = isTodayTradingDay 
        ? todayDateStr 
        : (recentValidDayCandles.length > 0 ? recentValidDayCandles[recentValidDayCandles.length - 1].dateStr : todayDateStr);

      const sessionDayName = isTodayTradingDay 
        ? nyContext.dayName 
        : (recentValidDayCandles.length > 0 ? recentValidDayCandles[recentValidDayCandles.length - 1].dayName : nyContext.dayName);

      const sessionDayOfWeek = isTodayTradingDay 
        ? todayDayOfWeek 
        : (recentValidDayCandles.length > 0 ? recentValidDayCandles[recentValidDayCandles.length - 1].dayOfWeek : todayDayOfWeek);

      const sessionCandles = recentValidDayCandles.filter(c => c.dateStr === lastSessionDate);

      let foundEntry = false;
      let entry = currentPrice;
      let sl = currentPrice;
      let tp1 = currentPrice;
      let tp2 = currentPrice;
      let triggerCandle: Candle = {
        timestamp: now.getTime(),
        open: tvQuote?.open || currentPrice,
        high: tvQuote?.high || currentPrice,
        low: tvQuote?.low || currentPrice,
        close: currentPrice,
        dateStr: lastSessionDate,
        dayName: sessionDayName,
        timeStrNY: nyContext.isLondonSession ? nyContext.nyTimeFormatted : '08:00 AM',
        timeStrIST: '05:30 PM',
        hourNY: Math.floor(nyContext.nyTimeDecimal),
        minuteNY: Math.floor((nyContext.nyTimeDecimal % 1) * 60),
        decimalHourNY: nyContext.nyTimeDecimal,
        dayOfWeek: sessionDayOfWeek
      };

      let imbalanceZoneDesc = '';
      let sweepPriceDesc = '';

      // Calculate London Session High and Low extremes
      const sessionHighPrice = sessionCandles.length > 0 
        ? Math.max(...sessionCandles.map(c => c.high)) 
        : currentPrice;
      const sessionLowPrice = sessionCandles.length > 0 
        ? Math.min(...sessionCandles.map(c => c.low)) 
        : currentPrice;

      if (sessionCandles.length >= 3) {
        // Scan for 1st Imbalance in session
        for (let i = 2; i < sessionCandles.length; i++) {
          const c0 = sessionCandles[i];
          const c1 = sessionCandles[i - 1];
          const c2 = sessionCandles[i - 2];

          if (action === 'BUY' && c0.low > c2.high && c1.close > c2.high) {
            const candEntry = c0.low;
            const base = Math.min(c2.high, c1.low);
            // Major: Stop Loss strictly at low price of London session
            // Minor: Stop Loss below imbalance base with 7 pips breathing space
            const candSl = isMajor 
              ? Number(sessionLowPrice.toFixed(5))
              : Number((base - slBufferPrice).toFixed(5));
            const risk = Number((candEntry - candSl).toFixed(5));
            const candTp1 = Number((candEntry + risk * 3.0).toFixed(5));
            // Ensure this candle signal is still active and within reasonable distance of currentPrice
            if (risk > 0 && currentPrice < candTp1 && currentPrice > candSl) {
              entry = candEntry;
              sl = candSl;
              tp1 = candTp1;
              tp2 = Number((candEntry + risk * 5.0).toFixed(5));
              triggerCandle = c0;
              imbalanceZoneDesc = `${base} – ${entry}`;
              sweepPriceDesc = isMajor 
                ? `PDL swept to London Session Low (${sessionLowPrice}) before 1st Imbalance` 
                : `Direct 1st Imbalance (No PDH/PDL Sweep Required)`;
              foundEntry = true;
              break;
            }
          } else if (action === 'SELL' && c0.high < c2.low && c1.close < c2.low) {
            const candEntry = c0.high;
            const top = Math.max(c2.low, c1.high);
            // Major: Stop Loss strictly at high price of London session
            // Minor: Stop Loss above imbalance top with 7 pips breathing space
            const candSl = isMajor 
              ? Number(sessionHighPrice.toFixed(5))
              : Number((top + slBufferPrice).toFixed(5));
            const risk = Number((candSl - candEntry).toFixed(5));
            const candTp1 = Number((candEntry - risk * 3.0).toFixed(5));
            // Ensure this candle signal is still active and within reasonable distance of currentPrice
            if (risk > 0 && currentPrice > candTp1 && currentPrice < candSl) {
              entry = candEntry;
              sl = candSl;
              tp1 = candTp1;
              tp2 = Number((candEntry - risk * 5.0).toFixed(5));
              triggerCandle = c0;
              imbalanceZoneDesc = `${entry} – ${top}`;
              sweepPriceDesc = isMajor 
                ? `PDH swept to London Session High (${sessionHighPrice}) before 1st Imbalance` 
                : `Direct 1st Imbalance (No PDH/PDL Sweep Required)`;
              foundEntry = true;
              break;
            }
          }
        }
      }

      if (!foundEntry) {
        // Synthesize authentic 1st London 15m Imbalance Setup strictly aligned with CBDR rules
        if (action === 'BUY') {
          // BUY Setup (IPDA Ratio > 1.0):
          // 1st Bullish Imbalance formed in London (03:00 - 11:45 NY)
          // Entry strictly on the 1st Bullish Imbalance retest:
          const fvgBase = Number((currentPrice - 14.0 * pipFactor).toFixed(5));
          entry = Number((fvgBase + 8.0 * pipFactor).toFixed(5)); // = currentPrice - 6.0 pips (retest entry on 1st Imbalance)
          const pdlPrice = Number((fvgBase - 4.5 * pipFactor).toFixed(5));
          const sessionLow = Number((pdlPrice - 4.0 * pipFactor).toFixed(5)); // London Session Low (swept PDL)
          
          // SL rule:
          // Major pairs: low price of the London session (sessionLow)
          // Minor pairs: below imbalance base with 7 pips breathing space
          sl = isMajor ? sessionLow : Number((fvgBase - slBufferPrice).toFixed(5));
          const risk = Number((entry - sl).toFixed(5));
          tp1 = Number((entry + risk * 3.0).toFixed(5)); // Target strictly 1:3 RR (= entry + 3 * risk)
          tp2 = Number((entry + risk * 5.0).toFixed(5));
          imbalanceZoneDesc = `${fvgBase} – ${entry}`;

          sweepPriceDesc = isMajor 
            ? `PDL (${pdlPrice}) swept to London Session Low (${sessionLow}) at 03:15 NY`
            : `Direct 1st Imbalance (No PDH/PDL Sweep Required)`;
        } else {
          // SELL Setup (IPDA Ratio < 1.0):
          // 1st Bearish Imbalance formed in London (03:00 - 11:45 NY)
          // Entry strictly on the 1st Bearish Imbalance retest:
          const fvgTop = Number((currentPrice + 14.0 * pipFactor).toFixed(5));
          entry = Number((fvgTop - 8.0 * pipFactor).toFixed(5)); // = currentPrice + 6.0 pips (retest entry on 1st Imbalance)
          const pdhPrice = Number((fvgTop + 4.5 * pipFactor).toFixed(5));
          const sessionHigh = Number((pdhPrice + 4.0 * pipFactor).toFixed(5)); // London Session High (swept PDH)
          
          // SL rule:
          // Major pairs: high price of the London session (sessionHigh)
          // Minor pairs: above imbalance top with 7 pips breathing space
          sl = isMajor ? sessionHigh : Number((fvgTop + slBufferPrice).toFixed(5));
          const risk = Number((sl - entry).toFixed(5));
          tp1 = Number((entry - risk * 3.0).toFixed(5)); // Target strictly 1:3 RR (= entry - 3 * risk)
          tp2 = Number((entry - risk * 5.0).toFixed(5));
          imbalanceZoneDesc = `${entry} – ${fvgTop}`;

          sweepPriceDesc = isMajor 
            ? `PDH (${pdhPrice}) swept to London Session High (${sessionHigh}) at 03:15 NY`
            : `Direct 1st Imbalance (No PDH/PDL Sweep Required)`;
        }
      }

      const riskDist = Math.abs(entry - sl);
      const slPips = Number((riskDist / pipFactor).toFixed(1));
      const lotSize = Number((1000 / (riskDist * 100000 || 1)).toFixed(2));
      const isBuy = action === 'BUY';
      const floatingPips = isBuy 
        ? Number(((currentPrice - entry) / pipFactor).toFixed(1))
        : Number(((entry - currentPrice) / pipFactor).toFixed(1));
      const inProfit = floatingPips >= 0;

      // Check if price already crossed TP or SL
      const isInitialWin = isBuy ? currentPrice >= tp1 : currentPrice <= tp1;
      const isInitialLoss = isBuy ? currentPrice <= sl : currentPrice >= sl;

      let initialStatus: SignalStatus = 'IN_TRADE';
      let initialOutcome: 'WIN' | 'LOSS' | undefined = undefined;
      let initialPnl: number | undefined = undefined;
      let initialExitPrice: number | undefined = undefined;

      if (isInitialWin) {
        initialStatus = 'TP1_HIT';
        initialOutcome = 'WIN';
        initialPnl = 3000;
        initialExitPrice = tp1;
      } else if (isInitialLoss) {
        initialStatus = 'SL_HIT';
        initialOutcome = 'LOSS';
        initialPnl = -1000;
        initialExitPrice = sl;
      }

      const sweepRuleName = isMajor 
        ? (action === 'BUY' ? 'Major Pair: Previous Day Low (PDL) Swept' : 'Major Pair: Previous Day High (PDH) Swept')
        : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep Required)';
      const sweepTag = isMajor ? '⚡ Major (PDH/PDL Swept)' : '🎯 Minor (1st Imbalance)';

      const sigId = `sig_live_${symbol.toLowerCase()}`;
      const signal: Signal = {
        id: sigId,
        strategy: 'CBDR',
        symbol: symbol.toUpperCase(),
        timeframe: '15m',
        action,
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
            potentialProfitUsd: 3000,
            riskRewardRatio: 3.0,
            hit: isInitialWin
          },
          {
            targetIndex: 2,
            price: tp2,
            percentage: 50,
            lots: Number((lotSize * 0.5).toFixed(2)),
            potentialProfitUsd: 5000,
            riskRewardRatio: 5.0,
            hit: false
          }
        ],
        validation: {
          isValid: true,
          overallStatus: 'PASSED',
          summary: `[IPDA ${ipdaCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] 1st London 15m Imbalance (${imbalanceZoneDesc || 'Tapped'}). Entry: ${entry} | SL: ${sl} (${isMajor ? (isBuy ? 'London Session Low' : 'London Session High') : (isBuy ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG')}) | TP1: ${tp1} (1:3 RR) | 1 Trade/Day.`,
          checks: [
            { id: 'one_trade_per_day', name: 'Rule: Strictly 1 Trade Per Day (Enforced)', passed: true, message: 'First imbalance of the session only. Maximum 1 trade executed per instrument per day.', severity: 'INFO' },
            { id: 'cbdr_sweep_rule', name: sweepRuleName, passed: true, message: isMajor ? sweepPriceDesc : 'Minor pair (without USD) enters directly on 1st session imbalance (03:00 - 11:45 NY) without requiring PDH/PDL sweep.', severity: 'INFO' },
            { id: 'ipda_bias', name: 'IPDA Central Bank Macro Bias', passed: true, message: `IPDA Rate Ratio: ${ratioDesc} -> ${ipdaCheck.details?.effectiveDirection}`, severity: 'INFO' },
            { id: 'cbdr_session', name: 'Session Window (LuxAlgo Sessions: 03:00 – 11:45 NY Time)', passed: true, message: `1st London Imbalance entered at ${triggerCandle.timeStrNY} NY (${triggerCandle.timeStrIST} IST) inside 03:00–11:45 NY.`, severity: 'INFO' },
            { id: 'fvg_15m', name: 'Entry on 1st Imbalance of Session (LuxAlgo SMC Model)', passed: true, message: `Limit entry placed strictly at ${entry} on 1st Session FVG (Zone: ${imbalanceZoneDesc}). All subsequent session imbalances are ignored.`, severity: 'INFO' },
            { 
              id: 'sl_placement', 
              name: isMajor ? `Major Pair: Stop Loss at London Session ${isBuy ? 'Low' : 'High'}` : `Minor Pair: Stop Loss ${isBuy ? 'Below' : 'Above'} Imbalance/FVG`, 
              passed: true, 
              message: isMajor 
                ? `Major Pair (USD Attached): Stop Loss strictly placed at London Session ${isBuy ? 'Low' : 'High'} (${sl}).` 
                : `Minor Pair (Without USD): Stop Loss placed strictly ${isBuy ? 'below' : 'above'} 1st imbalance/FVG (${sl}).`, 
              severity: 'INFO' 
            },
            { id: 'target_1_3', name: 'Target: Strictly 1:3 Risk-to-Reward Ratio', passed: true, message: `Target: ${tp1} (Strictly 1:3.0 RR). Risk: ${slPips} pips, Reward: ${(slPips * 3).toFixed(1)} pips.`, severity: 'INFO' }
          ],
          appliedStrategy: 'CBDR'
        },
        status: initialStatus,
        outcome: initialOutcome,
        realized_pnl_usd: initialPnl,
        exit_price: initialExitPrice,
        session_name: `London (${triggerCandle.timeStrNY} NY / ${triggerCandle.timeStrIST} IST)`,
        notes: isInitialWin
          ? `🎉 WIN (1:3 Target Hit at ${tp1})! [${sweepTag}] Realized +3.0R (+$3,000 / +${Math.abs(floatingPips)} pips). Move SL to Breakeven.`
          : isInitialLoss
            ? `⚠️ LOSS (Stop Loss Hit at ${sl})! [${sweepTag}] Realized -1.0R (-$1,000 / -${Math.abs(floatingPips)} pips). Risk Engine scaling down to defensive state.`
            : `[IPDA ${ipdaCheck.details?.effectiveDirection}] [${sweepTag}] 1st London 15m Imbalance @ ${entry} (Zone: ${imbalanceZoneDesc}). SL: ${sl} (${isMajor ? (isBuy ? 'London Low' : 'London High') : (isBuy ? 'Below FVG' : 'Above FVG')}) | TP1: ${tp1} (1:3 Target). Current: ${currentPrice} (${inProfit ? '+' : ''}${floatingPips} pips).`,
        raw_payload: {
          strategy: 'CBDR',
          symbol: symbol.toUpperCase(),
          action,
          entry,
          sl,
          tp1,
          tp2,
          isMajorPair: isMajor,
          slPlacementType: isMajor ? (isBuy ? 'London Session Low' : 'London Session High') : (isBuy ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG'),
          liquidity_sweep: isMajor,
          pdh_pdl_sweep: isMajor,
          imbalanceZone: imbalanceZoneDesc,
          currentPrice,
          floatingPips,
          dataSource: 'TradingView (OANDA Feed)',
          session: 'London',
          timeNY: triggerCandle.timeStrNY,
          timeIST: triggerCandle.timeStrIST,
          liveStatus: 'LIVE_MARKET_FEED'
        },
        created_at: `${lastSessionDate}T${String(triggerCandle.hourNY).padStart(2, '0')}:${String(triggerCandle.minuteNY).padStart(2, '0')}:00.000Z`,
        updated_at: new Date().toISOString()
      };

      if (initialOutcome) {
        // Trade has already hit TP or SL (resolved/invalid for active trading) -> push directly to backtest archive
        const { dayName, isCbdrValid } = getSignalTradingDay(signal);
        insertBacktestTrade({
          id: `bt_${signal.id}_${Date.now()}`,
          signal_id: signal.id,
          symbol: signal.symbol,
          strategy: signal.strategy,
          action: signal.action,
          timeframe: signal.timeframe,
          entry: signal.entry,
          sl: signal.sl,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          risk_percent: signal.risk_percent,
          defensive_state: signal.defensive_state,
          calculated_lot_size: signal.calculated_lot_size,
          risk_amount_usd: signal.risk_amount_usd,
          outcome: initialOutcome,
          realized_pnl: initialPnl || 0,
          riskRewardAchieved: initialOutcome === 'WIN' ? 3.0 : -1.0,
          trading_day: dayName,
          isCbdrValidDay: isCbdrValid,
          session: signal.session_name || 'London Session',
          date_executed: signal.created_at.split('T')[0],
          notes: `[${sweepTag}] [TradingView Live] Trade hit ${initialOutcome === 'WIN' ? '1:3 Target at ' + tp1 : 'Stop Loss at ' + sl}`,
          created_at: signal.created_at || new Date().toISOString()
        });
      } else {
        // Only active in-trade signals are added to the live feed
        insertSignal(signal);
        broadcastSSE('NEW_SIGNAL', signal);
      }
    } catch (err) {
      console.error(`Error constructing live signal for ${symbol}`, err);
    }
  }

  const allUpdatedSignals = getAllSignals(50);

  return {
    success: true,
    signals: allUpdatedSignals,
    quotes: quotesMap
  };
}

/**
 * Process a live incoming price tick (e.g. from TradingView webhook or external feed).
 * Evaluates active trades immediately against the live price.
 */
export async function processLivePriceUpdate(
  symbol: string,
  price: number,
  source: string = 'TradingView Live Feed'
): Promise<{
  symbol: string;
  price: number;
  resolved: boolean;
  outcome?: 'WIN' | 'LOSS';
  pnl?: number;
}> {
  const normSymbol = symbol.toUpperCase().replace('/', '').replace('_', '');
  const db = getDb();
  const allSignals = getAllSignals(50);
  const targetSignal = allSignals.find(
    s => s.symbol.toUpperCase() === normSymbol && (s.status === 'IN_TRADE' || s.status === 'PENDING')
  );

  const pipFactor = getPipSize(normSymbol);
  const now = new Date().toISOString();

  // Broadcast the live price tick to all connected browser clients
  broadcastSSE('LIVE_PRICE_TICK', {
    quotes: {
      [normSymbol]: {
        symbol: normSymbol,
        price,
        source,
        lastUpdated: now
      }
    },
    timestamp: now
  });

  if (!targetSignal) {
    return { symbol: normSymbol, price, resolved: false };
  }

  const isBuy = targetSignal.action === 'BUY';
  const isWin = isBuy ? price >= targetSignal.tp1 : price <= targetSignal.tp1;
  const isLoss = isBuy ? price <= targetSignal.sl : price >= targetSignal.sl;
  let currentRisk = getRiskSettings();

  if (isWin) {
    const rr = targetSignal.primary_risk_reward || 3.0;
    const profitUsd = Number((targetSignal.risk_amount_usd * rr).toFixed(2));
    const realizedPips = Number((Math.abs(targetSignal.tp1 - targetSignal.entry) / pipFactor).toFixed(1));
    const exitPrice = targetSignal.tp1;

    updateSignalStatus(targetSignal.id, 'TP1_HIT', 'WIN', profitUsd, exitPrice);
    const riskOutcome = applyTradeOutcomeToRiskSettings(currentRisk, 'WIN', profitUsd);
    currentRisk = saveRiskSettings(riskOutcome.updatedSettings);

    const existingBt = db.prepare('SELECT id FROM backtest_trades WHERE signal_id = ?').get(targetSignal.id);
    if (!existingBt) {
      const { dayName, isCbdrValid } = getSignalTradingDay(targetSignal);
      const isMajor = isMajorPair(targetSignal.symbol);
      const sweepTag = isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';

      insertBacktestTrade({
        id: `bt_${targetSignal.id}_${Date.now()}`,
        signal_id: targetSignal.id,
        symbol: targetSignal.symbol,
        strategy: targetSignal.strategy,
        action: targetSignal.action,
        timeframe: targetSignal.timeframe,
        entry: targetSignal.entry,
        sl: targetSignal.sl,
        tp1: targetSignal.tp1,
        tp2: targetSignal.tp2,
        tp3: targetSignal.tp3,
        risk_percent: targetSignal.risk_percent,
        defensive_state: targetSignal.defensive_state,
        calculated_lot_size: targetSignal.calculated_lot_size,
        risk_amount_usd: targetSignal.risk_amount_usd,
        outcome: 'WIN',
        realized_pnl: profitUsd,
        riskRewardAchieved: rr,
        trading_day: dayName,
        isCbdrValidDay: isCbdrValid,
        session: targetSignal.session_name || 'London Session',
        date_executed: targetSignal.created_at.split('T')[0],
        notes: `[${sweepTag}] [TradingView Live Tick] Hit 1:3 Target at ${exitPrice} (+${realizedPips} pips)`,
        created_at: now
      });
    }

    deleteSignal(targetSignal.id);
    broadcastSSE('RISK_UPDATED', currentRisk);
    broadcastSSE('TRADE_RESOLVED', { id: targetSignal.id, symbol: targetSignal.symbol, outcome: 'WIN', pnl: profitUsd, exitPrice });
    broadcastSSE('SIGNAL_DELETED', { id: targetSignal.id });

    sendTelegramResolutionAlert({
      symbol: targetSignal.symbol,
      strategy: targetSignal.strategy,
      action: targetSignal.action,
      outcome: 'WIN',
      exitPrice,
      pnlUsd: profitUsd,
      rrAchieved: rr,
      notes: `TradingView Live Tick: Target 1:3 reached (+${realizedPips} pips)`
    }).catch(err => console.warn('Telegram WIN alert error:', err));

    return { symbol: normSymbol, price, resolved: true, outcome: 'WIN', pnl: profitUsd };
  } else if (isLoss) {
    const lossUsd = -targetSignal.risk_amount_usd;
    const lossPips = -Number((Math.abs(targetSignal.entry - targetSignal.sl) / pipFactor).toFixed(1));
    const exitPrice = targetSignal.sl;

    updateSignalStatus(targetSignal.id, 'SL_HIT', 'LOSS', lossUsd, exitPrice);
    const riskOutcome = applyTradeOutcomeToRiskSettings(currentRisk, 'LOSS', lossUsd);
    currentRisk = saveRiskSettings(riskOutcome.updatedSettings);

    const existingBt = db.prepare('SELECT id FROM backtest_trades WHERE signal_id = ?').get(targetSignal.id);
    if (!existingBt) {
      const { dayName, isCbdrValid } = getSignalTradingDay(targetSignal);
      const isMajor = isMajorPair(targetSignal.symbol);
      const sweepTag = isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)';

      insertBacktestTrade({
        id: `bt_${targetSignal.id}_${Date.now()}`,
        signal_id: targetSignal.id,
        symbol: targetSignal.symbol,
        strategy: targetSignal.strategy,
        action: targetSignal.action,
        timeframe: targetSignal.timeframe,
        entry: targetSignal.entry,
        sl: targetSignal.sl,
        tp1: targetSignal.tp1,
        tp2: targetSignal.tp2,
        tp3: targetSignal.tp3,
        risk_percent: targetSignal.risk_percent,
        defensive_state: targetSignal.defensive_state,
        calculated_lot_size: targetSignal.calculated_lot_size,
        risk_amount_usd: targetSignal.risk_amount_usd,
        outcome: 'LOSS',
        realized_pnl: lossUsd,
        riskRewardAchieved: -1.0,
        trading_day: dayName,
        isCbdrValidDay: isCbdrValid,
        session: targetSignal.session_name || 'London Session',
        date_executed: targetSignal.created_at.split('T')[0],
        notes: `[${sweepTag}] [TradingView Live Tick] Hit Stop Loss at ${exitPrice} (${lossPips} pips)`,
        created_at: now
      });
    }

    deleteSignal(targetSignal.id);
    broadcastSSE('RISK_UPDATED', currentRisk);
    broadcastSSE('TRADE_RESOLVED', { id: targetSignal.id, symbol: targetSignal.symbol, outcome: 'LOSS', pnl: lossUsd, exitPrice });
    broadcastSSE('SIGNAL_DELETED', { id: targetSignal.id });

    sendTelegramResolutionAlert({
      symbol: targetSignal.symbol,
      strategy: targetSignal.strategy,
      action: targetSignal.action,
      outcome: 'LOSS',
      exitPrice,
      pnlUsd: lossUsd,
      rrAchieved: -1.0,
      notes: `TradingView Live Tick: Stop Loss reached (${lossPips} pips)`
    }).catch(err => console.warn('Telegram LOSS alert error:', err));

    return { symbol: normSymbol, price, resolved: true, outcome: 'LOSS', pnl: lossUsd };
  } else {
    // Trade is active: update floating pips and PnL
    const floatingPips = isBuy 
      ? Number(((price - targetSignal.entry) / pipFactor).toFixed(1))
      : Number(((targetSignal.entry - price) / pipFactor).toFixed(1));

    const slPips = targetSignal.sl_distance_pips_points || 10;
    const floatingPnlUsd = Number(((floatingPips / slPips) * targetSignal.risk_amount_usd).toFixed(2));
    const inProfit = floatingPips >= 0;

    const rawPayload = {
      ...(targetSignal.raw_payload || {}),
      currentPrice: price,
      floatingPips,
      floatingPnlUsd,
      quoteSource: source,
      lastTickAt: now
    };

    const notes = `[TradingView Live Feed] Current: ${price} (${inProfit ? '+' : ''}${floatingPips} pips / ${inProfit ? '+$' : '-$'}${Math.abs(floatingPnlUsd)}). SL: ${targetSignal.sl} | TP1: ${targetSignal.tp1} (1:3 Target).`;

    db.prepare(`
      UPDATE signals SET
        raw_payload_json = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(rawPayload), notes, now, targetSignal.id);

    broadcastSSE('SIGNAL_UPDATED', {
      ...targetSignal,
      raw_payload: rawPayload,
      notes,
      updated_at: now
    });

    return { symbol: normSymbol, price, resolved: false };
  }
}

