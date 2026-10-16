import { NextResponse } from 'next/server';
import { getDb, getRiskSettings, getAllIpdaBiases, insertSignal, saveRiskSettings, seedInitialBacktestTrades } from '@/lib/db';
import { calculateLotSize } from '@/lib/riskEngine';
import { validateStrategySignal } from '@/lib/strategyValidator';
import { Signal, IncomingWebhookPayload } from '@/types';
import { broadcastSSE } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = getDb();
    
    // Clear existing signals & trade logs
    db.exec('DELETE FROM signals');
    db.exec('DELETE FROM trade_logs');
    db.exec('DELETE FROM webhook_logs');
    db.exec('DELETE FROM backtest_trades');

    // Re-seed updated 6-month historical backtest dataset
    seedInitialBacktestTrades(db);

    // Reset risk settings to initial $50,000 Normal 1.0% state
    const riskSettings = saveRiskSettings({
      balance: 52450.00,
      high_water_mark: 52450.00,
      base_risk_percent: 1.0,
      current_risk_percent: 1.0,
      defensive_state: 'NORMAL',
      consecutive_losses: 0,
      total_trades: 7,
      total_wins: 5,
      total_losses: 2,
      total_pnl: 2450.00,
      max_drawdown_percent: 1.8,
      win_rate: 71.4
    });

    const ipdaBiases = getAllIpdaBiases();
    const now = new Date();

    const sampleSignalsData: (IncomingWebhookPayload & { createdAt?: string })[] = [
      {
        strategy: 'Stop Hunt',
        symbol: 'EURUSD',
        timeframe: '5m',
        action: 'SELL',
        entry: 1.08720,
        sl: 1.08960,
        tp1: 1.08280,
        session: 'Post-Asian',
        asian_kz_completed: true,
        choch_confirmed: true,
        bpr_confirmed: true,
        notes: '[Stop Hunt 5m] Swept Asian High (21:00-01:00 NY) -> 5m Red CHoCH & FVG Retest @ 1.08720. TP: Opposing Asian Low @ 1.08280.'
      },
      {
        strategy: 'Stop Hunt',
        symbol: 'USDJPY',
        timeframe: '5m',
        action: 'BUY',
        entry: 154.550,
        sl: 154.180,
        tp1: 155.650,
        session: 'Post-Asian',
        asian_kz_completed: true,
        choch_confirmed: true,
        bpr_confirmed: true,
        notes: '[Stop Hunt 5m] Swept Asian Low (21:00-01:00 NY) -> 5m Green CHoCH & FVG Retest @ 154.550. TP: Opposing Asian High @ 155.650.'
      },
      {
        strategy: 'CBDR',
        symbol: 'EURCHF',
        timeframe: '15m',
        action: 'BUY',
        entry: 0.92420,
        sl: 0.92120,
        tp1: 0.93320,
        tp2: 0.93920,
        session: 'London',
        fvg_number: 1,
        createdAt: '2026-10-14T09:05:00.000Z',
        notes: 'Minor Pair CBDR: Direct London 1st 15m Bullish Imbalance entry on Wednesday session. 1:3 RR target running actively.'
      },
      {
        strategy: 'CBDR',
        symbol: 'CADJPY',
        timeframe: '15m',
        action: 'BUY',
        entry: 111.350,
        sl: 110.950,
        tp1: 112.550,
        tp2: 113.350,
        session: 'London',
        fvg_number: 1,
        createdAt: '2026-10-14T09:15:00.000Z',
        notes: 'Minor Pair CBDR: Direct London 1st 15m Bullish Imbalance entry on Wednesday session. 1:3 RR target running actively.'
      },
      {
        strategy: 'Stop Hunt',
        symbol: 'GBPUSD',
        timeframe: '5m',
        action: 'BUY',
        entry: 1.30150,
        sl: 1.29820,
        tp1: 1.30920,
        session: 'Post-Asian',
        asian_kz_completed: true,
        choch_confirmed: true,
        bpr_confirmed: true,
        notes: 'Asian low swept cleanly at 01:15 EST, printed bullish CHOCH, entering on fresh 5m BPR.'
      },
      {
        strategy: 'New York',
        symbol: 'NAS100',
        timeframe: '1m',
        action: 'BUY',
        entry: 20450.00,
        sl: 20400.00,
        tp1: 20550.00,
        tp2: 20680.00,
        tp3: 20800.00,
        session: 'NY Open',
        ny_15m_range_marked: true,
        ny_1m_choch: true,
        notes: '09:29 AM 15m range high tapped, 1m CHOCH to the upside with FVG loose entry.'
      },
      {
        strategy: 'Stop Hunt',
        symbol: 'XAUUSD',
        timeframe: '5m',
        action: 'SELL',
        entry: 2668.50,
        sl: 2678.00,
        tp1: 2642.00,
        session: 'London',
        asian_kz_completed: true,
        choch_confirmed: true,
        bpr_confirmed: true,
        notes: 'Gold Asian High swept -> 5m Red CHoCH + FVG entry -> TP Opposing Asian Low @ 2642.00.'
      }
    ];

    const seededSignals: Signal[] = [];

    sampleSignalsData.forEach((item, index) => {
      const symbol = item.symbol || 'EURUSD';
      const action = item.action as any;
      const entry = Number(item.entry);
      const sl = Number(item.sl);
      const tp1 = Number(item.tp1);

      // Validate
      const validation = validateStrategySignal(item, ipdaBiases);

      // Calculate Lots
      const lotResult = calculateLotSize({
        symbol,
        entry,
        sl,
        tp1,
        tp2: Number(item.tp2),
        tp3: Number(item.tp3),
        action
      }, riskSettings);

      const signalTime = item.createdAt || new Date(now.getTime() - (index * 14 * 60 * 1000)).toISOString();
      
      let status: any = 'IN_TRADE';
      let outcome: any = undefined;
      let realizedPnl: any = undefined;

      const signal: Signal = {
        id: `sig_demo_${index + 1}_${Math.random().toString(36).substring(2, 6)}`,
        strategy: validation.appliedStrategy,
        symbol,
        timeframe: item.timeframe || '15m',
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
        status,
        outcome,
        realized_pnl_usd: realizedPnl,
        session_name: item.session,
        notes: item.notes,
        raw_payload: item,
        created_at: signalTime,
        updated_at: signalTime
      };

      insertSignal(signal);
      seededSignals.push(signal);
    });

    broadcastSSE('HEARTBEAT', { message: 'Database reseeded successfully' });

    return NextResponse.json({
      success: true,
      message: 'Demo dataset and backtest trades reseeded successfully with Major PDH/PDL and Minor 1st Imbalance rules',
      signalsCount: seededSignals.length,
      riskSettings
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
