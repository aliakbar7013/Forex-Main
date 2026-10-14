/**
 * TradingView Live Data Engine
 * Fetches real-time market prices, bid, ask, and daily OHLC directly from
 * TradingView's official scanner servers (OANDA & FX_IDC broker feeds).
 * Provides sub-second exact prices running on TradingView charts for all 28 Forex pairs + Gold.
 */

export interface TradingViewLiveQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  source: string;
  lastUpdated: string;
}

export const ALL_FOREX_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
  'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD',
  'NZDJPY', 'NZDCHF', 'NZDCAD',
  'CADJPY', 'CADCHF', 'CHFJPY',
  'XAUUSD'
];

// In-memory cache to guarantee instant response and resilient fallback
let cachedQuotes: Record<string, TradingViewLiveQuote> = {};
let lastCacheTime = 0;

/**
 * Fetch real-time live quotes for all Forex pairs and Gold directly from TradingView.
 */
export async function fetchAllTradingViewLiveQuotes(): Promise<Record<string, TradingViewLiveQuote>> {
  const now = Date.now();
  // Return cached quotes if less than 1.5s old
  if (now - lastCacheTime < 1500 && Object.keys(cachedQuotes).length >= 25) {
    return cachedQuotes;
  }

  const result: Record<string, TradingViewLiveQuote> = { ...cachedQuotes };
  const timestamp = new Date().toISOString();

  // 1. Fetch all 28 Forex pairs from TradingView Forex Scanner
  try {
    const fxTickers = ALL_FOREX_SYMBOLS
      .filter(s => s !== 'XAUUSD')
      .map(s => `OANDA:${s}`);

    const res = await fetch('https://scanner.tradingview.com/forex/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        symbols: { tickers: fxTickers },
        columns: ['close', 'open', 'high', 'low', 'change', 'bid', 'ask', 'change_abs']
      }),
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          const rawTicker = item.s || '';
          const symbol = rawTicker.replace('OANDA:', '').replace('FX_IDC:', '').replace('FX:', '').trim();
          const d = item.d || [];
          const price = Number(d[0]) || 0;
          if (symbol && price > 0) {
            result[symbol] = {
              symbol,
              price,
              open: Number(d[1]) || price,
              high: Number(d[2]) || price,
              low: Number(d[3]) || price,
              changePercent: Number(d[4]) || 0,
              bid: Number(d[5]) || price,
              ask: Number(d[6]) || price,
              change: Number(d[7]) || 0,
              source: 'TradingView (OANDA Feed)',
              lastUpdated: timestamp
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('TradingView Forex scanner request error:', err);
  }

  // 2. Fetch Gold (XAUUSD) from TradingView CFD Scanner
  try {
    const goldTickers = ['OANDA:XAUUSD', 'TVC:GOLD', 'CAPITALCOM:GOLD'];
    const goldRes = await fetch('https://scanner.tradingview.com/cfd/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        symbols: { tickers: goldTickers },
        columns: ['close', 'open', 'high', 'low', 'change', 'bid', 'ask', 'change_abs']
      }),
      cache: 'no-store'
    });

    if (goldRes.ok) {
      const goldData = await goldRes.json();
      if (Array.isArray(goldData.data) && goldData.data.length > 0) {
        const item = goldData.data[0];
        const d = item.d || [];
        const price = Number(d[0]) || 0;
        if (price > 0) {
          result['XAUUSD'] = {
            symbol: 'XAUUSD',
            price,
            open: Number(d[1]) || price,
            high: Number(d[2]) || price,
            low: Number(d[3]) || price,
            changePercent: Number(d[4]) || 0,
            bid: Number(d[5]) || price,
            ask: Number(d[6]) || price,
            change: Number(d[7]) || 0,
            source: 'TradingView (OANDA Gold Feed)',
            lastUpdated: timestamp
          };
        }
      }
    }
  } catch (err) {
    console.warn('TradingView CFD Gold scanner request error:', err);
  }

  if (Object.keys(result).length > 0) {
    cachedQuotes = result;
    lastCacheTime = now;
  }

  return result;
}

/**
 * Fetch a single pair's live real-time price from TradingView.
 */
export async function fetchTradingViewPrice(symbol: string): Promise<TradingViewLiveQuote | null> {
  const norm = symbol.toUpperCase().replace('/', '').replace('_', '');
  const quotes = await fetchAllTradingViewLiveQuotes();
  return quotes[norm] || null;
}
