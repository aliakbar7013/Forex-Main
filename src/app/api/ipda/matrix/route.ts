import { NextResponse } from 'next/server';
import { getCentralBankRates, getPairOverridesMap } from '@/lib/db';
import { calculateFullIpdaMatrix } from '@/lib/ipdaEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rates = getCentralBankRates();
    const overrides = getPairOverridesMap();
    const matrix = calculateFullIpdaMatrix(rates, overrides);

    return NextResponse.json({
      success: true,
      rates,
      matrix,
      totalPairs: matrix.length,
      buyOnlyCount: matrix.filter(p => p.effectiveDirection === 'BUY_ONLY').length,
      sellOnlyCount: matrix.filter(p => p.effectiveDirection === 'SELL_ONLY').length,
      neutralCount: matrix.filter(p => p.effectiveDirection === 'NEUTRAL').length,
      disabledCount: matrix.filter(p => p.effectiveDirection === 'DISABLED').length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
