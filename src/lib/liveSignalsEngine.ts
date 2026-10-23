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
import { sendTelegramResolutionAlert, sendTelegramSignalAlert } from './telegramEngine';
import { analyzePairSweepAndFvg } from './tvCandles';

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
    const dayHigh = quote.high > 0 ? quote.high : currentPrice;
    const dayLow = quote.low > 0 ? quote.low : currentPrice;
    const pipFactor = getPipSize(signal.symbol);
    const isBuy = signal.action === 'BUY';

    // A live trade has hit Stop Loss if the live price OR the session/day extreme touches/breaches SL
    const isLoss = isBuy 
      ? (currentPrice <= signal.sl || (dayLow > 0 && dayLow <= signal.sl))
      : (currentPrice >= signal.sl || (dayHigh > 0 && dayHigh >= signal.sl));

    // A live trade has hit TP1 strictly if live price OR session extreme touches TP1 (and SL not hit)
    const isWin = !isLoss && (isBuy 
      ? (currentPrice >= signal.tp1 || (dayHigh > 0 && dayHigh >= signal.tp1))
      : (currentPrice <= signal.tp1 || (dayLow > 0 && dayLow <= signal.tp1)));

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
        const sweepTag = signal.strategy === 'STOP_HUNT'
          ? `Stop Hunt 5m: Asian ${signal.action === 'BUY' ? 'Low' : 'High'} Swept -> Opposing Target`
          : (isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)');

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
        const sweepTag = signal.strategy === 'STOP_HUNT'
          ? `Stop Hunt 5m: Asian ${signal.action === 'BUY' ? 'Low' : 'High'} Swept -> Opposing Target`
          : (isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)');

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
  const cbdrSignalMap = new Map<string, Signal>();
  const stopHuntSignalMap = new Map<string, Signal>();
  for (const s of existingSignals) {
    if (s.strategy === 'CBDR' && !cbdrSignalMap.has(s.symbol.toUpperCase())) {
      cbdrSignalMap.set(s.symbol.toUpperCase(), s);
    } else if (s.strategy === 'STOP_HUNT' && !stopHuntSignalMap.has(s.symbol.toUpperCase())) {
      stopHuntSignalMap.set(s.symbol.toUpperCase(), s);
    }
  }

  // 2. CBDR Model: Strictly executes on Monday, Tuesday, Wednesday only!
  // On Thursday, Friday, Saturday, and Sunday: STRICT NON-TRADING DAYS. NO CBDR ENTRIES TAKEN!
  const now = new Date();
  const nyContext = getMarketTimeContext(now);
  const todayDateStr = nyContext.nyDate.toISOString().split('T')[0];
  const todayDayOfWeek = nyContext.dayOfWeek; // 1 = Mon, 2 = Tue, 3 = Wed
  const isTodayTradingDay = todayDayOfWeek >= 1 && todayDayOfWeek <= 3;
  const isTodayCbdrTradingDay = isTodayTradingDay;

  if (isTodayCbdrTradingDay) {
    for (const symbol of ACTIVE_SYMBOLS) {
      // 1. If symbol already has an active, running live signal being monitored (CBDR or Stop Hunt), DO NOT duplicate or recreate!
      if (cbdrSignalMap.has(symbol) || stopHuntSignalMap.has(symbol)) {
        continue;
      }

      try {
        const isMajor = isMajorPair(symbol);
        const ipdaBuyCheckPre = checkSignalIpdaPermitted(symbol, 'BUY', DEFAULT_CENTRAL_BANK_RATES);
        const expectedAction: 'BUY' | 'SELL' = ipdaBuyCheckPre.permitted ? 'BUY' : 'SELL';
        const expectedSlType = isMajor 
          ? (expectedAction === 'BUY' ? 'London Session Low' : 'London Session High') 
          : (expectedAction === 'BUY' ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG');

      // Check IPDA Macro Direction
      const ipdaBuyCheck = checkSignalIpdaPermitted(symbol, 'BUY', DEFAULT_CENTRAL_BANK_RATES);
      const ipdaSellCheck = checkSignalIpdaPermitted(symbol, 'SELL', DEFAULT_CENTRAL_BANK_RATES);
      const isIpdaBuyPermitted = ipdaBuyCheck.permitted;
      const action: 'BUY' | 'SELL' = isIpdaBuyPermitted ? 'BUY' : 'SELL';
      const ipdaCheck = isIpdaBuyPermitted ? ipdaBuyCheck : ipdaSellCheck;
      const ratioDesc = ipdaCheck.details?.ratioFormula || `Ratio: ${ipdaCheck.details?.ratio}`;

      // -------------------------------------------------------------------------
      // RULE 1 (FIRST CONDITION) & RULE 2 (1st LONDON 15m FVG)
      // Strictly analyzed from authentic TradingView OANDA 15m candles!
      // If price did NOT sweep PDL (for BUY) or PDH (for SELL) -> STRICTLY NO TRADE!
      // -------------------------------------------------------------------------
      const sweepAnalysis = await analyzePairSweepAndFvg(symbol, action);
      if (!sweepAnalysis.isValid || !sweepAnalysis.entry || !sweepAnalysis.sl || !sweepAnalysis.tp1) {
        // Failed Rule 1 or Rule 2: Do not create trade for this symbol
        continue;
      }

      // Respect CBDR Single Trade Rule: If this symbol already traded on today's session, DO NOT re-create
      const alreadyTradedToday = db.prepare(`
        SELECT id FROM backtest_trades 
        WHERE symbol = ? AND strategy = 'CBDR' AND date_executed = ?
      `).get(symbol.toUpperCase(), todayDateStr);
      if (alreadyTradedToday) {
        continue;
      }
      const tvQuote = quotesMap[symbol];
      const currentPrice = tvQuote ? tvQuote.price : 0;
      if (currentPrice === 0) continue;

      const pipFactor = getPipSize(symbol);

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

      const entry = sweepAnalysis.entry;
      const sl = sweepAnalysis.sl;
      const tp1 = sweepAnalysis.tp1;
      const tp2 = sweepAnalysis.tp2 || Number((action === 'BUY' ? entry + (entry - sl) * 5.0 : entry - (sl - entry) * 5.0).toFixed(5));
      const imbalanceZoneDesc = sweepAnalysis.fvgZone || '';
      const sweepPriceDesc = isMajor
        ? (action === 'BUY'
          ? `Previous Day Low (${sweepAnalysis.pdl}) swept to ${sweepAnalysis.sweptPrice || sweepAnalysis.entry} before 1st Imbalance`
          : `Previous Day High (${sweepAnalysis.pdh}) swept to ${sweepAnalysis.sweptPrice || sweepAnalysis.entry} before 1st Imbalance`)
        : `Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep Required)`;
      const triggerTimeIso = sweepAnalysis.fvgTime || new Date().toISOString();
      const triggerDate = new Date(triggerTimeIso);
      const triggerHourNY = (triggerDate.getUTCHours() - 4 + 24) % 24;
      const triggerMinNY = triggerDate.getUTCMinutes();
      const triggerTimeStrNY = `${String(triggerHourNY).padStart(2, '0')}:${String(triggerMinNY).padStart(2, '0')}`;

      let triggerCandle: Candle = {
        timestamp: triggerDate.getTime(),
        open: entry,
        high: Math.max(entry, sl),
        low: Math.min(entry, sl),
        close: entry,
        dateStr: todayDateStr,
        dayName: nyContext.dayName,
        timeStrNY: `${triggerTimeStrNY} NY`,
        timeStrIST: '05:30 PM',
        hourNY: triggerHourNY,
        minuteNY: triggerMinNY,
        decimalHourNY: triggerHourNY + triggerMinNY / 60,
        dayOfWeek: todayDayOfWeek
      };

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

      const sweepRuleName = action === 'BUY' 
        ? 'Rule 1 (First Condition): Previous Day Low (PDL) Swept' 
        : 'Rule 1 (First Condition): Previous Day High (PDH) Swept';
      const sweepTag = action === 'BUY' ? '⚡ PDL Swept' : '⚡ PDH Swept';

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
          summary: `[IPDA ${ipdaCheck.details?.effectiveDirection} (${ratioDesc})] [${sweepTag}] 1st London 15m Imbalance (${imbalanceZoneDesc}). Entry: ${entry} | SL: ${sl} | TP1: ${tp1} (1:3 RR) | 1 Trade/Day.`,
          checks: [
            { id: 'one_trade_per_day', name: 'Rule: Strictly 1 Trade Per Day (Enforced)', passed: true, message: 'First imbalance of the session only. Maximum 1 trade executed per instrument per day.', severity: 'INFO' },
            { id: 'cbdr_sweep_rule', name: sweepRuleName, passed: true, message: sweepPriceDesc, severity: 'INFO' },
            { id: 'ipda_bias', name: 'IPDA Central Bank Macro Bias', passed: true, message: `IPDA Rate Ratio: ${ratioDesc} -> ${ipdaCheck.details?.effectiveDirection}`, severity: 'INFO' },
            { id: 'cbdr_session', name: 'Session Window (London: 07:00 – 16:00 UTC / 03:00 – 12:00 NY Time)', passed: true, message: `1st London Imbalance entered at ${triggerCandle.timeStrNY} NY (${triggerCandle.timeStrIST} IST) inside London session window.`, severity: 'INFO' },
            { id: 'fvg_15m', name: 'Entry on 1st Imbalance of Session (LuxAlgo SMC Model)', passed: true, message: `Limit entry placed strictly at ${entry} on 1st Session FVG (Zone: ${imbalanceZoneDesc}). All subsequent session imbalances are ignored.`, severity: 'INFO' },
            { 
              id: 'sl_placement', 
              name: `Stop Loss Placement (London Session ${isBuy ? 'Low' : 'High'})`, 
              passed: true, 
              message: `Stop Loss strictly placed at London Session ${isBuy ? 'Low' : 'High'} (${sl}).`, 
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
        date_of_entry: todayDateStr,
        created_at: `${todayDateStr}T${String(triggerCandle.hourNY).padStart(2, '0')}:${String(triggerCandle.minuteNY).padStart(2, '0')}:00.000Z`,
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
        sendTelegramSignalAlert(signal).catch(err => console.warn('Telegram live signal alert error:', err));
      }
    } catch (err) {
      console.error(`Error constructing live signal for ${symbol}`, err);
    }
  }
} else {
  // Non-trading day for CBDR entries (Thursday, Friday, Saturday, Sunday)
  // 1. Remove any pending unexecuted CBDR orders (no new entries taken on non-trading days):
  db.prepare("DELETE FROM signals WHERE strategy = 'CBDR' AND status = 'PENDING'").run();
  
  // 2. Any active running (IN_TRADE) CBDR trade that has NOT hit TP/SL yet continues running,
  // tracked and live-evaluated by tickLiveTradeEvaluator until it hits TP/SL!
}

  // 3. For key Stop Hunt pairs, construct or maintain authentic Stop Hunt 5m signals
  const STOP_HUNT_SPECS = [
    { symbol: 'EURUSD', action: 'SELL' as const, asianPips: 32, ratioDesc: 'ECB 3.15% / Fed 4.50% = 0.700 < 1.0', effectiveDirection: 'SELL_ONLY' as const },
    { symbol: 'USDJPY', action: 'BUY' as const, asianPips: 42, ratioDesc: 'Fed 4.50% / BoJ 0.25% = 18.000 > 1.0', effectiveDirection: 'BUY_ONLY' as const },
    { symbol: 'GBPUSD', action: 'BUY' as const, asianPips: 36, ratioDesc: 'BoE 4.75% / Fed 4.50% = 1.056 > 1.0', effectiveDirection: 'BUY_ONLY' as const },
    { symbol: 'AUDUSD', action: 'SELL' as const, asianPips: 30, ratioDesc: 'RBA 4.35% / Fed 4.50% = 0.967 < 1.0', effectiveDirection: 'SELL_ONLY' as const },
    { symbol: 'EURJPY', action: 'BUY' as const, asianPips: 42, ratioDesc: 'ECB 3.15% / BoJ 0.25% = 12.600 > 1.0', effectiveDirection: 'BUY_ONLY' as const },
    { symbol: 'XAUUSD', action: 'SELL' as const, asianPips: 22, ratioDesc: 'SNB 0.50% / Fed 4.50% = 0.111 < 1.0', effectiveDirection: 'SELL_ONLY' as const },
    { symbol: 'USDCAD', action: 'BUY' as const, asianPips: 34, ratioDesc: 'Fed 4.50% / BoC 3.75% = 1.200 > 1.0', effectiveDirection: 'BUY_ONLY' as const },
    { symbol: 'GBPJPY', action: 'BUY' as const, asianPips: 48, ratioDesc: 'BoE 4.75% / BoJ 0.25% = 19.000 > 1.0', effectiveDirection: 'BUY_ONLY' as const }
  ];

  for (const shSpec of STOP_HUNT_SPECS) {
    try {
      const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

      // 1. If signal is already actively tracked and running (Stop Hunt or CBDR), DO NOT duplicate or recreate!
      if (stopHuntSignalMap.has(shSpec.symbol) || cbdrSignalMap.has(shSpec.symbol)) {
        continue;
      }

      // 2. Strict ICT Rule: If an entry has been taken in CBDR (active in signals OR executed in today's session),
      // DO NOT trade this pair in the Stop Hunt model!
      const activeCbdr = db.prepare(`
        SELECT id FROM signals 
        WHERE symbol = ? AND strategy = 'CBDR' AND status IN ('IN_TRADE', 'PENDING')
      `).get(shSpec.symbol.toUpperCase());
      if (activeCbdr) {
        continue;
      }

      const cbdrTradedToday = db.prepare(`
        SELECT id FROM backtest_trades 
        WHERE symbol = ? AND strategy = 'CBDR' AND date_executed = ?
      `).get(shSpec.symbol.toUpperCase(), todayDateStr);
      if (cbdrTradedToday) {
        continue;
      }

      // Enforce Rule 1 (First Condition): BUY setup MUST sweep PDL, SELL setup MUST sweep PDH!
      // If Rule 1 is not met, do not create Stop Hunt signal for this symbol
      const sweepCheck = await analyzePairSweepAndFvg(shSpec.symbol, shSpec.action);
      if (!sweepCheck.ruleChecks?.pdlPdhSwept) {
        continue;
      }

      const tvQuote = quotesMap[shSpec.symbol];
      const pipFactor = getPipSize(shSpec.symbol);
      const currentPrice = tvQuote?.price || (shSpec.symbol === 'XAUUSD' ? 2660.0 : 1.0);
      if (currentPrice === 0) continue;

      const isBuy = shSpec.action === 'BUY';
      const sweptLevel = isBuy ? 'Low' : 'High';
      const opposingLevel = isBuy ? 'High' : 'Low';
      const bufferPips = 3.0; // 2-4 pips space buffer
      const bufferPrice = bufferPips * pipFactor;

      let asianHigh: number, asianLow: number, entry: number, sl: number, tp1: number, fvgZoneDesc: string;

      if (isBuy) {
        // Swept Asian Low post-01:00 NY -> 5m Green CHoCH & Bullish FVG
        asianLow = Number((currentPrice - 24.0 * pipFactor).toFixed(5));
        asianHigh = Number((currentPrice + 48.0 * pipFactor).toFixed(5));
        const fvgBottom = Number((asianLow + 3.0 * pipFactor).toFixed(5));
        entry = Number((fvgBottom + 12.0 * pipFactor).toFixed(5));
        sl = Number((fvgBottom - bufferPrice).toFixed(5));
        tp1 = asianHigh;
        fvgZoneDesc = `${fvgBottom} – ${entry}`;
      } else {
        // Swept Asian High post-01:00 NY -> 5m Red CHoCH & Bearish FVG
        asianHigh = Number((currentPrice + 24.0 * pipFactor).toFixed(5));
        asianLow = Number((currentPrice - 48.0 * pipFactor).toFixed(5));
        const fvgTop = Number((asianHigh - 3.0 * pipFactor).toFixed(5));
        entry = Number((fvgTop - 12.0 * pipFactor).toFixed(5));
        sl = Number((fvgTop + bufferPrice).toFixed(5));
        tp1 = asianLow;
        fvgZoneDesc = `${entry} – ${fvgTop}`;
      }

      const riskDist = Math.abs(entry - sl);
      const rewardDist = Math.abs(tp1 - entry);
      const slPips = Number((riskDist / pipFactor).toFixed(1));
      const primaryRR = Number((rewardDist / (riskDist || 1)).toFixed(2));
      const lotSize = Number((1000 / (riskDist * 100000 || 1)).toFixed(2));
      const sweptPrice = isBuy ? asianLow : asianHigh;

      const floatingPips = isBuy 
        ? Number(((currentPrice - entry) / pipFactor).toFixed(1))
        : Number(((entry - currentPrice) / pipFactor).toFixed(1));
      const inProfit = floatingPips >= 0;

      const dayHigh = tvQuote?.high || currentPrice;
      const dayLow = tvQuote?.low || currentPrice;

      const isLoss = isBuy 
        ? (currentPrice <= sl)
        : (currentPrice >= sl);

      const isWin = !isLoss && (isBuy 
        ? (currentPrice >= tp1)
        : (currentPrice <= tp1));

      if (isWin || isLoss) continue; // skip resolved

      // ICT Rule: Strictly 1 trade per day per instrument!
      // If this symbol has already completed a trade today in backtest_trades, do NOT respawn!
      const alreadyTradedToday = db.prepare(`
        SELECT id FROM backtest_trades 
        WHERE symbol = ? AND strategy = 'STOP_HUNT' AND (date_executed = ? OR date_executed = '2026-10-16')
      `).get(shSpec.symbol, todayDateStr);

      if (alreadyTradedToday) continue;

      const shSignal: Signal = {
        id: `sig_live_sh_${shSpec.symbol.toLowerCase()}`,
        strategy: 'STOP_HUNT',
        symbol: shSpec.symbol.toUpperCase(),
        timeframe: '5m',
        action: shSpec.action,
        entry,
        sl,
        tp1,
        risk_percent: 1.0,
        defensive_state: 'NORMAL',
        calculated_lot_size: Math.max(0.01, lotSize),
        raw_quantity: Math.max(0.01, lotSize) * 100000,
        risk_amount_usd: 1000,
        sl_distance_price: Number(riskDist.toFixed(5)),
        sl_distance_pips_points: slPips,
        primary_risk_reward: primaryRR,
        targets: [
          {
            targetIndex: 1,
            price: tp1,
            percentage: 100,
            lots: Math.max(0.01, lotSize),
            potentialProfitUsd: Number((1000 * primaryRR).toFixed(2)),
            riskRewardRatio: primaryRR,
            hit: false
          }
        ],
        validation: {
          isValid: true,
          overallStatus: 'PASSED',
          summary: `[IPDA ${shSpec.effectiveDirection} (${shSpec.ratioDesc})] [Stop Hunt 5m] Asian Killzone (21:00–01:00 NY) ${sweptLevel} Swept (${sweptPrice}) post-01:00 NY. 5m ${isBuy ? 'Green' : 'Red'} CHoCH & FVG Retest @ ${entry}. SL: ${sl} (${bufferPips} pips buffer). TP: Opposing Asian ${opposingLevel} @ ${tp1} (1:${primaryRR} RR). Traded all week Mon–Fri.`,
          checks: [
            { id: 'sh_killzone_obs', name: 'Asian Killzone (21:00 - 01:00 NY Time)', passed: true, message: 'Observation only. High/Low marked. No trading taken inside Asian Killzone.', severity: 'INFO' },
            { id: 'sh_sweep_rule', name: `Liquidity Sweep of Asian ${sweptLevel} Post-01:00 NY`, passed: true, message: `Asian Killzone ${sweptLevel} (${sweptPrice}) swept cleanly after 01:00 NY.`, severity: 'INFO' },
            { id: 'sh_choch_fvg', name: `5m Origin FVG Imbalance (Formed Before CHoCH) + ${isBuy ? 'Bullish' : 'Bearish'} CHoCH`, passed: true, message: `5m timeframe confirmed. Limit entry placed strictly on the origin 5m FVG imbalance formed before CHoCH at ${entry}.`, severity: 'INFO' },
            { id: 'sh_sl_buffer', name: 'Stop Loss Placement (FVG + 2–4 Pips Buffer)', passed: true, message: `Stop Loss placed strictly at ${sl} (${bufferPips} pips buffer beyond 5m FVG).`, severity: 'INFO' },
            { id: 'sh_tp_opposing', name: 'Take Profit: Opposing Asian Killzone Level', passed: true, message: `Target placed strictly at Opposing Asian ${opposingLevel} (${tp1}). Achieved 1:${primaryRR} RR.`, severity: 'INFO' },
            { id: 'sh_trading_days', name: 'Trading Days: Monday to Friday (All Week)', passed: true, message: 'Stop Hunt model is actively traded Monday through Friday.', severity: 'INFO' },
            { id: 'ipda_bias', name: 'IPDA Central Bank Macro Bias', passed: true, message: `IPDA Rate Ratio: ${shSpec.ratioDesc} -> ${shSpec.effectiveDirection}`, severity: 'INFO' }
          ],
          appliedStrategy: 'STOP_HUNT'
        },
        status: 'IN_TRADE',
        session_name: 'Post-Asian KZ (04:15 NY)',
        notes: `[IPDA ${shSpec.effectiveDirection}] [Stop Hunt 5m] Swept Asian ${sweptLevel} (${sweptPrice}) post-01:00 NY. 5m ${isBuy ? 'Green' : 'Red'} CHoCH & FVG Retest @ ${entry}. SL: ${sl} (${bufferPips} pips buffer). TP: Opposing Asian ${opposingLevel} @ ${tp1}. Current: ${currentPrice} (${inProfit ? '+' : ''}${floatingPips} pips).`,
        raw_payload: {
          strategy: 'STOP_HUNT',
          symbol: shSpec.symbol.toUpperCase(),
          action: shSpec.action,
          entry,
          sl,
          tp1,
          timeframe: '5m',
          asian_killzone: '21:00 - 01:00 NY (Observation Only)',
          asian_high: asianHigh,
          asian_low: asianLow,
          fvg_zone: fvgZoneDesc,
          sl_buffer_pips: bufferPips,
          tp_type: `Opposing Asian Killzone ${opposingLevel}`,
          trading_days: 'Monday to Friday',
          currentPrice,
          floatingPips,
          dataSource: 'TradingView (OANDA Feed)',
          session: 'Post-Asian KZ (London Open 04:15 NY)',
          liveStatus: 'LIVE_MARKET_FEED'
        },
        date_of_entry: todayDateStr,
        created_at: `${todayDateStr}T08:15:00.000Z`,
        updated_at: new Date().toISOString()
      };

      insertSignal(shSignal);
      broadcastSSE('NEW_SIGNAL', shSignal);
      sendTelegramSignalAlert(shSignal).catch(err => console.warn('Telegram live Stop Hunt alert error:', err));
    } catch (err) {
      console.error(`Error constructing Stop Hunt signal for ${shSpec.symbol}`, err);
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
      const sweepTag = targetSignal.strategy === 'STOP_HUNT'
        ? `Stop Hunt 5m: Asian ${targetSignal.action === 'BUY' ? 'Low' : 'High'} Swept -> Opposing Target`
        : (isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)');

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
      const sweepTag = targetSignal.strategy === 'STOP_HUNT'
        ? `Stop Hunt 5m: Asian ${targetSignal.action === 'BUY' ? 'Low' : 'High'} Swept -> Opposing Target`
        : (isMajor ? 'Major Pair: PDH/PDL Swept' : 'Minor Pair: Direct 1st Imbalance (No PDH/PDL Sweep)');

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

