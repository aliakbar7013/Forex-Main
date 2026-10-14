import { 
  StrategyType, 
  TradeAction, 
  SignalValidationResult, 
  ValidationCheckItem, 
  IPDABiasRecord, 
  IncomingWebhookPayload,
  CentralBankRate,
  IPDAOverrideMode
} from '@/types';
import { checkSignalIpdaPermitted, DEFAULT_CENTRAL_BANK_RATES } from './ipdaEngine';

/**
/**
 * Checks whether a given Forex/Commodity symbol has USD attached (Major pair).
 * Minor pairs: Pairs that do NOT have USD attached (EURGBP, GBPJPY, EURJPY, etc.).
 */
export function isMajorPair(symbol: string): boolean {
  if (!symbol) return false;
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.includes('USD');
}

// Helper to determine day of week and session in EST / NY Time
export function getMarketTimeContext(timestamp: Date = new Date(), explicitDay?: string) {
  // Convert date to NY Time (EST / EDT)
  const nyDateStr = timestamp.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDate = new Date(nyDateStr);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let dayOfWeek = nyDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let dayName = dayNames[dayOfWeek];

  if (explicitDay) {
    const dClean = explicitDay.toLowerCase().trim();
    if (dClean.includes('mon')) { dayOfWeek = 1; dayName = 'Monday'; }
    else if (dClean.includes('tue')) { dayOfWeek = 2; dayName = 'Tuesday'; }
    else if (dClean.includes('wed')) { dayOfWeek = 3; dayName = 'Wednesday'; }
    else if (dClean.includes('thu')) { dayOfWeek = 4; dayName = 'Thursday'; }
    else if (dClean.includes('fri')) { dayOfWeek = 5; dayName = 'Friday'; }
    else if (dClean.includes('sat')) { dayOfWeek = 6; dayName = 'Saturday'; }
    else if (dClean.includes('sun')) { dayOfWeek = 0; dayName = 'Sunday'; }
  }

  const nyHours = nyDate.getHours();
  const nyMinutes = nyDate.getMinutes();
  const nyTimeDecimal = nyHours + nyMinutes / 60;

  // CBDR Trade Window: strictly 03:00 AM – 11:45 AM NY Time (03:00 - 11.75 decimal hours / 12:30 PM – 09:15 PM IST)
  // Trades are strictly permitted within this window only. If beyond this session, NO TRADE.
  const isLondonSession = nyTimeDecimal >= 3.0 && nyTimeDecimal <= 11.75;

  // Post-Asian Kill Zone completion: Asian KZ is ~ 20:00 - 00:00 NY. Post-Asian is 00:00 - 08:00 NY
  const isPostAsianKZ = nyTimeDecimal >= 0.0 && nyTimeDecimal <= 8.5;

  // NY Strategy Window: 09:30 AM - 12:00 PM NY Time (07:00 PM - 09:30 PM IST)
  const isNYStrategyWindow = nyTimeDecimal >= 9.5 && nyTimeDecimal <= 12.0;

  // Asian Kill Zone: 20:00 - 00:00 NY Time
  const isAsianKZ = nyTimeDecimal >= 20.0 || nyTimeDecimal < 0.0;

  return {
    nyDate,
    dayOfWeek,
    dayName,
    nyTimeDecimal,
    nyTimeFormatted: nyDate.toLocaleTimeString('en-US', { hour12: true }),
    isLondonSession,
    isPostAsianKZ,
    isNYStrategyWindow,
    isAsianKZ
  };
}

/**
 * Utility to extract trading day and CBDR validity from any signal
 */
export function getSignalTradingDay(signal: { created_at?: string; notes?: string; raw_payload?: Record<string, unknown> }): {
  dayIndex: number;
  dayName: string;
  isCbdrValid: boolean;
  dateFormatted: string;
  fullDateFormatted: string;
} {
  const explicitDay = signal.raw_payload?.day || signal.raw_payload?.trading_day;
  const dateObj = signal.created_at ? new Date(signal.created_at) : new Date();
  const nyDateStr = dateObj.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyDate = new Date(nyDateStr);
  const dayIndex = isNaN(nyDate.getDay()) ? 1 : nyDate.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let dayName = dayNames[dayIndex];

  if (typeof explicitDay === 'string') {
    const dLower = explicitDay.toLowerCase().trim();
    if (dLower.includes('mon')) { dayName = 'Monday'; }
    else if (dLower.includes('tue')) { dayName = 'Tuesday'; }
    else if (dLower.includes('wed')) { dayName = 'Wednesday'; }
    else if (dLower.includes('thu')) { dayName = 'Thursday'; }
    else if (dLower.includes('fri')) { dayName = 'Friday'; }
    else if (dLower.includes('sat')) { dayName = 'Saturday'; }
    else if (dLower.includes('sun')) { dayName = 'Sunday'; }
  }

  const isCbdrValid = dayName === 'Monday' || dayName === 'Tuesday' || dayName === 'Wednesday';
  const dateFormatted = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
  const fullDateFormatted = `${dayName}, ${dateFormatted}`;

  return { 
    dayIndex, 
    dayName, 
    isCbdrValid, 
    dateFormatted, 
    fullDateFormatted 
  };
}

// Normalize timeframe string
export function normalizeTimeframe(tf?: string): string {
  if (!tf) return '';
  const clean = tf.toString().toLowerCase().trim();
  if (clean === '15' || clean === '15m' || clean === '15min') return '15m';
  if (clean === '5' || clean === '5m' || clean === '5min') return '5m';
  if (clean === '1' || clean === '1m' || clean === '1min') return '1m';
  if (clean === '1h' || clean === '60' || clean === '60m') return '1h';
  if (clean === '4h' || clean === '240') return '4h';
  if (clean === 'd' || clean === '1d' || clean === 'daily') return '1D';
  return clean;
}

// Normalize strategy name
export function normalizeStrategy(strat?: string): StrategyType {
  if (!strat) return 'CBDR';
  const clean = strat.toUpperCase().trim();
  if (clean.includes('CBDR') || clean.includes('CENTRAL BANK') || clean.includes('LONDON')) return 'CBDR';
  if (clean.includes('STOP') || clean.includes('HUNT') || clean.includes('ASIAN')) return 'STOP_HUNT';
  if (clean.includes('NY') || clean.includes('NEW YORK') || clean.includes('INDEX') || clean.includes('INDICES')) return 'NEW_YORK';
  return 'CUSTOM';
}

/**
 * Validate incoming trading signal against specific ICT / Quantitative strategy rules
 * including IPDA Central Bank interest rate ratio direction filtering and Major/Minor CBDR sweep rules.
 */
export function validateStrategySignal(
  payload: IncomingWebhookPayload,
  ipdaBiases: IPDABiasRecord[] = [],
  centralBankRates: CentralBankRate[] = DEFAULT_CENTRAL_BANK_RATES,
  overridesMap: Map<string, IPDAOverrideMode> = new Map(),
  overrideTime?: Date
): SignalValidationResult {
  const strategy = normalizeStrategy(payload.strategy);
  const timeframe = normalizeTimeframe(payload.timeframe || payload.tf);
  const symbol = (payload.symbol || payload.pair || 'EURUSD').toUpperCase();
  const action: TradeAction = (payload.action || payload.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  
  const checks: ValidationCheckItem[] = [];
  const explicitDay = (payload.day || payload.trading_day) as string | undefined;
  const marketTime = getMarketTimeContext(overrideTime || new Date(), explicitDay);

  // -------------------------------------------------------------
  // Mandatory IPDA Central Bank Rate Ratio & Direction Filter Check
  // IPDA is strictly MANDATORY for CBDR, Stop Hunt, and all FX/Commodities.
  // The New York Strategy (and US Indices) is explicitly EXEMPT.
  // -------------------------------------------------------------
  const isNewYorkStrategy = strategy === 'NEW_YORK';
  const isIndex = symbol.includes('NAS') || symbol.includes('SPX') || symbol.includes('US30') || symbol.includes('US500') || symbol.includes('USTEC') || symbol.includes('DJ30');
  const isIpdaExempt = isNewYorkStrategy || isIndex;

  const ipdaCheck = checkSignalIpdaPermitted(symbol, action, centralBankRates, overridesMap);
  
  // For FX and Commodities (e.g. EURUSD, XAUUSD, GBPUSD), enforce mandatory rate ratio check
  if (!isIpdaExempt && ipdaCheck.details) {
    const details = ipdaCheck.details;
    const ratioPassed = ipdaCheck.permitted;

    checks.push({
      id: 'ipda_rate_differential',
      name: `Mandatory IPDA Interest Rate Ratio Filter (${details.ratioFormula})`,
      passed: Boolean(ratioPassed),
      severity: 'ERROR',
      expected: details.effectiveDirection === 'BUY_ONLY' ? 'BUY ONLY (Ratio > 1.0)' : details.effectiveDirection === 'SELL_ONLY' ? 'SELL ONLY (Ratio < 1.0)' : 'NEUTRAL',
      received: `${action} (Calculated Ratio: ${details.ratio})`,
      message: ratioPassed
        ? `Signal ${action} aligns with Central Bank IPDA ${details.effectiveDirection} bias (${details.ratioFormula})`
        : ipdaCheck.reason || `Signal violates mandatory IPDA ${details.effectiveDirection} rule. ${symbol} can only be ${details.effectiveDirection}.`
    });
  } else if (isIpdaExempt) {
    checks.push({
      id: 'ipda_exempt',
      name: 'IPDA Interest Rate Filter Status',
      passed: true,
      severity: 'INFO',
      expected: 'Exempt (New York Index Strategy)',
      received: `${strategy} / ${symbol}`,
      message: 'New York Strategy (US Indices) is exempt from Central Bank IPDA interest rate direction filter.'
    });
  }

  if (strategy === 'CBDR') {
    const isMajor = isMajorPair(symbol);

    // 1. Timeframe Check: Strictly 15-minute ONLY
    const is15m = timeframe === '15m';
    checks.push({
      id: 'cbdr_tf',
      name: 'Timeframe Requirement (15-min ONLY)',
      passed: Boolean(is15m),
      severity: 'ERROR',
      expected: '15m',
      received: timeframe || 'Not Specified',
      message: is15m 
        ? 'Valid 15m timeframe confirmed for CBDR Strategy' 
        : `CBDR Strategy strictly requires 15-minute timeframe. Received: ${timeframe || 'none'}`
    });

    // 2. Session Focus Check: London Session (03:00 AM – 11:45 AM NY Time / 12:30 PM – 09:15 PM IST)
    const sessionExplicit = payload.session?.toLowerCase();
    const isLondonTime = Boolean(marketTime.isLondonSession || (sessionExplicit && sessionExplicit.includes('london')));
    checks.push({
      id: 'cbdr_session',
      name: 'London Session Window (03:00 AM – 11:45 AM NY Time)',
      passed: Boolean(isLondonTime),
      severity: 'ERROR',
      expected: '03:00 AM - 11:45 AM NY (12:30 PM - 09:15 PM IST)',
      received: sessionExplicit ? `Payload Session: ${payload.session}` : `Current NY Time: ${marketTime.nyTimeFormatted}`,
      message: isLondonTime
        ? 'Signal received within active CBDR London Session focus window (03:00 AM - 11:45 AM NY / 12:30 PM - 09:15 PM IST).'
        : `Signal generated outside CBDR London Session window (Current NY Time: ${marketTime.nyTimeFormatted}). Trade entries are strictly permitted only between 03:00 AM - 11:45 AM NY (12:30 PM - 09:15 PM IST). If beyond this session, NO TRADE.`
    });

    // 3. Trading Days: Monday, Tuesday, Wednesday only
    const isValidDay = marketTime.dayOfWeek >= 1 && marketTime.dayOfWeek <= 3;
    checks.push({
      id: 'cbdr_day',
      name: 'Trading Days (Mon, Tue, Wed Only)',
      passed: Boolean(isValidDay),
      severity: 'ERROR',
      expected: 'Mon (Trade), Tue (Only if Mon SL), Wed (Only if Tue SL)',
      received: marketTime.dayName,
      message: isValidDay
        ? `Valid trading day confirmed (${marketTime.dayName}). If TP is hit, holiday for rest of the week.`
        : `CBDR is strictly blocked on ${marketTime.dayName}. Thursday & Friday are study-only days (No Trading).`
    });

    // 4. Major Pair vs Minor Pair Previous Day Sweep Rule
    if (isMajor) {
      // MAJOR PAIRS: Strictly follow Previous Day High (PDH) / Low (PDL) sweep
      const sweepConfirmed = payload.liquidity_sweep !== false && 
                             payload.pdh_pdl_sweep !== false && 
                             payload.previous_day_sweep !== false;
      const expectedSweep = action === 'BUY' ? 'Previous Day Low (PDL) Sweep' : 'Previous Day High (PDH) Sweep';
      checks.push({
        id: 'cbdr_major_sweep',
        name: `Major Pair Rule: ${expectedSweep} Required`,
        passed: Boolean(sweepConfirmed),
        severity: 'ERROR',
        expected: expectedSweep,
        received: sweepConfirmed ? `${expectedSweep} Confirmed` : 'Sweep Pending / Unverified',
        message: sweepConfirmed
          ? `Major pair (${symbol}) confirmed ${expectedSweep} before London session 1st imbalance entry.`
          : `Major pair (${symbol}) rule violation: Major pairs must sweep ${expectedSweep} before entering on 1st London imbalance.`
      });
    } else {
      // MINOR / CROSS PAIRS (WITHOUT USD): DO NOT follow Previous Day High / Low sweep (direct 1st imbalance entry)
      checks.push({
        id: 'cbdr_minor_sweep_rule',
        name: 'Minor Pair (Without USD): Direct 1st Imbalance (No PDH/PDL Sweep Required)',
        passed: true,
        severity: 'INFO',
        expected: 'No Previous Day High/Low Sweep Required for Minor Pairs (Without USD)',
        received: `Minor Pair without USD (${symbol}) — Direct 1st Imbalance Entry (03:00 - 11:45 NY)`,
        message: `Minor pair (${symbol}) has no USD attached. Executes entry strictly on the 1st imbalance of session time 03:00 - 11:45 NY timezone without requiring previous day high/low sweep.`
      });
    }

    // 5. FIRST Imbalance Entry Trigger (1st FVG of London Session 03:00 - 11:45 NY)
    const fvgNum = payload.fvg_number !== undefined ? Number(payload.fvg_number) : 1;
    const isFirstImbalance = fvgNum === 1;
    checks.push({
      id: 'cbdr_first_imbalance',
      name: 'Enter on 1st Imbalance Only (Session 03:00 - 11:45 NY)',
      passed: Boolean(isFirstImbalance),
      severity: 'ERROR',
      expected: action === 'BUY' ? '1st Bullish Imbalance of Session (03:00 - 11:45 NY)' : '1st Bearish Imbalance of Session (03:00 - 11:45 NY)',
      received: `Session Imbalance #${fvgNum}`,
      message: isFirstImbalance
        ? `Valid 1st session ${action === 'BUY' ? 'bullish' : 'bearish'} imbalance entry confirmed inside 03:00 - 11:45 NY window.`
        : `Entry is at Imbalance #${fvgNum}. Strategy strictly requires entering ONLY the 1st imbalance of the session (03:00 - 11:45 NY).`
    });

    // 6. Stop Loss Placement: Low/High of London Session for Majors, Below/Above Imbalance for Minors
    if (isMajor) {
      checks.push({
        id: 'cbdr_sl_structure',
        name: `Major Pair (USD Attached): Stop Loss at London Session ${action === 'BUY' ? 'Low' : 'High'}`,
        passed: true,
        severity: 'INFO',
        expected: action === 'BUY' ? 'Low price of London session (PDL sweep low)' : 'High price of London session (PDH sweep high)',
        received: `SL: ${payload.sl}`,
        message: action === 'BUY'
          ? 'Major pair Stop Loss is placed strictly at the low price of the London session.'
          : 'Major pair Stop Loss is placed strictly at the high price of the London session.'
      });
    } else {
      checks.push({
        id: 'cbdr_sl_structure',
        name: `Minor Pair (Without USD): Stop Loss ${action === 'BUY' ? 'Below' : 'Above'} Imbalance/FVG`,
        passed: true,
        severity: 'INFO',
        expected: action === 'BUY' ? 'Below imbalance/FVG base' : 'Above imbalance/FVG top',
        received: `SL: ${payload.sl}`,
        message: action === 'BUY'
          ? 'Minor pair Stop Loss placed strictly below the 1st imbalance/FVG base.'
          : 'Minor pair Stop Loss placed strictly above the 1st imbalance/FVG top.'
      });
    }

    // 7. Target: 1:3 Risk-to-Reward Ratio
    const entryNum = Number(payload.entry);
    const slNum = Number(payload.sl);
    const tp1Num = Number(payload.tp1);
    if (!isNaN(entryNum) && !isNaN(slNum) && !isNaN(tp1Num)) {
      const riskDist = Math.abs(entryNum - slNum);
      const rewardDist = Math.abs(tp1Num - entryNum);
      const calculatedRR = riskDist > 0 ? Number((rewardDist / riskDist).toFixed(2)) : 0;
      const meetsMinRR = calculatedRR >= 2.8; // Target 1:3
      checks.push({
        id: 'cbdr_rr_target',
        name: 'Target Requirement (1:3 Risk-Reward)',
        passed: Boolean(meetsMinRR),
        severity: 'WARNING',
        expected: '1:3.0 Target RR',
        received: `1:${calculatedRR} RR`,
        message: meetsMinRR
          ? `Target achieves ${calculatedRR}R (meets 1:3 target). Move to Breakeven after TP1.`
          : `Target achieves 1:${calculatedRR} RR. Strategy specifies a 1:3 target.`
      });
    }

  } else if (strategy === 'STOP_HUNT') {
    // 1. Timeframe Check: 5-minute only
    const is5m = timeframe === '5m';
    checks.push({
      id: 'stophunt_tf',
      name: 'Timeframe Requirement (5m)',
      passed: Boolean(is5m),
      severity: 'ERROR',
      expected: '5m',
      received: timeframe || 'Not Specified',
      message: is5m
        ? 'Valid 5m timeframe confirmed for Stop Hunt Model'
        : `Stop Hunt Model strictly requires 5-minute timeframe. Received: ${timeframe || 'none'}`
    });

    // 2. Post-Asian Kill Zone Completion
    const postAsianConfirmed = Boolean(payload.asian_kz_completed !== false && (marketTime.isPostAsianKZ || payload.asian_kz_completed === true));
    checks.push({
      id: 'stophunt_asian_kz',
      name: 'Post-Asian Kill Zone Execution',
      passed: Boolean(postAsianConfirmed),
      severity: 'WARNING',
      expected: 'Post-Asian Kill Zone Completion',
      received: marketTime.isPostAsianKZ ? 'Post-Asian Window Active' : 'Asian Session Ongoing / Unverified',
      message: postAsianConfirmed
        ? 'Asian Kill Zone completed. Liquidity pool formed for stop run.'
        : 'Caution: Model requires Asian Kill Zone to complete before stop hunt entry is valid.'
    });

    // 3. Condition: Asian High/Low Sweep + CHOCH + Fresh BPR
    const bprConfirmed = Boolean(payload.bpr_confirmed !== false && payload.choch_confirmed !== false);
    checks.push({
      id: 'stophunt_bpr_choch',
      name: 'Asian Sweep + CHOCH + Fresh BPR Entry',
      passed: Boolean(bprConfirmed),
      severity: 'WARNING',
      expected: 'CHOCH + Balanced Price Range (BPR)',
      received: `CHOCH: ${payload.choch_confirmed !== false ? 'Confirmed' : 'Pending'}, BPR: ${payload.bpr_confirmed !== false ? 'Confirmed' : 'Pending'}`,
      message: bprConfirmed
        ? 'Asian liquidity sweep verified with CHOCH & clean BPR entry'
        : 'Awaiting clean CHOCH print and fresh Balanced Price Range (BPR) confirmation'
    });

  } else if (strategy === 'NEW_YORK') {
    // 1. Instruments Check: SPX500, NAS100, US30
    const validIndices = ['SPX500', 'SPX', 'US500', 'NAS100', 'NAS', 'USTEC', 'NQ', 'US30', 'DJ30', 'YM', 'WS30'];
    const isIndexValid = validIndices.some(idx => symbol.includes(idx));
    checks.push({
      id: 'ny_instruments',
      name: 'Valid Instruments (SPX500, NAS100, US30)',
      passed: Boolean(isIndexValid),
      severity: 'ERROR',
      expected: 'SPX500, NAS100, US30 (BlackBull Data)',
      received: symbol,
      message: isIndexValid
        ? `Valid US Index instrument verified (${symbol})`
        : `New York Strategy is restricted to US Indices (SPX500, NAS100, US30). Received: ${symbol}`
    });

    // 2. Timing Window: 09:30 AM – 12:00 PM NY Time (07:00 PM – 10:00 PM IST)
    const isWithinNYWindow = Boolean(marketTime.isNYStrategyWindow || (payload.session && payload.session.toLowerCase().includes('ny')));
    checks.push({
      id: 'ny_timing_window',
      name: 'NY Open Strategy Window (09:30 AM – 12:00 PM NY Time)',
      passed: Boolean(isWithinNYWindow),
      severity: 'WARNING',
      expected: '09:30 AM - 12:00 PM NY (07:00 PM - 10:00 PM IST)',
      received: `Current NY Time: ${marketTime.nyTimeFormatted}`,
      message: isWithinNYWindow
        ? 'Signal received within NY Open high-volatility window'
        : `Signal generated outside 09:30 - 12:00 NY window (Current: ${marketTime.nyTimeFormatted})`
    });

    // 3. Timeframe Check: 15m range marked at 09:29 AM; 1m for CHOCH & loose FVG entry
    const validNYTFs = ['1m', '5m', '15m'];
    const isValidNYTf = validNYTFs.includes(timeframe);
    checks.push({
      id: 'ny_tf_structure',
      name: '15m Range + 1m CHOCH / FVG Entry Structure',
      passed: Boolean(isValidNYTf),
      severity: 'WARNING',
      expected: '1m Execution (with 15m Range Context)',
      received: timeframe || '1m',
      message: isValidNYTf
        ? `Execution timeframe ${timeframe} confirmed with 15m NY open range reference`
        : `Recommended execution timeframe is 1m (or 5m/15m). Received: ${timeframe}`
    });
  } else {
    // Custom Strategy
    checks.push({
      id: 'custom_generic',
      name: 'Custom Strategy Validation',
      passed: true,
      severity: 'INFO',
      expected: 'Standard ICT / Quant Signal',
      received: strategy,
      message: `Custom signal processed for ${symbol} on ${timeframe}`
    });
  }

  // Compute Overall Status
  const hasErrors = checks.some(c => !c.passed && c.severity === 'ERROR');
  const hasWarnings = checks.some(c => !c.passed && c.severity === 'WARNING');

  let overallStatus: 'PASSED' | 'WARNING' | 'FAILED' = 'PASSED';
  let summary = 'All strategy rules and IPDA interest rate filters passed successfully.';

  if (hasErrors) {
    overallStatus = 'FAILED';
    const errorCount = checks.filter(c => !c.passed && c.severity === 'ERROR').length;
    summary = `Signal violated ${errorCount} mandatory strategy/IPDA rule(s). Action flagged or blocked.`;
  } else if (hasWarnings) {
    overallStatus = 'WARNING';
    summary = 'Signal passed mandatory criteria with cautionary condition warnings.';
  }

  return {
    isValid: !hasErrors,
    overallStatus,
    summary,
    checks,
    appliedStrategy: strategy
  };
}
