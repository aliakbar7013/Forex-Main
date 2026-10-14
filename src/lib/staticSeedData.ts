import { 
  Signal, 
  RiskSettings, 
  CentralBankRate,
  IPDABiasRecord
} from '@/types';

export const STATIC_IPDA_BIASES: IPDABiasRecord[] = [
  { asset: 'EURUSD', bias: 'BEARISH', timeframe: 'MONTHLY', notes: 'EUR (3.15%) / USD (4.50%) = 0.700 (< 1.0) -> SELL ONLY', updated_at: new Date().toISOString() },
  { asset: 'GBPUSD', bias: 'BULLISH', timeframe: 'MONTHLY', notes: 'GBP (4.75%) / USD (4.50%) = 1.056 (> 1.0) -> BUY ONLY', updated_at: new Date().toISOString() },
  { asset: 'USDJPY', bias: 'BULLISH', timeframe: 'MONTHLY', notes: 'USD (4.50%) / JPY (0.25%) = 18.000 (> 1.0) -> BUY ONLY', updated_at: new Date().toISOString() },
  { asset: 'USDCHF', bias: 'BULLISH', timeframe: 'MONTHLY', notes: 'USD (4.50%) / CHF (0.50%) = 9.000 (> 1.0) -> BUY ONLY', updated_at: new Date().toISOString() },
  { asset: 'USDCAD', bias: 'BULLISH', timeframe: 'MONTHLY', notes: 'USD (4.50%) / CAD (3.75%) = 1.200 (> 1.0) -> BUY ONLY', updated_at: new Date().toISOString() },
  { asset: 'AUDUSD', bias: 'BEARISH', timeframe: 'MONTHLY', notes: 'AUD (4.35%) / USD (4.50%) = 0.967 (< 1.0) -> SELL ONLY', updated_at: new Date().toISOString() },
  { asset: 'NZDUSD', bias: 'BULLISH', timeframe: 'MONTHLY', notes: 'NZD (4.75%) / USD (4.50%) = 1.056 (> 1.0) -> BUY ONLY', updated_at: new Date().toISOString() },
  { asset: 'XAUUSD', bias: 'BEARISH', timeframe: 'MONTHLY', notes: 'Gold CHF Proxy (0.50%) / USD (4.50%) = 0.111 (< 1.0) -> SELL ONLY', updated_at: new Date().toISOString() },
];

export const STATIC_DEFAULT_RISK: RiskSettings = {
  id: 'default_risk',
  balance: 50000,
  high_water_mark: 50000,
  base_risk_percent: 1.0,
  current_risk_percent: 1.0,
  defensive_state: 'NORMAL',
  consecutive_losses: 0,
  total_trades: 28,
  total_wins: 19,
  total_losses: 8,
  total_pnl: 14250,
  max_drawdown_percent: 2.4,
  win_rate: 67.8,
  updated_at: new Date().toISOString()
};

export const STATIC_CENTRAL_BANK_RATES: CentralBankRate[] = [
  { code: 'USD', currencyName: 'US Dollar', centralBankName: 'Federal Reserve (Fed)', rate: 4.50, lastUpdated: '2026-10-01', sourceUrl: 'https://federalreserve.gov' },
  { code: 'EUR', currencyName: 'Euro', centralBankName: 'European Central Bank (ECB)', rate: 3.25, lastUpdated: '2026-10-01', sourceUrl: 'https://ecb.europa.eu' },
  { code: 'GBP', currencyName: 'British Pound', centralBankName: 'Bank of England (BoE)', rate: 4.75, lastUpdated: '2026-10-01', sourceUrl: 'https://bankofengland.co.uk' },
  { code: 'JPY', currencyName: 'Japanese Yen', centralBankName: 'Bank of Japan (BoJ)', rate: 0.25, lastUpdated: '2026-10-01', sourceUrl: 'https://boj.or.jp' },
  { code: 'CHF', currencyName: 'Swiss Franc', centralBankName: 'Swiss National Bank (SNB)', rate: 1.00, lastUpdated: '2026-10-01', sourceUrl: 'https://snb.ch' },
  { code: 'AUD', currencyName: 'Australian Dollar', centralBankName: 'Reserve Bank of Australia (RBA)', rate: 4.35, lastUpdated: '2026-10-01', sourceUrl: 'https://rba.gov.au' },
  { code: 'NZD', currencyName: 'New Zealand Dollar', centralBankName: 'Reserve Bank of New Zealand (RBNZ)', rate: 4.75, lastUpdated: '2026-10-01', sourceUrl: 'https://rbnz.govt.nz' },
  { code: 'CAD', currencyName: 'Canadian Dollar', centralBankName: 'Bank of Canada (BoC)', rate: 3.75, lastUpdated: '2026-10-01', sourceUrl: 'https://bankofcanada.ca' },
];

export const STATIC_INITIAL_SIGNALS: Signal[] = [
  {
    id: 'cbdr-gbpnzd-01',
    symbol: 'GBPNZD',
    timeframe: '15m',
    action: 'BUY',
    entry: 2.14820,
    sl: 2.14480,
    tp1: 2.15840,
    status: 'IN_TRADE',
    strategy: 'CBDR',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 1.45,
    raw_quantity: 145000,
    risk_amount_usd: 500,
    sl_distance_price: 0.00340,
    sl_distance_pips_points: 34.0,
    targets: [],
    primary_risk_reward: 3.0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Focus #1: ICT CBDR 15m Cross Strategy. Asian Session Range valid (28.4 pips). 1st FVG tap confirmed.',
    raw_payload: {
      currentPrice: 2.15120,
      floatingPips: 30.0,
      asian_range_pips: 28.4,
      fvg_number: 1,
      fvg_price: 2.14820
    },
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'CBDR cross rules fully satisfied',
      checks: [
        { id: 'c1', name: 'Asian Session KZ Closed', passed: true, message: 'Asian Range = 28.4 pips (< 40 pips limit)', severity: 'INFO' },
        { id: 'c2', name: 'Cross Direct FVG Rule', passed: true, message: 'Direct entry on 1st 15m FVG (No sweep needed for crosses)', severity: 'INFO' },
        { id: 'c3', name: 'Monday-Wednesday Window', passed: true, message: 'Valid institutional trading day', severity: 'INFO' },
        { id: 'c4', name: '1:3 Risk Reward Minimum', passed: true, message: 'Planned RR = 1:3.00', severity: 'INFO' }
      ]
    }
  },
  {
    id: 'cbdr-eurusd-02',
    symbol: 'EURUSD',
    timeframe: '15m',
    action: 'SELL',
    entry: 1.08650,
    sl: 1.08880,
    tp1: 1.07960,
    status: 'IN_TRADE',
    strategy: 'CBDR',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 2.17,
    raw_quantity: 217000,
    risk_amount_usd: 500,
    sl_distance_price: 0.00230,
    sl_distance_pips_points: 23.0,
    targets: [],
    primary_risk_reward: 3.0,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Focus #1: ICT CBDR 15m Major Strategy. Previous Day High (PDH) sweep confirmed.',
    raw_payload: {
      currentPrice: 1.08480,
      floatingPips: 17.0,
      sweep_target: 'PDH',
      sweep_price: 1.08720
    },
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'CBDR major rules fully satisfied',
      checks: [
        { id: 'm1', name: 'Asian Range Valid', passed: true, message: 'Asian Range = 21.2 pips', severity: 'INFO' },
        { id: 'm2', name: 'PDH Liquidity Sweep', passed: true, message: 'Swept PDH by 4.2 pips then displaced downward', severity: 'INFO' },
        { id: 'm3', name: 'Displacement FVG Formed', passed: true, message: '15m bearish FVG created and filled', severity: 'INFO' },
        { id: 'm4', name: '1:3 Risk Reward Ratio', passed: true, message: 'Planned RR = 1:3.00', severity: 'INFO' }
      ]
    }
  },
  {
    id: 'ny-xauusd-03',
    symbol: 'XAUUSD',
    timeframe: '15m',
    action: 'BUY',
    entry: 2642.50,
    sl: 2635.00,
    tp1: 2665.00,
    status: 'IN_TRADE',
    strategy: 'NEW_YORK',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 0.67,
    raw_quantity: 67,
    risk_amount_usd: 500,
    sl_distance_price: 7.50,
    sl_distance_pips_points: 75.0,
    targets: [],
    primary_risk_reward: 3.0,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Focus #2: ICT New York Open Strategy. 15m range marked, 1m CHoCH expansion toward buy-side liquidity.',
    raw_payload: {
      currentPrice: 2648.80,
      floatingPips: 63.0,
      ny_open_kz: true
    },
    validation: {
      isValid: true,
      appliedStrategy: 'NEW_YORK',
      overallStatus: 'PASSED',
      summary: 'New York Open rules fully satisfied',
      checks: [
        { id: 'ny1', name: 'NY Killzone Active', passed: true, message: 'Executed within 07:00-10:00 EST', severity: 'INFO' },
        { id: 'ny2', name: '15m Institutional Range', passed: true, message: 'Swept discount liquidity before NY open', severity: 'INFO' },
        { id: 'ny3', name: '1m CHoCH Confirmation', passed: true, message: 'Bullish market structure shift on 1m chart', severity: 'INFO' },
        { id: 'ny4', name: '1:3 Target Reached', passed: true, message: 'Planned RR = 1:3.00', severity: 'INFO' }
      ]
    }
  },
  {
    id: 'cbdr-gbpusd-04',
    symbol: 'GBPUSD',
    timeframe: '15m',
    action: 'BUY',
    entry: 1.29850,
    sl: 1.29580,
    tp1: 1.30660,
    status: 'IN_TRADE',
    strategy: 'CBDR',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 1.85,
    raw_quantity: 185000,
    risk_amount_usd: 500,
    sl_distance_price: 0.00270,
    sl_distance_pips_points: 27.0,
    targets: [],
    primary_risk_reward: 3.0,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Focus #1: ICT CBDR 15m Major Strategy. Previous Day Low (PDL) swept during London Open.',
    raw_payload: {
      currentPrice: 1.30210,
      floatingPips: 36.0,
      sweep_target: 'PDL'
    },
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'CBDR major rules fully satisfied',
      checks: [
        { id: 'gu1', name: 'Asian Range Valid', passed: true, message: 'Asian Range = 24.0 pips', severity: 'INFO' },
        { id: 'gu2', name: 'PDL Liquidity Sweep', passed: true, message: 'Swept PDL at 1.29490', severity: 'INFO' },
        { id: 'gu3', name: 'Displacement FVG Formed', passed: true, message: '15m bullish FVG tapped at 1.29850', severity: 'INFO' },
        { id: 'gu4', name: '1:3 Risk Reward Ratio', passed: true, message: 'Planned RR = 1:3.00', severity: 'INFO' }
      ]
    }
  }
];
