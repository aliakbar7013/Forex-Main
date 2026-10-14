import { NextRequest, NextResponse } from 'next/server';
import { setPairOverride, getPairOverridesMap, getCentralBankRates } from '@/lib/db';
import { calculateFullIpdaMatrix } from '@/lib/ipdaEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { IPDAOverrideMode } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, override_mode, notes } = body;

    if (!symbol || !override_mode) {
      return NextResponse.json({ error: 'Symbol and override_mode (AUTO, FORCE_BUY, FORCE_SELL, DISABLED) are required' }, { status: 400 });
    }

    const validModes: IPDAOverrideMode[] = ['AUTO', 'FORCE_BUY', 'FORCE_SELL', 'DISABLED'];
    if (!validModes.includes(override_mode)) {
      return NextResponse.json({ error: `Invalid override_mode. Must be one of: ${validModes.join(', ')}` }, { status: 400 });
    }

    const saved = setPairOverride(symbol, override_mode, notes || '');
    const rates = getCentralBankRates();
    const overrides = getPairOverridesMap();
    const updatedMatrix = calculateFullIpdaMatrix(rates, overrides);

    broadcastSSE('IPDA_UPDATED', { matrix: updatedMatrix, override: saved });

    return NextResponse.json({
      success: true,
      override: saved,
      matrix: updatedMatrix
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
