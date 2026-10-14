import { NextRequest, NextResponse } from 'next/server';
import { getAllSignals, insertSignal, getRiskSettings, getAllIpdaBiases } from '@/lib/db';
import { validateStrategySignal, normalizeStrategy, normalizeTimeframe } from '@/lib/strategyValidator';
import { calculateLotSize } from '@/lib/riskEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { sendTelegramSignalAlert } from '@/lib/telegramEngine';
import { Signal, IncomingWebhookPayload } from '@/types';

import { syncLiveMarketSignals } from '@/lib/liveSignalsEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const strategy = searchParams.get('strategy');
    const status = searchParams.get('status');
    const refresh = searchParams.get('refresh') === 'true';

    if (refresh) {
      await syncLiveMarketSignals();
    }

    let signals = getAllSignals(limit);

    if (signals.length === 0) {
      await syncLiveMarketSignals();
      signals = getAllSignals(limit);
    }

    if (strategy && strategy !== 'ALL') {
      signals = signals.filter(s => s.strategy.toUpperCase() === strategy.toUpperCase());
    }

    if (status && status !== 'ALL') {
      signals = signals.filter(s => s.status.toUpperCase() === status.toUpperCase());
    }

    return NextResponse.json({ signals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload: IncomingWebhookPayload = await req.json();
    const symbol = (payload.symbol || payload.pair || 'EURUSD').toUpperCase();
    const strategy = normalizeStrategy(payload.strategy);
    const timeframe = normalizeTimeframe(payload.timeframe || payload.tf || '15m');
    const action = (payload.action || payload.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
    
    const entry = Number(payload.entry || 0);
    const sl = Number(payload.sl || payload.stop_loss || 0);
    const tp1 = Number(payload.tp1 || payload.take_profit || 0);
    const tp2 = payload.tp2 ? Number(payload.tp2) : undefined;
    const tp3 = payload.tp3 ? Number(payload.tp3) : undefined;

    if (!entry || !sl || !tp1) {
      return NextResponse.json({ error: 'Entry, SL, and TP1 are required' }, { status: 400 });
    }

    const riskSettings = getRiskSettings();
    const ipdaBiases = getAllIpdaBiases();

    const validation = validateStrategySignal(payload, ipdaBiases);
    const lotResult = calculateLotSize({
      symbol,
      entry,
      sl,
      tp1,
      tp2,
      tp3,
      action,
      customRiskPercent: payload.risk_percent ? Number(payload.risk_percent) : undefined
    }, riskSettings);

    const timestamp = new Date().toISOString();
    const signal: Signal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
      status: 'PENDING',
      created_at: timestamp,
      updated_at: timestamp,
      session_name: payload.session,
      notes: payload.notes || 'Manually created signal',
      raw_payload: payload
    };

    insertSignal(signal);
    broadcastSSE('NEW_SIGNAL', signal);

    // Send Instant Telegram Alert
    sendTelegramSignalAlert(signal).catch(err => console.warn('Telegram signal creation alert error:', err));

    return NextResponse.json({ success: true, signal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
