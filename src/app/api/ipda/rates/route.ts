import { NextRequest, NextResponse } from 'next/server';
import { getCentralBankRates, saveCentralBankRate, saveAllCentralBankRates, getPairOverridesMap } from '@/lib/db';
import { calculateFullIpdaMatrix } from '@/lib/ipdaEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { CurrencyCode } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rates = getCentralBankRates();
    return NextResponse.json({ success: true, rates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.rates)) {
      // Bulk update
      const updatedRates = saveAllCentralBankRates(body.rates);
      const overrides = getPairOverridesMap();
      const updatedMatrix = calculateFullIpdaMatrix(updatedRates, overrides);

      broadcastSSE('IPDA_UPDATED', { rates: updatedRates, matrix: updatedMatrix });
      return NextResponse.json({ success: true, rates: updatedRates, matrix: updatedMatrix });
    }

    const { code, rate } = body;
    if (!code || rate === undefined) {
      return NextResponse.json({ error: 'Currency code and rate are required' }, { status: 400 });
    }

    const updated = saveCentralBankRate(code as CurrencyCode, Number(rate));
    const allRates = getCentralBankRates();
    const overrides = getPairOverridesMap();
    const updatedMatrix = calculateFullIpdaMatrix(allRates, overrides);

    broadcastSSE('IPDA_UPDATED', { rates: allRates, matrix: updatedMatrix, updatedRate: updated });
    return NextResponse.json({ success: true, rate: updated, rates: allRates, matrix: updatedMatrix });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
