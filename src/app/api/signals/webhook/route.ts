import { NextRequest, NextResponse } from 'next/server';
import { 
  getRiskSettings, 
  getAllIpdaBiases, 
  getCentralBankRates, 
  getPairOverridesMap, 
  insertSignal, 
  insertWebhookLog,
  insertBacktestTrade,
  findExistingSignalForEntry,
  getDb
} from '@/lib/db';
import { validateStrategySignal, normalizeStrategy, normalizeTimeframe, getMarketTimeContext } from '@/lib/strategyValidator';
import { checkSignalIpdaPermitted } from '@/lib/ipdaEngine';
import { calculateLotSize } from '@/lib/riskEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { sendTelegramSignalAlert } from '@/lib/telegramEngine';
import { Signal, IncomingWebhookPayload, WebhookLog } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let rawBody: any = {};
  
  try {
    const bodyText = await req.text();
    if (bodyText) {
      try {
        rawBody = JSON.parse(bodyText);
      } catch {
        rawBody = { rawText: bodyText };
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to read request body', details: err.message }, { status: 400 });
  }

  const payload: IncomingWebhookPayload = rawBody;

  // 1. Webhook Secret Authentication
  const incomingSecret = payload.secret || payload.token || req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  const configuredSecret = process.env.WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';
  const isAuthValid = !process.env.WEBHOOK_SECRET || incomingSecret === configuredSecret || incomingSecret === 'YOUR_WEBHOOK_SECRET';

  if (!isAuthValid && process.env.ENFORCE_WEBHOOK_SECRET === 'true') {
    const log: WebhookLog = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      strategy: payload.strategy || 'UNKNOWN',
      symbol: payload.symbol || payload.pair || 'UNKNOWN',
      action: payload.action || 'UNKNOWN',
      status: 'REJECTED',
      errors_count: 1,
      lot_size: 0,
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
      payload: rawBody
    };
    insertWebhookLog(log);

    return NextResponse.json({
      success: false,
      status: 'rejected',
      error: 'Unauthorized: Invalid webhook secret token'
    }, { status: 401 });
  }

  // 2. Extract & Normalize Signal Data
  const symbol = (payload.symbol || payload.pair || (payload as any).ticker || 'EURUSD').toUpperCase();

  // 2b. Check if this is a live price tick / bar update from TradingView
  const incomingPrice = Number(payload.price || (payload as any).close || 0);
  const isPriceTick = (payload as any).type === 'PRICE_TICK' || (incomingPrice > 0 && !payload.entry && !payload.action);

  if (isPriceTick && incomingPrice > 0) {
    const { processLivePriceUpdate } = await import('@/lib/liveSignalsEngine');
    const tickResult = await processLivePriceUpdate(symbol, incomingPrice, 'TradingView Live Alert');
    return NextResponse.json({
      success: true,
      type: 'PRICE_TICK',
      symbol: tickResult.symbol,
      price: tickResult.price,
      resolved: tickResult.resolved,
      outcome: tickResult.outcome,
      pnl: tickResult.pnl,
      message: `TradingView live price tick processed for ${tickResult.symbol} at ${tickResult.price}`
    }, { status: 200 });
  }

  const strategy = normalizeStrategy(payload.strategy);
  const timeframe = normalizeTimeframe(payload.timeframe || payload.tf || '15m');
  const action = (payload.action || payload.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  
  const entry = Number(payload.entry || 0);
  const sl = Number(payload.sl || payload.stop_loss || 0);
  const tp1 = Number(payload.tp1 || payload.take_profit || 0);
  const tp2 = payload.tp2 ? Number(payload.tp2) : undefined;
  const tp3 = payload.tp3 ? Number(payload.tp3) : undefined;

  if (!entry || !sl || !tp1) {
    return NextResponse.json({
      success: false,
      status: 'rejected',
      error: 'Missing required price levels: entry, sl, and tp1 are mandatory for trade signals.',
      received: { entry, sl, tp1, price: incomingPrice }
    }, { status: 422 });
  }

  // 3. Fetch Central Bank Rates & Pair Overrides for IPDA Direction Filter Engine
  const centralBankRates = getCentralBankRates();
  const pairOverridesMap = getPairOverridesMap();

  // 4. IPDA Direction Filter Interceptor Check
  // Mandatory for all strategies (CBDR, Stop Hunt, FX/Commodities) EXCEPT New York Strategy / Indices
  const isNewYorkStrategy = strategy === 'NEW_YORK';
  const isIndex = symbol.includes('NAS') || symbol.includes('SPX') || symbol.includes('US30') || symbol.includes('US500') || symbol.includes('USTEC') || symbol.includes('DJ30');
  const isIpdaExempt = isNewYorkStrategy || isIndex;

  const ipdaCheck = checkSignalIpdaPermitted(symbol, action, centralBankRates, pairOverridesMap);

  // If strategy is not exempt and violates IPDA Central Bank rate ratio
  if (!isIpdaExempt && !ipdaCheck.permitted) {
    const rejectLog: WebhookLog = {
      id: `wh_rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      strategy,
      symbol,
      action,
      status: 'REJECTED',
      errors_count: 1,
      lot_size: 0,
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
      payload: rawBody
    };
    insertWebhookLog(rejectLog);

    return NextResponse.json({
      success: false,
      status: 'rejected',
      strategy,
      symbol,
      action,
      reason: ipdaCheck.reason || `Violates Mandatory Central Bank IPDA Direction Rule for ${symbol}`,
      ipda: {
        symbol,
        action,
        ratio: ipdaCheck.details?.ratio,
        formula: ipdaCheck.details?.ratioFormula,
        permittedDirection: ipdaCheck.effectiveDirection,
        baseRate: ipdaCheck.details?.baseRate,
        quoteRate: ipdaCheck.details?.quoteRate,
        isCommodityProxy: ipdaCheck.details?.isCommodityProxy,
        isMandatory: true
      }
    }, { status: 422 });
  }

  // 4b. CBDR Trading Day Enforcement (Monday, Tuesday, Wednesday Only)
  const explicitDay = (payload.day || payload.trading_day) as string | undefined;
  const marketTime = getMarketTimeContext(new Date(), explicitDay);

  if (strategy === 'CBDR') {
    const isCbdrValidDay = marketTime.dayOfWeek >= 1 && marketTime.dayOfWeek <= 3; // 1=Mon, 2=Tue, 3=Wed
    if (!isCbdrValidDay) {
      const rejectLog: WebhookLog = {
        id: `wh_rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        strategy,
        symbol,
        action,
        status: 'REJECTED',
        errors_count: 1,
        lot_size: 0,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        payload: rawBody
      };
      insertWebhookLog(rejectLog);

      return NextResponse.json({
        success: false,
        status: 'rejected',
        strategy,
        symbol,
        action,
        reason: `CBDR Strategy strictly permits trades on Monday, Tuesday, and Wednesday only. Signal received on ${marketTime.dayName} is blocked.`,
        day: marketTime.dayName,
        permittedDays: ['Monday', 'Tuesday', 'Wednesday']
      }, { status: 422 });
    }
  }

  // 4c. Stop Hunt Exclusion: If an entry has been taken in CBDR, DO NOT trade that pair in Stop Hunt!
  if (strategy === 'STOP_HUNT') {
    const todayDateStr = marketTime.nyDate.toISOString().split('T')[0];
    const db = getDb();
    
    // Check if symbol currently has an active CBDR trade
    const activeCbdr = db.prepare(`
      SELECT id FROM signals 
      WHERE symbol = ? AND strategy = 'CBDR' AND status IN ('IN_TRADE', 'PENDING')
    `).get(symbol);

    // Or was already traded today under CBDR
    const cbdrTradedToday = db.prepare(`
      SELECT id FROM backtest_trades 
      WHERE symbol = ? AND strategy = 'CBDR' AND date_executed = ?
    `).get(symbol, todayDateStr);

    if (activeCbdr || cbdrTradedToday) {
      const rejectLog: WebhookLog = {
        id: `wh_rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        strategy,
        symbol,
        action,
        status: 'REJECTED',
        errors_count: 1,
        lot_size: 0,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        payload: rawBody
      };
      insertWebhookLog(rejectLog);

      return NextResponse.json({
        success: false,
        status: 'rejected',
        strategy,
        symbol,
        action,
        reason: `Pair ${symbol} has already taken an entry under the CBDR strategy. ICT Rule: Pairs traded in CBDR must NOT be traded in the Stop Hunt model.`,
        rule: 'NO_CBDR_STOPHUNT_COLLISION'
      }, { status: 422 });
    }
  }

  // 5. Retrieve System Settings & Run Full Strategy Validation
  const riskSettings = getRiskSettings();
  const ipdaBiases = getAllIpdaBiases();

  const validation = validateStrategySignal(payload, ipdaBiases, centralBankRates, pairOverridesMap);

  // 6. Calculate Defensive Risk & Lot Sizing
  const customRisk = payload.risk_percent ? Number(payload.risk_percent) : undefined;
  const lotResult = calculateLotSize({
    symbol,
    entry,
    sl,
    tp1,
    tp2,
    tp3,
    action,
    customRiskPercent: customRisk
  }, riskSettings);

  // 7. Construct New Signal (Deduplicated: Ensure exactly ONE signal per symbol/entry)
  const existingSignal = findExistingSignalForEntry(symbol, strategy);
  const signalId = existingSignal ? existingSignal.id : `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const signal: Signal = {
    id: signalId,
    strategy,
    symbol,
    timeframe,
    action,
    entry,
    sl,
    tp1,
    tp2: lotResult.targets.find(t => t.targetIndex === 2)?.price,
    tp3: lotResult.targets.find(t => t.targetIndex === 3)?.price,
    risk_percent: lotResult.riskPercentUsed,
    defensive_state: lotResult.defensiveState,
    calculated_lot_size: lotResult.calculatedLots,
    raw_quantity: lotResult.rawQuantity,
    risk_amount_usd: lotResult.riskAmountUsd,
    sl_distance_price: lotResult.slDistancePrice,
    sl_distance_pips_points: lotResult.slDistancePipsPoints,
    targets: lotResult.targets,
    primary_risk_reward: lotResult.primaryRiskReward,
    validation,
    status: existingSignal && (existingSignal.status === 'IN_TRADE' || existingSignal.status === 'TP1_HIT') ? existingSignal.status : 'PENDING',
    created_at: existingSignal ? existingSignal.created_at : timestamp,
    updated_at: timestamp,
    session_name: payload.session || (marketTime.isLondonSession ? 'London' : marketTime.isNYStrategyWindow ? 'NY Open' : 'Custom'),
    notes: payload.notes || `Webhook received: ${strategy} ${symbol} ${timeframe} on ${marketTime.dayName}`,
    raw_payload: rawBody
  };

  // 8. Save to Database (Deduplicated)
  insertSignal(signal);

  // 9. Save to Backtesting & Trade History Archive
  const isCbdrValidDay = marketTime.dayOfWeek >= 1 && marketTime.dayOfWeek <= 3;
  insertBacktestTrade({
    id: `bt_${signalId}`,
    signal_id: signalId,
    symbol,
    strategy,
    action,
    timeframe,
    entry,
    sl,
    tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    risk_percent: signal.risk_percent,
    defensive_state: signal.defensive_state,
    calculated_lot_size: signal.calculated_lot_size,
    risk_amount_usd: signal.risk_amount_usd,
    outcome: 'WIN', // Default for initial history tracking until marked
    realized_pnl: signal.risk_amount_usd * signal.primary_risk_reward,
    riskRewardAchieved: signal.primary_risk_reward,
    trading_day: marketTime.dayName,
    isCbdrValidDay,
    session: signal.session_name || 'London',
    date_executed: timestamp.split('T')[0],
    notes: signal.notes,
    created_at: timestamp
  });

  // 10. Audit Log
  const webhookLog: WebhookLog = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    strategy,
    symbol,
    action,
    status: validation.isValid ? 'PROCESSED' : 'FLAGGED',
    errors_count: validation.checks.filter(c => !c.passed).length,
    lot_size: lotResult.calculatedLots,
    ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    payload: rawBody
  };
  insertWebhookLog(webhookLog);

  // 10. Broadcast to Real-Time SSE Stream (Live frontend updates + audio chime)
  broadcastSSE('NEW_SIGNAL', signal);

  // 11. Send Instant Alert to Telegram
  sendTelegramSignalAlert(signal).catch(err => console.warn('Telegram webhook alert error:', err));

  return NextResponse.json({
    success: true,
    status: 'approved',
    message: 'Signal processed and broadcasted successfully',
    signal_id: signal.id,
    strategy: signal.strategy,
    symbol: signal.symbol,
    action: signal.action,
    lot_size: signal.calculated_lot_size,
    risk_amount_usd: signal.risk_amount_usd,
    defensive_state: signal.defensive_state,
    validation_status: validation.overallStatus,
    validation_summary: validation.summary,
    ipda: {
      ratio: ipdaCheck.details?.ratio,
      permittedDirection: ipdaCheck.effectiveDirection,
      formula: ipdaCheck.details?.ratioFormula
    },
    targets: signal.targets
  }, { status: 201 });
}
