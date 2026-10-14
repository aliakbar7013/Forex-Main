import { NextRequest, NextResponse } from 'next/server';
import { 
  getSignalById, 
  updateSignalStatus, 
  deleteSignal, 
  getRiskSettings, 
  saveRiskSettings, 
  insertTradeLog 
} from '@/lib/db';
import { applyTradeOutcomeToRiskSettings } from '@/lib/riskEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { SignalStatus, TradeLog } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signal = getSignalById(id);
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }
    return NextResponse.json({ signal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signal = getSignalById(id);
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, outcome, pnlUsd, exitPrice } = body;

    const newStatus: SignalStatus = status || signal.status;
    const newOutcome = outcome || signal.outcome;

    // If an outcome is explicitly marked (WIN, LOSS, BE), update Defensive Risk Engine
    let currentRisk = getRiskSettings();
    let updatedRiskSettings = currentRisk;
    let pnlAmount = pnlUsd;

    if (outcome) {
      // Auto-calculate PnL if not specified
      if (pnlAmount === undefined) {
        if (outcome === 'WIN') {
          pnlAmount = signal.targets[0]?.potentialProfitUsd || (signal.risk_amount_usd * signal.primary_risk_reward);
        } else if (outcome === 'LOSS') {
          pnlAmount = -signal.risk_amount_usd;
        } else {
          pnlAmount = 0;
        }
      }

      const outcomeResult = applyTradeOutcomeToRiskSettings(
        currentRisk,
        outcome,
        pnlAmount
      );

      updatedRiskSettings = saveRiskSettings(outcomeResult.updatedSettings);

      // Log to Trade History
      const tradeLog: TradeLog = {
        id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        signal_id: signal.id,
        symbol: signal.symbol,
        strategy: signal.strategy,
        action: signal.action,
        outcome,
        realized_pnl: pnlAmount,
        risk_percent_used: signal.risk_percent,
        risk_amount_usd: signal.risk_amount_usd,
        balance_before: currentRisk.balance,
        balance_after: outcomeResult.updatedSettings.balance,
        consecutive_losses_after: outcomeResult.updatedSettings.consecutive_losses,
        defensive_state_after: outcomeResult.updatedSettings.defensive_state,
        created_at: new Date().toISOString()
      };
      insertTradeLog(tradeLog);

      // Broadcast Risk Update to all clients
      broadcastSSE('RISK_UPDATED', updatedRiskSettings);
    }

    const isResolved = newStatus === 'SL_HIT' || newStatus === 'TP1_HIT' || newStatus === 'TP2_HIT' || newStatus === 'CLOSED_PROFIT' || newStatus === 'CANCELLED' || newOutcome === 'WIN' || newOutcome === 'LOSS' || newOutcome === 'BE';

    const updatedSignal = updateSignalStatus(
      id,
      newStatus,
      newOutcome,
      pnlAmount,
      exitPrice !== undefined ? exitPrice : signal.exit_price
    );

    if (isResolved) {
      broadcastSSE('TRADE_RESOLVED', {
        id: signal.id,
        symbol: signal.symbol,
        outcome: newOutcome || (newStatus === 'SL_HIT' ? 'LOSS' : 'WIN'),
        pnl: pnlAmount || 0,
        exitPrice: exitPrice || (newStatus === 'SL_HIT' ? signal.sl : signal.tp1)
      });
      broadcastSSE('SIGNAL_DELETED', { id: signal.id });
    } else if (updatedSignal) {
      broadcastSSE('SIGNAL_UPDATED', updatedSignal);
    }

    return NextResponse.json({
      success: true,
      signal: updatedSignal,
      archived: isResolved,
      riskSettings: updatedRiskSettings
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteSignal(id);
    if (!success) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    broadcastSSE('SIGNAL_DELETED', { id });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
