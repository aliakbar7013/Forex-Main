export type StrategyType = 'CBDR' | 'STOP_HUNT' | 'NEW_YORK' | 'CUSTOM';

export type TradeAction = 'BUY' | 'SELL';

export type SignalStatus = 
  | 'PENDING' 
  | 'IN_TRADE' 
  | 'TP1_HIT' 
  | 'TP2_HIT' 
  | 'CLOSED_PROFIT' 
  | 'SL_HIT' 
  | 'CANCELLED';

export type DefensiveRiskState = 'NORMAL' | 'REDUCED' | 'DEFENSIVE';

export type BiasDirection = 'BULLISH' | 'BEARISH';

export type IPDADirection = 'BUY_ONLY' | 'SELL_ONLY' | 'NEUTRAL';

export type IPDAOverrideMode = 'AUTO' | 'FORCE_BUY' | 'FORCE_SELL' | 'DISABLED';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'AUD' | 'CAD' | 'NZD';

export type PairCategory = 
  | 'COMMODITY' 
  | 'MAJOR' 
  | 'YEN_CROSS' 
  | 'POUND_EURO_CROSS' 
  | 'COMMODITY_CROSS';

export interface CentralBankRate {
  code: CurrencyCode;
  currencyName: string;
  centralBankName: string;
  rate: number; // percentage, e.g. 4.50
  lastUpdated: string;
  sourceUrl: string;
}

export interface IPDAPairBias {
  symbol: string;
  name: string;
  category: PairCategory;
  baseCurrency: CurrencyCode | string;
  quoteCurrency: CurrencyCode | string;
  baseRate: number;
  quoteRate: number;
  baseCentralBank: string;
  quoteCentralBank: string;
  ratio: number;
  ratioFormula: string;
  direction: IPDADirection;
  override: IPDAOverrideMode;
  effectiveDirection: IPDADirection | 'DISABLED';
  isCommodityProxy: boolean;
  proxyNote?: string;
  flagBase: string;
  flagQuote: string;
  lastUpdated: string;
}

export interface IPDAOverrideSetting {
  symbol: string;
  override_mode: IPDAOverrideMode;
  notes: string;
  updated_at: string;
}

export interface ValidationCheckItem {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  expected?: string;
  received?: string;
}

export interface SignalValidationResult {
  isValid: boolean;
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
  summary: string;
  checks: ValidationCheckItem[];
  appliedStrategy: StrategyType;
}

export interface ScaleOutTarget {
  targetIndex: 1 | 2 | 3;
  price: number;
  percentage: number; // 50% for TP1, 30% for TP2, 20% for TP3
  lots: number;
  potentialProfitUsd: number;
  riskRewardRatio: number;
  hit: boolean;
}

export interface Signal {
  id: string;
  strategy: StrategyType;
  symbol: string;
  timeframe: string;
  action: TradeAction;
  entry: number;
  sl: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  
  // Risk & Lot Size Info
  risk_percent: number;
  defensive_state: DefensiveRiskState;
  calculated_lot_size: number;
  raw_quantity: number;
  risk_amount_usd: number;
  sl_distance_price: number;
  sl_distance_pips_points: number;
  
  // Scale-out targets
  targets: ScaleOutTarget[];
  primary_risk_reward: number;
  
  // Validation status
  validation: SignalValidationResult;
  
  // Status and lifecycle
  status: SignalStatus;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'MANUAL';
  realized_pnl_usd?: number;
  exit_price?: number;
  
  // Timestamps & Entry Date
  created_at: string;
  updated_at: string;
  date_of_entry?: string;
  session_name?: string;
  
  // Additional TradingView metadata
  notes?: string;
  raw_payload?: Record<string, unknown>;
}

/**
 * Asian Kill Zone Stop Hunt (STUFF) Signal Specification
 * 5-Minute Timeframe (M5), America/New_York session timing, Limit Orders Only.
 */
export interface StopHuntSignal {
  id: string;
  pair: string; // e.g., 'EURUSD', 'USDCHF', 'XAUUSD'
  timestamp: string;
  ipdaBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  asianHigh: number;
  asianLow: number;
  sweepType: 'HIGH_SWEEP' | 'LOW_SWEEP';
  chochConfirmed: boolean;
  bprRange: { high: number; low: number };
  orderType: 'LIMIT';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  riskRewardRatio: number;
  status: 'PENDING_FILL' | 'TRIGGERED' | 'TP_HIT' | 'SL_HIT' | 'EXPIRED';
  
  // Detailed execution metadata
  sweepPrice?: number;
  chochPrice?: number;
  opposingTarget?: number;
  exitPrice?: number;
  realizedPnl?: number;
  riskPercent?: number;
  riskAmountUsd?: number;
  calculatedLotSize?: number;
  tradingDay?: string;
  dateExecuted?: string;
  session?: string;
  notes?: string;
  created_at?: string;
}

export interface AsianStopHuntBacktestConfig {
  asianStartHourNY: number; // default 20 (8 PM NY)
  asianEndHourNY: number;   // default 0 (12 AM midnight NY)
  minRiskReward: number;    // default 3.0 (up to 6.0+)
  slBufferPips: number;     // default 3.0 pips above/below sweep high/low
  bprBufferPips: number;    // default 1.0 pips
  targetMode: 'OPPOSING_ASIAN_LEVEL' | 'FIXED_RR' | 'HYBRID';
  selectedPairs: string[];  // list of symbols
  dateRangeMonths?: string[]; // e.g. ['2026-04', '2026-05', ..., '2026-10']
}

export interface AsianStopHuntTradeResult {
  id: string;
  pair: string;
  date: string;
  tradingDay: string;
  ipdaBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sweepType: 'HIGH_SWEEP' | 'LOW_SWEEP';
  asianHigh: number;
  asianLow: number;
  sweepPrice: number;
  chochConfirmed: boolean;
  chochPrice: number;
  bprRange: { high: number; low: number };
  orderType: 'LIMIT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  outcome: 'WIN' | 'LOSS' | 'EXPIRED';
  exitPrice: number;
  realizedPnl: number;
  entryTimeNY: string;
  entryTimeIST: string;
  notes: string;
}

export interface RiskSettings {
  id: string;
  balance: number;
  high_water_mark: number;
  base_risk_percent: number; // 1.0% default
  current_risk_percent: number; // 1.0% | 0.5% | 0.25%
  defensive_state: DefensiveRiskState;
  consecutive_losses: number;
  total_trades: number;
  total_wins: number;
  total_losses: number;
  total_pnl: number;
  max_drawdown_percent: number;
  win_rate: number;
  updated_at: string;
}

export interface IPDABiasRecord {
  asset: string;
  bias: BiasDirection;
  timeframe: 'MONTHLY' | 'WEEKLY';
  notes: string;
  updated_at: string;
}

export interface TradeLog {
  id: string;
  signal_id: string;
  symbol: string;
  strategy: StrategyType;
  action: TradeAction;
  outcome: 'WIN' | 'LOSS' | 'BE' | 'MANUAL';
  realized_pnl: number;
  risk_percent_used: number;
  risk_amount_usd: number;
  balance_before: number;
  balance_after: number;
  consecutive_losses_after: number;
  defensive_state_after: DefensiveRiskState;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  strategy: string;
  symbol: string;
  action: string;
  status: 'PROCESSED' | 'FLAGGED' | 'REJECTED';
  errors_count: number;
  lot_size: number;
  ip_address?: string;
  payload: Record<string, unknown>;
}

export interface TradingSession {
  key: 'SYDNEY' | 'TOKYO' | 'LONDON' | 'NEW_YORK' | 'NY_OPEN_KZ';
  name: string;
  location: string;
  timeNY: string;
  timeEST: string;
  timeIST: string;
  timeUTC: string;
  isActive: boolean;
  isUpcoming: boolean;
  progressPercent: number;
  timeRemaining: string;
}

export interface IncomingWebhookPayload {
  strategy?: string;
  symbol?: string;
  pair?: string;
  timeframe?: string;
  tf?: string;
  action?: string;
  side?: string;
  entry?: number | string;
  sl?: number | string;
  stop_loss?: number | string;
  tp1?: number | string;
  tp2?: number | string;
  tp3?: number | string;
  take_profit?: number | string;
  risk_percent?: number | string;
  secret?: string;
  token?: string;
  
  // Strategy specific conditions metadata from TradingView
  session?: string;
  day?: string;
  trading_day?: string;
  liquidity_sweep?: boolean | string;
  fvg_number?: number | string;
  bpr_confirmed?: boolean | string;
  ny_15m_range_marked?: boolean | string;
  ny_1m_choch?: boolean | string;
  date_of_entry?: string;
  date?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface BacktestTradeRecord {
  id: string;
  signal_id?: string;
  symbol: string;
  strategy: StrategyType;
  action: TradeAction;
  timeframe: string;
  entry: number;
  sl: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  risk_percent: number;
  defensive_state: DefensiveRiskState;
  calculated_lot_size: number;
  risk_amount_usd: number;
  outcome: 'WIN' | 'LOSS' | 'BE';
  exit_price?: number;
  realized_pnl: number;
  riskRewardAchieved: number;
  trading_day: string; // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  isCbdrValidDay: boolean; // true if Monday, Tuesday, Wednesday
  session: string;
  date_executed: string;
  notes?: string;
  created_at: string;
}

export interface DayPerformanceMetrics {
  dayName: string;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  isCbdrPermitted: boolean;
}

export interface StrategyPerformanceMetrics {
  strategy: StrategyType | string;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
}

export interface BacktestStats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  totalBe: number;
  winRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgRiskReward: number;
  maxDrawdownPercent: number;
  dayBreakdown: Record<string, DayPerformanceMetrics>;
  strategyBreakdown: Record<string, StrategyPerformanceMetrics>;
}

export interface TelegramSettings {
  bot_token: string;
  chat_id: string;
  enabled: boolean;
  notify_new_signals: boolean;
  notify_trade_resolutions: boolean;
  updated_at?: string;
}

export interface TelegramTestResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
}

export type UserDurationType = '7_DAYS' | '30_DAYS' | '6_MONTHS' | '1_YEAR' | 'LIFETIME';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  strategy_access: string[]; // e.g. ['ALL'] or ['CBDR', 'STOP_HUNT']
  duration_type: UserDurationType;
  expires_at: string | null;
  is_active: number;
  created_at: string;
  last_login_at?: string | null;
}

export interface AuthSession {
  authenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  role?: 'ADMIN' | 'USER';
  strategy_access?: string[];
  expires_at?: string | null;
  duration_type?: UserDurationType | string;
  pin?: string;
  label?: string;
}

export interface AuthPin {
  pin: string;
  role: 'ADMIN' | 'USER';
  label: string;
  is_active: number;
  created_at: string;
  last_used_at?: string;
}


