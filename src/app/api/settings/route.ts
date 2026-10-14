import { NextResponse } from 'next/server';
import { setAppSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    activeProvider: 'TRADINGVIEW',
    message: 'TradingView Real-Time Institutional Feed Active'
  });
}

export async function POST() {
  setAppSetting('active_data_provider', 'TRADINGVIEW');
  return NextResponse.json({
    success: true,
    activeProvider: 'TRADINGVIEW',
    message: 'TradingView live market feed active.'
  });
}
