import { NextRequest, NextResponse } from 'next/server';
import { getRiskSettings, saveRiskSettings } from '@/lib/db';
import { calculateDefensiveRiskState } from '@/lib/riskEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getRiskSettings();
    const defensiveState = calculateDefensiveRiskState(settings);
    return NextResponse.json({
      settings: {
        ...settings,
        defensive_state: defensiveState.state,
        current_risk_percent: defensiveState.effectiveRiskPercent
      },
      defensiveInfo: defensiveState
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getRiskSettings();

    const newBalance = body.balance !== undefined ? Number(body.balance) : current.balance;
    const newHwm = body.high_water_mark !== undefined 
      ? Number(body.high_water_mark) 
      : Math.max(current.high_water_mark, newBalance);
    const newBaseRisk = body.base_risk_percent !== undefined ? Number(body.base_risk_percent) : current.base_risk_percent;
    const newConsecutiveLosses = body.consecutive_losses !== undefined ? Number(body.consecutive_losses) : current.consecutive_losses;

    let nextState: 'NORMAL' | 'REDUCED' | 'DEFENSIVE' = 'NORMAL';
    let nextRisk = newBaseRisk;

    if (newConsecutiveLosses >= 2) {
      nextState = 'DEFENSIVE';
      nextRisk = 0.25;
    } else if (newConsecutiveLosses === 1) {
      nextState = 'REDUCED';
      nextRisk = 0.5;
    }

    const updated = saveRiskSettings({
      balance: newBalance,
      high_water_mark: newHwm,
      base_risk_percent: newBaseRisk,
      current_risk_percent: nextRisk,
      defensive_state: nextState,
      consecutive_losses: newConsecutiveLosses,
      ...(body.resetStats ? {
        total_trades: 0,
        total_wins: 0,
        total_losses: 0,
        total_pnl: 0,
        max_drawdown_percent: 0,
        win_rate: 0
      } : {})
    });

    broadcastSSE('RISK_UPDATED', updated);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
