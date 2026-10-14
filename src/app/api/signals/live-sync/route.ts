import { NextResponse } from 'next/server';
import { syncLiveMarketSignals } from '@/lib/liveSignalsEngine';
import { getAllSignals } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncLiveMarketSignals();
    const signals = getAllSignals(50);
    return NextResponse.json({
      success: true,
      message: `Successfully synchronized real-time market prices from TradingView (OANDA Feed) for ${result.signals.length} active currency pairs.`,
      signals,
      quotes: result.quotes,
      count: signals.length
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncLiveMarketSignals();
    return NextResponse.json({
      success: true,
      signals: result.signals,
      quotes: result.quotes
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
