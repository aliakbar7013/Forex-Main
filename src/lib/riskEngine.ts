import { 
  RiskSettings, 
  DefensiveRiskState, 
  ScaleOutTarget, 
  TradeAction 
} from '@/types';

export interface LotCalculationInput {
  symbol: string;
  entry: number;
  sl: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  action: TradeAction;
  customRiskPercent?: number;
}

export interface LotCalculationResult {
  riskPercentUsed: number;
  defensiveState: DefensiveRiskState;
  riskAmountUsd: number;
  slDistancePrice: number;
  slDistancePipsPoints: number;
  rawQuantity: number;
  calculatedLots: number;
  instrumentType: 'FOREX' | 'GOLD' | 'INDICES' | 'CRYPTO';
  lotFormulaDescription: string;
  targets: ScaleOutTarget[];
  primaryRiskReward: number;
  maxPotentialProfitUsd: number;
}

/**
 * Determines current defensive risk state and effective percentage based on account history and balance.
 */
export function calculateDefensiveRiskState(settings: RiskSettings): {
  state: DefensiveRiskState;
  effectiveRiskPercent: number;
  isRecovering: boolean;
  distanceToHwmUsd: number;
  distanceToHwmPercent: number;
} {
  const { balance, high_water_mark, consecutive_losses, base_risk_percent = 1.0 } = settings;
  const isBelowHwm = balance < high_water_mark;
  const distanceToHwmUsd = Math.max(0, high_water_mark - balance);
  const distanceToHwmPercent = high_water_mark > 0 ? (distanceToHwmUsd / high_water_mark) * 100 : 0;

  // Rule:
  // After Win / 0 losses: 1.0% Base Risk (NORMAL)
  // After 1st loss: 0.5% (REDUCED)
  // After 2nd+ loss: 0.25% (DEFENSIVE) until account balance fully recovers above the high-water mark
  if (consecutive_losses >= 2) {
    // In defensive 0.25% mode
    return {
      state: 'DEFENSIVE',
      effectiveRiskPercent: 0.25,
      isRecovering: isBelowHwm,
      distanceToHwmUsd,
      distanceToHwmPercent
    };
  } else if (consecutive_losses === 1) {
    return {
      state: 'REDUCED',
      effectiveRiskPercent: 0.5,
      isRecovering: isBelowHwm,
      distanceToHwmUsd,
      distanceToHwmPercent
    };
  }

  // If consecutive losses is 0, but balance is still slightly below HWM from previous drawdown,
  // we are in Normal (or recovering back to HWM)
  return {
    state: 'NORMAL',
    effectiveRiskPercent: base_risk_percent,
    isRecovering: isBelowHwm,
    distanceToHwmUsd,
    distanceToHwmPercent
  };
}

/**
 * Categorize symbol into Forex, Gold, or Indices for exact formula application.
 */
export function getInstrumentCategory(symbol: string): {
  type: 'FOREX' | 'GOLD' | 'INDICES' | 'CRYPTO';
  divisor: number;
  pipFactor: number;
  unitLabel: string;
} {
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Gold
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    return {
      type: 'GOLD',
      divisor: 100, // Quantity / 100 as specified
      pipFactor: 0.1,
      unitLabel: 'oz'
    };
  }

  // Indices (SPX, NAS, US30, etc.)
  if (
    sym.includes('NAS') || 
    sym.includes('SPX') || 
    sym.includes('US30') || 
    sym.includes('US500') || 
    sym.includes('USTEC') || 
    sym.includes('DJ30') || 
    sym.includes('NQ') || 
    sym.includes('ES') || 
    sym.includes('YM')
  ) {
    return {
      type: 'INDICES',
      divisor: 1000000, // Quantity / 1,000,000 as specified
      pipFactor: 1.0,
      unitLabel: 'pts'
    };
  }

  // Crypto check
  if (sym.includes('BTC') || sym.includes('ETH')) {
    return {
      type: 'CRYPTO',
      divisor: 1,
      pipFactor: 1.0,
      unitLabel: 'coins'
    };
  }

  // USD Pairs & Crosses (Standard Forex)
  // JPY pairs have 2 decimal places (pip = 0.01), standard FX has 4 decimal places (pip = 0.0001)
  const isJpy = sym.includes('JPY');
  return {
    type: 'FOREX',
    divisor: 100000, // Quantity / 100,000 as specified
    pipFactor: isJpy ? 0.01 : 0.0001,
    unitLabel: 'pips'
  };
}

/**
 * Calculates defensive position sizing and multi-target scale out targets.
 */
export function calculateLotSize(
  input: LotCalculationInput,
  riskSettings: RiskSettings
): LotCalculationResult {
  const { symbol, entry, sl, tp1, action } = input;
  const { balance } = riskSettings;

  const defensiveRisk = calculateDefensiveRiskState(riskSettings);
  // Allow manual override from webhook if explicitly passed, otherwise use defensive engine
  const effectiveRiskPercent = input.customRiskPercent !== undefined && input.customRiskPercent > 0
    ? input.customRiskPercent
    : defensiveRisk.effectiveRiskPercent;

  const riskAmountUsd = (balance * effectiveRiskPercent) / 100;
  const slDistancePrice = Math.abs(entry - sl);
  
  // Guard against division by 0
  const safeSlDistance = slDistancePrice > 0.000001 ? slDistancePrice : 0.001;

  // 1. Raw Quantity = Risk Amount ($) / SL Distance (in Price)
  const rawQuantity = riskAmountUsd / safeSlDistance;

  // 2. Dynamic Divisor as per requirement:
  // - USD Pairs & Crosses: Quantity / 100,000
  // - Gold (XAUUSD): Quantity / 100
  // - Indices (SPX, NAS, US30): Quantity / 1,000,000
  const instrument = getInstrumentCategory(symbol);
  let computedLots = rawQuantity / instrument.divisor;

  // Formatting & Minimum Lot bounds
  // Min standard lot is 0.01
  if (computedLots < 0.01) {
    computedLots = 0.01;
  }
  
  // Precision formatting: Forex/Gold typically 2 decimals, Indices up to 2-4 decimals
  const precision = instrument.type === 'INDICES' ? 2 : 2;
  const calculatedLots = Number(computedLots.toFixed(precision));

  const slDistancePipsPoints = Number((slDistancePrice / instrument.pipFactor).toFixed(1));

  // 3. Scale-out Targets
  // TP1: 50% scale-out
  // TP2: 30% scale-out
  // TP3: 20% runner
  const autoTp2 = input.tp2 || (action === 'BUY' ? entry + (safeSlDistance * 3) : entry - (safeSlDistance * 3));
  const autoTp3 = input.tp3 || (action === 'BUY' ? entry + (safeSlDistance * 5) : entry - (safeSlDistance * 5));

  const tp1Distance = Math.abs(tp1 - entry);
  const tp2Distance = Math.abs(autoTp2 - entry);
  const tp3Distance = Math.abs(autoTp3 - entry);

  const tp1RR = Number((tp1Distance / safeSlDistance).toFixed(2));
  const tp2RR = Number((tp2Distance / safeSlDistance).toFixed(2));
  const tp3RR = Number((tp3Distance / safeSlDistance).toFixed(2));

  // Scaled lots:
  const tp1Lots = Number((calculatedLots * 0.50).toFixed(2));
  const tp2Lots = Number((calculatedLots * 0.30).toFixed(2));
  const tp3Lots = Number((calculatedLots * 0.20).toFixed(2));

  // Scaled profit calculation:
  const tp1Profit = Number((riskAmountUsd * tp1RR * 0.50).toFixed(2));
  const tp2Profit = Number((riskAmountUsd * tp2RR * 0.30).toFixed(2));
  const tp3Profit = Number((riskAmountUsd * tp3RR * 0.20).toFixed(2));

  const targets: ScaleOutTarget[] = [
    {
      targetIndex: 1,
      price: tp1,
      percentage: 50,
      lots: tp1Lots || 0.01,
      potentialProfitUsd: tp1Profit,
      riskRewardRatio: tp1RR,
      hit: false
    },
    {
      targetIndex: 2,
      price: autoTp2,
      percentage: 30,
      lots: tp2Lots || 0.01,
      potentialProfitUsd: tp2Profit,
      riskRewardRatio: tp2RR,
      hit: false
    },
    {
      targetIndex: 3,
      price: autoTp3,
      percentage: 20,
      lots: tp3Lots || 0.01,
      potentialProfitUsd: tp3Profit,
      riskRewardRatio: tp3RR,
      hit: false
    }
  ];

  const maxPotentialProfitUsd = Number((tp1Profit + tp2Profit + tp3Profit).toFixed(2));

  const lotFormulaDescription = `${instrument.type} formula: (Risk \$${riskAmountUsd.toFixed(2)} / SL Dist ${safeSlDistance.toFixed(4)}) / ${instrument.divisor.toLocaleString()}`;

  return {
    riskPercentUsed: effectiveRiskPercent,
    defensiveState: defensiveRisk.state,
    riskAmountUsd: Number(riskAmountUsd.toFixed(2)),
    slDistancePrice: Number(slDistancePrice.toFixed(5)),
    slDistancePipsPoints,
    rawQuantity: Math.round(rawQuantity),
    calculatedLots,
    instrumentType: instrument.type,
    lotFormulaDescription,
    targets,
    primaryRiskReward: tp1RR,
    maxPotentialProfitUsd
  };
}

/**
 * Process trade outcome (Win, Loss, Break-Even) and update risk settings.
 */
export function applyTradeOutcomeToRiskSettings(
  currentSettings: RiskSettings,
  outcome: 'WIN' | 'LOSS' | 'BE',
  pnlUsd?: number
): {
  updatedSettings: RiskSettings;
  pnlChange: number;
} {
  const defensive = calculateDefensiveRiskState(currentSettings);
  let newBalance = currentSettings.balance;
  let newConsecutiveLosses = currentSettings.consecutive_losses;
  let newTotalWins = currentSettings.total_wins;
  let newTotalLosses = currentSettings.total_losses;
  const newTotalTrades = currentSettings.total_trades + 1;
  let pnlChange = 0;

  if (outcome === 'WIN') {
    // Default profit is ~ 2R or user provided pnlUsd
    const profit = pnlUsd !== undefined ? pnlUsd : (currentSettings.balance * defensive.effectiveRiskPercent * 2) / 100;
    pnlChange = profit;
    newBalance += profit;
    newTotalWins += 1;
    newConsecutiveLosses = 0; // Reset consecutive loss streak on win
  } else if (outcome === 'LOSS') {
    // Loss is risk amount
    const loss = pnlUsd !== undefined ? Math.abs(pnlUsd) : (currentSettings.balance * defensive.effectiveRiskPercent) / 100;
    pnlChange = -loss;
    newBalance = Math.max(0, newBalance - loss);
    newTotalLosses += 1;
    newConsecutiveLosses += 1; // Increment loss streak
  } else if (outcome === 'BE') {
    pnlChange = 0;
    // Break-even does not change streak
  }

  // Update High Water Mark
  const newHwm = Math.max(currentSettings.high_water_mark, newBalance);

  // Compute total PnL
  const newTotalPnl = currentSettings.total_pnl + pnlChange;

  // Compute Win Rate
  const winRate = newTotalTrades > 0 ? Number(((newTotalWins / newTotalTrades) * 100).toFixed(1)) : 0;

  // Max Drawdown % from HWM
  const currentDrawdown = newHwm > 0 ? ((newHwm - newBalance) / newHwm) * 100 : 0;
  const maxDrawdown = Math.max(currentSettings.max_drawdown_percent || 0, currentDrawdown);

  // Determine new defensive state
  let nextState: DefensiveRiskState = 'NORMAL';
  let nextRiskPercent = currentSettings.base_risk_percent || 1.0;

  if (newConsecutiveLosses >= 2) {
    nextState = 'DEFENSIVE';
    nextRiskPercent = 0.25;
  } else if (newConsecutiveLosses === 1) {
    nextState = 'REDUCED';
    nextRiskPercent = 0.5;
  } else {
    // Loss count 0
    nextState = 'NORMAL';
    nextRiskPercent = currentSettings.base_risk_percent || 1.0;
  }

  const updatedSettings: RiskSettings = {
    ...currentSettings,
    balance: Number(newBalance.toFixed(2)),
    high_water_mark: Number(newHwm.toFixed(2)),
    consecutive_losses: newConsecutiveLosses,
    total_trades: newTotalTrades,
    total_wins: newTotalWins,
    total_losses: newTotalLosses,
    total_pnl: Number(newTotalPnl.toFixed(2)),
    win_rate: winRate,
    max_drawdown_percent: Number(maxDrawdown.toFixed(2)),
    defensive_state: nextState,
    current_risk_percent: nextRiskPercent,
    updated_at: new Date().toISOString()
  };

  return {
    updatedSettings,
    pnlChange
  };
}
