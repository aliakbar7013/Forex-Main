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
    id: 'sig_live_sh_eurusd',
    symbol: 'EURUSD',
    strategy: 'STOP_HUNT',
    timeframe: '5m',
    action: 'SELL',
    entry: 1.08720,
    sl: 1.08960,
    tp1: 1.08280,
    status: 'IN_TRADE',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 2.08,
    raw_quantity: 208000,
    risk_amount_usd: 1000,
    sl_distance_price: 0.00240,
    sl_distance_pips_points: 24.0,
    primary_risk_reward: 1.83,
    targets: [{ targetIndex: 1, price: 1.08280, percentage: 100, lots: 2.08, potentialProfitUsd: 1830, riskRewardRatio: 1.83, hit: false }],
    validation: {
      isValid: true,
      appliedStrategy: 'STOP_HUNT',
      overallStatus: 'PASSED',
      summary: 'Asian High swept post-01:00 NY -> 5m Red CHoCH + FVG entry -> TP Opposing Asian Low',
      checks: [
        { id: 'sh1', name: 'Asian Killzone (21:00-01:00 NY)', passed: true, message: 'Observation window closed. High/Low marked.', severity: 'INFO' },
        { id: 'sh2', name: 'Post-01:00 NY Sweep', passed: true, message: 'Swept Asian High at 1.08920 cleanly.', severity: 'INFO' },
        { id: 'sh3', name: '5m Red CHoCH & FVG', passed: true, message: 'Structure shift and 5m FVG retest confirmed at 1.08720.', severity: 'INFO' },
        { id: 'sh4', name: 'Opposing Asian Low TP', passed: true, message: 'Targeting Asian Low at 1.08280.', severity: 'INFO' }
      ]
    },
    created_at: '2026-10-16T04:15:00.000Z',
    updated_at: new Date().toISOString(),
    session_name: 'Post-Asian KZ (04:15 NY)',
    notes: '[IPDA SELL_ONLY] [Stop Hunt 5m] Swept Asian High. 5m Red CHoCH & FVG Retest @ 1.08720. SL: 1.08960. TP: Opposing Asian Low @ 1.08280.',
    raw_payload: {
      currentPrice: 1.08540,
      floatingPips: 18.0,
      asian_high: 1.08920,
      asian_low: 1.08280,
      fvg_zone: '1.08720 – 1.08930',
      tp_type: 'Opposing Asian Killzone Low'
    }
  },
  {
    id: 'sig_live_sh_usdjpy',
    symbol: 'USDJPY',
    strategy: 'STOP_HUNT',
    timeframe: '5m',
    action: 'BUY',
    entry: 154.550,
    sl: 154.180,
    tp1: 155.650,
    status: 'IN_TRADE',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 1.35,
    raw_quantity: 135000,
    risk_amount_usd: 1000,
    sl_distance_price: 0.37,
    sl_distance_pips_points: 37.0,
    primary_risk_reward: 2.97,
    targets: [{ targetIndex: 1, price: 155.650, percentage: 100, lots: 1.35, potentialProfitUsd: 2970, riskRewardRatio: 2.97, hit: false }],
    validation: {
      isValid: true,
      appliedStrategy: 'STOP_HUNT',
      overallStatus: 'PASSED',
      summary: 'Asian Low swept post-01:00 NY -> 5m Green CHoCH + FVG entry -> TP Opposing Asian High',
      checks: [
        { id: 'sh1', name: 'Asian Killzone (21:00-01:00 NY)', passed: true, message: 'Observation window closed. High/Low marked.', severity: 'INFO' },
        { id: 'sh2', name: 'Post-01:00 NY Sweep', passed: true, message: 'Swept Asian Low at 154.200 cleanly.', severity: 'INFO' },
        { id: 'sh3', name: '5m Green CHoCH & FVG', passed: true, message: 'Structure shift and 5m FVG retest confirmed at 154.550.', severity: 'INFO' },
        { id: 'sh4', name: 'Opposing Asian High TP', passed: true, message: 'Targeting Asian High at 155.650.', severity: 'INFO' }
      ]
    },
    created_at: '2026-10-16T04:15:00.000Z',
    updated_at: new Date().toISOString(),
    session_name: 'Post-Asian KZ (04:15 NY)',
    notes: '[IPDA BUY_ONLY] [Stop Hunt 5m] Swept Asian Low. 5m Green CHoCH & FVG Retest @ 154.550. SL: 154.180. TP: Opposing Asian High @ 155.650.',
    raw_payload: {
      currentPrice: 154.980,
      floatingPips: 43.0,
      asian_high: 155.650,
      asian_low: 154.200,
      fvg_zone: '154.210 – 154.550',
      tp_type: 'Opposing Asian Killzone High'
    }
  },
  {
    id: 'sig_live_cbdr_eurchf',
    symbol: 'EURCHF',
    strategy: 'CBDR',
    timeframe: '15m',
    action: 'BUY',
    entry: 0.92420,
    sl: 0.92120,
    tp1: 0.93320,
    tp2: 0.93920,
    status: 'IN_TRADE',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 3.33,
    raw_quantity: 333000,
    risk_amount_usd: 1000,
    sl_distance_price: 0.00300,
    sl_distance_pips_points: 30.0,
    primary_risk_reward: 3.0,
    targets: [
      { targetIndex: 1, price: 0.93320, percentage: 50, lots: 1.67, potentialProfitUsd: 3000, riskRewardRatio: 3.0, hit: false },
      { targetIndex: 2, price: 0.93920, percentage: 50, lots: 1.67, potentialProfitUsd: 5000, riskRewardRatio: 5.0, hit: false }
    ],
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'Minor Pair CBDR: Direct 1st 15m Imbalance entry on Wednesday session. 1:3 RR target running actively.',
      checks: [
        { id: 'cbdr1', name: 'Rule: Strictly 1 Trade Per Day', passed: true, message: 'First imbalance of Wednesday London session.', severity: 'INFO' },
        { id: 'cbdr2', name: 'Minor Pair: Direct 1st Imbalance', passed: true, message: 'Entered on 1st session imbalance.', severity: 'INFO' },
        { id: 'cbdr3', name: 'Mon–Wed Entry Only', passed: true, message: 'Entered during valid Wednesday session, actively running.', severity: 'INFO' }
      ]
    },
    created_at: '2026-10-14T09:05:00.000Z',
    updated_at: new Date().toISOString(),
    session_name: 'London Session (Wednesday)',
    notes: '[IPDA BUY_ONLY] [🎯 Minor (1st Imbalance)] Wednesday session carry-over running towards 1:3 Target. Entry: 0.92420 | SL: 0.92120 | TP1: 0.93320.',
    raw_payload: {
      currentPrice: 0.92568,
      floatingPips: 14.8,
      imbalanceZone: '0.92380 – 0.92420',
      slPlacementType: 'Below Imbalance/FVG'
    }
  },
  {
    id: 'sig_live_cbdr_cadjpy',
    symbol: 'CADJPY',
    strategy: 'CBDR',
    timeframe: '15m',
    action: 'BUY',
    entry: 111.350,
    sl: 110.950,
    tp1: 112.550,
    tp2: 113.350,
    status: 'IN_TRADE',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 2.50,
    raw_quantity: 250000,
    risk_amount_usd: 1000,
    sl_distance_price: 0.40,
    sl_distance_pips_points: 40.0,
    primary_risk_reward: 3.0,
    targets: [
      { targetIndex: 1, price: 112.550, percentage: 50, lots: 1.25, potentialProfitUsd: 3000, riskRewardRatio: 3.0, hit: false },
      { targetIndex: 2, price: 113.350, percentage: 50, lots: 1.25, potentialProfitUsd: 5000, riskRewardRatio: 5.0, hit: false }
    ],
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'Minor Pair CBDR: Direct 1st 15m Imbalance entry on Wednesday session. 1:3 RR target running actively.',
      checks: [
        { id: 'cbdr1', name: 'Rule: Strictly 1 Trade Per Day', passed: true, message: 'First imbalance of Wednesday London session.', severity: 'INFO' },
        { id: 'cbdr2', name: 'Minor Pair: Direct 1st Imbalance', passed: true, message: 'Entered on 1st session imbalance.', severity: 'INFO' },
        { id: 'cbdr3', name: 'Mon–Wed Entry Only', passed: true, message: 'Entered during valid Wednesday session, actively running.', severity: 'INFO' }
      ]
    },
    created_at: '2026-10-14T09:15:00.000Z',
    updated_at: new Date().toISOString(),
    session_name: 'London Session (Wednesday)',
    notes: '[IPDA BUY_ONLY] [🎯 Minor (1st Imbalance)] Wednesday session carry-over running towards 1:3 Target. Entry: 111.350 | SL: 110.950 | TP1: 112.550.',
    raw_payload: {
      currentPrice: 111.704,
      floatingPips: 35.4,
      imbalanceZone: '111.250 – 111.350',
      slPlacementType: 'Below Imbalance/FVG'
    }
  },
  {
    id: 'sig_live_cbdr_gbpaud',
    symbol: 'GBPAUD',
    strategy: 'CBDR',
    timeframe: '15m',
    action: 'BUY',
    entry: 1.91520,
    sl: 1.91020,
    tp1: 1.93020,
    tp2: 1.94020,
    status: 'IN_TRADE',
    risk_percent: 1.0,
    defensive_state: 'NORMAL',
    calculated_lot_size: 2.00,
    raw_quantity: 200000,
    risk_amount_usd: 1000,
    sl_distance_price: 0.00500,
    sl_distance_pips_points: 50.0,
    primary_risk_reward: 3.0,
    targets: [
      { targetIndex: 1, price: 1.93020, percentage: 50, lots: 1.00, potentialProfitUsd: 3000, riskRewardRatio: 3.0, hit: false },
      { targetIndex: 2, price: 1.94020, percentage: 50, lots: 1.00, potentialProfitUsd: 5000, riskRewardRatio: 5.0, hit: false }
    ],
    validation: {
      isValid: true,
      appliedStrategy: 'CBDR',
      overallStatus: 'PASSED',
      summary: 'Minor Pair CBDR: Direct 1st 15m Imbalance entry on Wednesday session. 1:3 RR target running actively.',
      checks: [
        { id: 'cbdr1', name: 'Rule: Strictly 1 Trade Per Day', passed: true, message: 'First imbalance of Wednesday London session.', severity: 'INFO' },
        { id: 'cbdr2', name: 'Minor Pair: Direct 1st Imbalance', passed: true, message: 'Entered on 1st session imbalance.', severity: 'INFO' },
        { id: 'cbdr3', name: 'Mon–Wed Entry Only', passed: true, message: 'Entered during valid Wednesday session, actively running.', severity: 'INFO' }
      ]
    },
    created_at: '2026-10-14T09:30:00.000Z',
    updated_at: new Date().toISOString(),
    session_name: 'London Session (Wednesday)',
    notes: '[IPDA BUY_ONLY] [🎯 Minor (1st Imbalance)] Wednesday session carry-over running towards 1:3 Target. Entry: 1.91520 | SL: 1.91020 | TP1: 1.93020.',
    raw_payload: {
      currentPrice: 1.91846,
      floatingPips: 32.6,
      imbalanceZone: '1.91400 – 1.91520',
      slPlacementType: 'Below Imbalance/FVG'
    }
  }
];
