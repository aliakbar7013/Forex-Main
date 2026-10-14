import { 
  CentralBankRate, 
  CurrencyCode, 
  IPDAPairBias, 
  IPDADirection, 
  IPDAOverrideMode, 
  PairCategory, 
  TradeAction 
} from '@/types';

// Default Central Bank Rates sourced from global-rates.com / central bank official rates
export const DEFAULT_CENTRAL_BANK_RATES: CentralBankRate[] = [
  {
    code: 'USD',
    currencyName: 'US Dollar',
    centralBankName: 'Federal Reserve (Fed)',
    rate: 4.50,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/american-fed/'
  },
  {
    code: 'EUR',
    currencyName: 'Euro',
    centralBankName: 'European Central Bank (ECB)',
    rate: 3.15,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/european-central-bank/'
  },
  {
    code: 'GBP',
    currencyName: 'British Pound',
    centralBankName: 'Bank of England (BoE)',
    rate: 4.75,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-england/'
  },
  {
    code: 'JPY',
    currencyName: 'Japanese Yen',
    centralBankName: 'Bank of Japan (BoJ)',
    rate: 0.25,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-japan/'
  },
  {
    code: 'CHF',
    currencyName: 'Swiss Franc',
    centralBankName: 'Swiss National Bank (SNB)',
    rate: 0.50, // Benchmark SNB rate
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/swiss-national-bank/'
  },
  {
    code: 'AUD',
    currencyName: 'Australian Dollar',
    centralBankName: 'Reserve Bank of Australia (RBA)',
    rate: 4.35,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/reserve-bank-of-australia/'
  },
  {
    code: 'CAD',
    currencyName: 'Canadian Dollar',
    centralBankName: 'Bank of Canada (BoC)',
    rate: 3.75,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-canada/'
  },
  {
    code: 'NZD',
    currencyName: 'New Zealand Dollar',
    centralBankName: 'Reserve Bank of New Zealand (RBNZ)',
    rate: 4.75,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://www.global-rates.com/en/interest-rates/central-banks/reserve-bank-of-new-zealand/'
  }
];

export interface PairDefinition {
  symbol: string;
  name: string;
  category: PairCategory;
  baseCurrency: CurrencyCode | 'XAU';
  quoteCurrency: CurrencyCode;
  flagBase: string;
  flagQuote: string;
}

// Master list of all 28 supported Tradable Forex & Commodity Pairs
export const SUPPORTED_PAIRS: PairDefinition[] = [
  // 1. Commodities
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', category: 'COMMODITY', baseCurrency: 'XAU', quoteCurrency: 'USD', flagBase: '🥇', flagQuote: '🇺🇸' },

  // 2. Majors
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'MAJOR', baseCurrency: 'EUR', quoteCurrency: 'USD', flagBase: '🇪🇺', flagQuote: '🇺🇸' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'MAJOR', baseCurrency: 'GBP', quoteCurrency: 'USD', flagBase: '🇬🇧', flagQuote: '🇺🇸' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'MAJOR', baseCurrency: 'USD', quoteCurrency: 'JPY', flagBase: '🇺🇸', flagQuote: '🇯🇵' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'MAJOR', baseCurrency: 'USD', quoteCurrency: 'CHF', flagBase: '🇺🇸', flagQuote: '🇨🇭' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'MAJOR', baseCurrency: 'AUD', quoteCurrency: 'USD', flagBase: '🇦🇺', flagQuote: '🇺🇸' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'MAJOR', baseCurrency: 'USD', quoteCurrency: 'CAD', flagBase: '🇺🇸', flagQuote: '🇨🇦' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'MAJOR', baseCurrency: 'NZD', quoteCurrency: 'USD', flagBase: '🇳🇿', flagQuote: '🇺🇸' },

  // 3. Yen Crosses
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'EUR', quoteCurrency: 'JPY', flagBase: '🇪🇺', flagQuote: '🇯🇵' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'GBP', quoteCurrency: 'JPY', flagBase: '🇬🇧', flagQuote: '🇯🇵' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'AUD', quoteCurrency: 'JPY', flagBase: '🇦🇺', flagQuote: '🇯🇵' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'CAD', quoteCurrency: 'JPY', flagBase: '🇨🇦', flagQuote: '🇯🇵' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'CHF', quoteCurrency: 'JPY', flagBase: '🇨🇭', flagQuote: '🇯🇵' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', category: 'YEN_CROSS', baseCurrency: 'NZD', quoteCurrency: 'JPY', flagBase: '🇳🇿', flagQuote: '🇯🇵' },

  // 4. Pound & Euro Crosses
  { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'POUND_EURO_CROSS', baseCurrency: 'EUR', quoteCurrency: 'GBP', flagBase: '🇪🇺', flagQuote: '🇬🇧' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'EUR', quoteCurrency: 'AUD', flagBase: '🇪🇺', flagQuote: '🇦🇺' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'EUR', quoteCurrency: 'CAD', flagBase: '🇪🇺', flagQuote: '🇨🇦' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'EUR', quoteCurrency: 'NZD', flagBase: '🇪🇺', flagQuote: '🇳🇿' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc', category: 'POUND_EURO_CROSS', baseCurrency: 'EUR', quoteCurrency: 'CHF', flagBase: '🇪🇺', flagQuote: '🇨🇭' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'GBP', quoteCurrency: 'AUD', flagBase: '🇬🇧', flagQuote: '🇦🇺' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'GBP', quoteCurrency: 'CAD', flagBase: '🇬🇧', flagQuote: '🇨🇦' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar', category: 'POUND_EURO_CROSS', baseCurrency: 'GBP', quoteCurrency: 'NZD', flagBase: '🇬🇧', flagQuote: '🇳🇿' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', category: 'POUND_EURO_CROSS', baseCurrency: 'GBP', quoteCurrency: 'CHF', flagBase: '🇬🇧', flagQuote: '🇨🇭' },

  // 5. Commodity Crosses
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', category: 'COMMODITY_CROSS', baseCurrency: 'AUD', quoteCurrency: 'CAD', flagBase: '🇦🇺', flagQuote: '🇨🇦' },
  { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', category: 'COMMODITY_CROSS', baseCurrency: 'AUD', quoteCurrency: 'NZD', flagBase: '🇦🇺', flagQuote: '🇳🇿' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', category: 'COMMODITY_CROSS', baseCurrency: 'AUD', quoteCurrency: 'CHF', flagBase: '🇦🇺', flagQuote: '🇨🇭' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', category: 'COMMODITY_CROSS', baseCurrency: 'CAD', quoteCurrency: 'CHF', flagBase: '🇨🇦', flagQuote: '🇨🇭' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', category: 'COMMODITY_CROSS', baseCurrency: 'NZD', quoteCurrency: 'CAD', flagBase: '🇳🇿', flagQuote: '🇨🇦' },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc', category: 'COMMODITY_CROSS', baseCurrency: 'NZD', quoteCurrency: 'CHF', flagBase: '🇳🇿', flagQuote: '🇨🇭' }
];

/**
 * Calculates IPDA interest rate ratio and direction for a specific pair.
 */
export function calculatePairIpdaBias(
  pair: PairDefinition,
  rates: CentralBankRate[],
  override: IPDAOverrideMode = 'AUTO'
): IPDAPairBias {
  const isCommodityProxy = pair.symbol.toUpperCase() === 'XAUUSD' || pair.baseCurrency === 'XAU';
  
  // For Gold (XAUUSD), Gold's yield proxy is mapped directly to Swiss Franc (CHF)
  const effectiveBaseCode = isCommodityProxy ? 'CHF' : pair.baseCurrency;
  const quoteCode = pair.quoteCurrency;

  const baseRateObj = rates.find(r => r.code === effectiveBaseCode) || {
    code: effectiveBaseCode as CurrencyCode,
    currencyName: isCommodityProxy ? 'Gold (CHF Proxy)' : effectiveBaseCode,
    centralBankName: isCommodityProxy ? 'Swiss National Bank (SNB Proxy)' : `${effectiveBaseCode} Central Bank`,
    rate: 0.50,
    lastUpdated: new Date().toISOString(),
    sourceUrl: ''
  };

  const quoteRateObj = rates.find(r => r.code === quoteCode) || {
    code: quoteCode,
    currencyName: quoteCode,
    centralBankName: `${quoteCode} Central Bank`,
    rate: 4.50,
    lastUpdated: new Date().toISOString(),
    sourceUrl: ''
  };

  const baseRate = baseRateObj.rate;
  const rawQuoteRate = quoteRateObj.rate;

  // Zero-Rate Handling as specified:
  // - If denominator (Quote Rate) is 0.0%, clamp to 0.01% to avoid division by zero
  const safeQuoteRate = rawQuoteRate <= 0.0 ? 0.01 : rawQuoteRate;

  // - If numerator (Base Rate) is 0.0% and Quote Rate > 0, Ratio = 0.0 (< 1.0) -> SELL ONLY
  let ratio = 0.0;
  if (baseRate > 0) {
    ratio = baseRate / safeQuoteRate;
  }

  // Decision Matrix:
  // - If Ratio > 1.0: BUY ONLY
  // - If Ratio < 1.0: SELL ONLY
  // - If Ratio == 1.0: NEUTRAL
  let direction: IPDADirection = 'NEUTRAL';
  if (ratio > 1.0000001) {
    direction = 'BUY_ONLY';
  } else if (ratio < 0.9999999) {
    direction = 'SELL_ONLY';
  } else {
    direction = 'NEUTRAL';
  }

  // Determine Effective Direction with manual override
  let effectiveDirection: IPDADirection | 'DISABLED' = direction;
  if (override === 'FORCE_BUY') {
    effectiveDirection = 'BUY_ONLY';
  } else if (override === 'FORCE_SELL') {
    effectiveDirection = 'SELL_ONLY';
  } else if (override === 'DISABLED') {
    effectiveDirection = 'DISABLED';
  }

  const roundedRatio = Number(ratio.toFixed(3));
  const proxyNote = isCommodityProxy 
    ? `Special Commodity Proxy Rule: XAUUSD rate mapped to Swiss Franc (SNB: ${baseRate.toFixed(2)}%) / USD (Fed: ${rawQuoteRate.toFixed(2)}%)`
    : undefined;

  const ratioFormula = isCommodityProxy
    ? `Ratio = Rate_CHF (${baseRate.toFixed(2)}%) / Rate_USD (${rawQuoteRate.toFixed(2)}%) = ${roundedRatio}`
    : `Ratio = Rate_${pair.baseCurrency} (${baseRate.toFixed(2)}%) / Rate_${pair.quoteCurrency} (${rawQuoteRate.toFixed(2)}%) = ${roundedRatio}`;

  return {
    symbol: pair.symbol,
    name: pair.name,
    category: pair.category,
    baseCurrency: pair.baseCurrency,
    quoteCurrency: pair.quoteCurrency,
    baseRate,
    quoteRate: rawQuoteRate,
    baseCentralBank: isCommodityProxy ? 'Swiss National Bank (SNB Proxy)' : baseRateObj.centralBankName,
    quoteCentralBank: quoteRateObj.centralBankName,
    ratio: roundedRatio,
    ratioFormula,
    direction,
    override,
    effectiveDirection,
    isCommodityProxy,
    proxyNote,
    flagBase: pair.flagBase,
    flagQuote: pair.flagQuote,
    lastUpdated: baseRateObj.lastUpdated || new Date().toISOString()
  };
}

/**
 * Calculates the complete IPDA Direction Matrix for all 28 supported pairs.
 */
export function calculateFullIpdaMatrix(
  rates: CentralBankRate[],
  overridesMap: Map<string, IPDAOverrideMode> = new Map()
): IPDAPairBias[] {
  return SUPPORTED_PAIRS.map(pair => {
    const override = overridesMap.get(pair.symbol.toUpperCase()) || 'AUTO';
    return calculatePairIpdaBias(pair, rates, override);
  });
}

/**
 * Checks whether an incoming TradingView signal action (BUY or SELL) is permitted for the given symbol.
 */
export function checkSignalIpdaPermitted(
  symbol: string,
  action: TradeAction,
  rates: CentralBankRate[],
  overridesMap: Map<string, IPDAOverrideMode> = new Map()
): {
  permitted: boolean;
  effectiveDirection: IPDADirection | 'DISABLED';
  reason?: string;
  details?: IPDAPairBias;
} {
  const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Find pair definition
  const pairDef = SUPPORTED_PAIRS.find(p => p.symbol.toUpperCase() === cleanSym) || {
    symbol: cleanSym,
    name: cleanSym,
    category: 'MAJOR' as PairCategory,
    baseCurrency: cleanSym.substring(0, 3) as CurrencyCode,
    quoteCurrency: (cleanSym.length >= 6 ? cleanSym.substring(3, 6) : 'USD') as CurrencyCode,
    flagBase: '🌐',
    flagQuote: '🌐'
  };

  const override = overridesMap.get(cleanSym) || 'AUTO';
  const bias = calculatePairIpdaBias(pairDef, rates, override);

  if (bias.effectiveDirection === 'DISABLED') {
    return {
      permitted: false,
      effectiveDirection: 'DISABLED',
      reason: `Pair ${cleanSym} is currently DISABLED in the IPDA Direction Filter`,
      details: bias
    };
  }

  if (bias.effectiveDirection === 'NEUTRAL') {
    return {
      permitted: false,
      effectiveDirection: 'NEUTRAL',
      reason: `Interest rate ratio is 1.0 (Neutral parity). No institutional statistical edge on ${cleanSym}.`,
      details: bias
    };
  }

  if (action === 'BUY' && bias.effectiveDirection === 'SELL_ONLY') {
    return {
      permitted: false,
      effectiveDirection: 'SELL_ONLY',
      reason: `Violates IPDA Bearish Bias (Ratio ${bias.ratio} < 1.0: Base ${bias.baseRate}% / Quote ${bias.quoteRate}%). Only SELL signals are permitted.`,
      details: bias
    };
  }

  if (action === 'SELL' && bias.effectiveDirection === 'BUY_ONLY') {
    return {
      permitted: false,
      effectiveDirection: 'BUY_ONLY',
      reason: `Violates IPDA Bullish Bias (Ratio ${bias.ratio} > 1.0: Base ${bias.baseRate}% / Quote ${bias.quoteRate}%). Only BUY signals are permitted.`,
      details: bias
    };
  }

  return {
    permitted: true,
    effectiveDirection: bias.effectiveDirection,
    details: bias
  };
}
