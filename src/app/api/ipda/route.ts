import { NextRequest, NextResponse } from 'next/server';
import { getCentralBankRates, getPairOverridesMap, setPairOverride } from '@/lib/db';
import { calculateFullIpdaMatrix } from '@/lib/ipdaEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';

const PRIMARY_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'XAUUSD'];

export async function GET() {
  try {
    const rates = getCentralBankRates();
    const overrides = getPairOverridesMap();
    const matrix = calculateFullIpdaMatrix(rates, overrides);

    const biases = PRIMARY_PAIRS.map(sym => {
      const p = matrix.find(m => m.symbol === sym);
      const isBullish = p ? p.effectiveDirection === 'BUY_ONLY' : false;
      return {
        asset: sym,
        bias: (isBullish ? 'BULLISH' : 'BEARISH') as 'BULLISH' | 'BEARISH',
        timeframe: 'MONTHLY',
        ratio: p?.ratio ?? 1.0,
        notes: p ? p.ratioFormula : '',
        updated_at: p?.lastUpdated || new Date().toISOString()
      };
    });

    return NextResponse.json({ biases, matrix });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset, bias, notes } = body;

    if (!asset || !bias || (bias !== 'BULLISH' && bias !== 'BEARISH')) {
      return NextResponse.json({ error: 'Asset and valid bias (BULLISH or BEARISH) are required' }, { status: 400 });
    }

    // Set override in pair_overrides table so it reflects in the IPDA matrix
    const overrideMode = bias === 'BULLISH' ? 'FORCE_BUY' : 'FORCE_SELL';
    setPairOverride(asset, overrideMode, notes || 'User manual toggle');

    const rates = getCentralBankRates();
    const overrides = getPairOverridesMap();
    const matrix = calculateFullIpdaMatrix(rates, overrides);

    const biases = PRIMARY_PAIRS.map(sym => {
      const p = matrix.find(m => m.symbol === sym);
      const isBullish = p ? p.effectiveDirection === 'BUY_ONLY' : false;
      return {
        asset: sym,
        bias: (isBullish ? 'BULLISH' : 'BEARISH') as 'BULLISH' | 'BEARISH',
        timeframe: 'MONTHLY',
        ratio: p?.ratio ?? 1.0,
        notes: p ? p.ratioFormula : '',
        updated_at: p?.lastUpdated || new Date().toISOString()
      };
    });

    broadcastSSE('IPDA_UPDATED', { biases, matrix });

    return NextResponse.json({ success: true, biases, matrix });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
