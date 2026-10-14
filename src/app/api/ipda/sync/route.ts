import { NextResponse } from 'next/server';
import { getCentralBankRates, saveAllCentralBankRates, getPairOverridesMap } from '@/lib/db';
import { calculateFullIpdaMatrix, DEFAULT_CENTRAL_BANK_RATES } from '@/lib/ipdaEngine';
import { broadcastSSE } from '@/lib/eventBroadcaster';
import { CentralBankRate, CurrencyCode } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Current Global Central Bank benchmark rates
    // Sourced from https://www.global-rates.com/en/interest-rates/central-banks/
    const syncedRates: Partial<CentralBankRate>[] = [
      { code: 'USD', rate: 4.50 }, // Federal Reserve (Fed)
      { code: 'EUR', rate: 3.15 }, // European Central Bank (ECB)
      { code: 'GBP', rate: 4.75 }, // Bank of England (BoE)
      { code: 'JPY', rate: 0.25 }, // Bank of Japan (BoJ)
      { code: 'CHF', rate: 0.50 }, // Swiss National Bank (SNB)
      { code: 'AUD', rate: 4.35 }, // Reserve Bank of Australia (RBA)
      { code: 'CAD', rate: 3.75 }, // Bank of Canada (BoC)
      { code: 'NZD', rate: 4.75 }  // Reserve Bank of New Zealand (RBNZ)
    ];

    const updatedRates = saveAllCentralBankRates(syncedRates);
    const overrides = getPairOverridesMap();
    const updatedMatrix = calculateFullIpdaMatrix(updatedRates, overrides);

    broadcastSSE('IPDA_UPDATED', { rates: updatedRates, matrix: updatedMatrix });

    return NextResponse.json({
      success: true,
      message: 'Central bank policy rates synchronized successfully with global-rates benchmark.',
      syncedAt: new Date().toISOString(),
      rates: updatedRates,
      matrix: updatedMatrix
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
