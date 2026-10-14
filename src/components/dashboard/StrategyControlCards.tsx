'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Shield, 
  Sliders
} from 'lucide-react';
import { IPDABiasRecord, RiskSettings, BiasDirection, IPDAPairBias } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface StrategyControlCardsProps {
  ipdaBiases?: IPDABiasRecord[];
  ipdaMatrix?: IPDAPairBias[];
  riskSettings: RiskSettings | null;
  onToggleBias: (asset: string, currentBias: BiasDirection) => void;
  onOpenSettings: () => void;
}

export function StrategyControlCardsComponent({
  ipdaBiases,
  ipdaMatrix,
  onToggleBias,
  onOpenSettings,
  riskSettings
}: StrategyControlCardsProps) {
  const consecutiveLosses = riskSettings?.consecutive_losses || 0;
  const winRate = riskSettings?.win_rate || 0;
  const totalTrades = riskSettings?.total_trades || 0;

  // Defensive tier determination
  const isNormal = consecutiveLosses === 0;
  const isReduced = consecutiveLosses === 1;
  const isDefensive = consecutiveLosses >= 2;

  const currentRiskTier = isDefensive ? '0.25% Defensive' : isReduced ? '0.50% Reduced' : '1.00% Base (Normal)';

  // Supported primary pairs for quick macro toggles
  const primaryPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'XAUUSD'];

  // Calculate items from IPDA interest rate formula (Ratio = Base Rate / Quote Rate)
  const biasesToDisplay = primaryPairs.map((pairSymbol) => {
    // 1. Try to find in dynamic ipdaMatrix calculated from Central Bank rates
    const matrixItem = ipdaMatrix?.find(m => m.symbol.toUpperCase() === pairSymbol);
    if (matrixItem) {
      const isBull = matrixItem.effectiveDirection === 'BUY_ONLY';
      return {
        asset: pairSymbol,
        bias: (isBull ? 'BULLISH' : 'BEARISH') as BiasDirection,
        ratio: matrixItem.ratio,
        formula: matrixItem.ratioFormula,
        baseRate: matrixItem.baseRate,
        quoteRate: matrixItem.quoteRate
      };
    }

    // 2. Try to find in ipdaBiases state
    const biasItem = ipdaBiases?.find(b => b.asset.toUpperCase() === pairSymbol);
    if (biasItem) {
      return {
        asset: pairSymbol,
        bias: biasItem.bias,
        ratio: (biasItem as any).ratio || (biasItem.bias === 'BULLISH' ? 1.05 : 0.70),
        formula: biasItem.notes,
        baseRate: undefined,
        quoteRate: undefined
      };
    }

    // 3. Fallback mathematically calculated from benchmark policy rates
    // USD: 4.50%, EUR: 3.15%, GBP: 4.75%, JPY: 0.25%, CHF: 0.50%, AUD: 4.35%, CAD: 3.75%, NZD: 4.75%
    const formulaDefaults: Record<string, { bias: BiasDirection; ratio: number; base: number; quote: number }> = {
      EURUSD: { bias: 'BEARISH', ratio: 0.70, base: 3.15, quote: 4.50 },
      GBPUSD: { bias: 'BULLISH', ratio: 1.06, base: 4.75, quote: 4.50 },
      USDJPY: { bias: 'BULLISH', ratio: 18.00, base: 4.50, quote: 0.25 },
      USDCHF: { bias: 'BULLISH', ratio: 9.00, base: 4.50, quote: 0.50 },
      USDCAD: { bias: 'BULLISH', ratio: 1.20, base: 4.50, quote: 3.75 },
      AUDUSD: { bias: 'BEARISH', ratio: 0.97, base: 4.35, quote: 4.50 },
      NZDUSD: { bias: 'BULLISH', ratio: 1.06, base: 4.75, quote: 4.50 },
      XAUUSD: { bias: 'BEARISH', ratio: 0.11, base: 0.50, quote: 4.50 },
    };

    const def = formulaDefaults[pairSymbol] || { bias: 'BULLISH', ratio: 1.0, base: 4.5, quote: 4.5 };
    return {
      asset: pairSymbol,
      bias: def.bias,
      ratio: def.ratio,
      formula: `Ratio = ${def.base}% / ${def.quote}% = ${def.ratio}`,
      baseRate: def.base,
      quoteRate: def.quote
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* 1. IPDA Central Bank Bias Matrix (Left Column - 7 Cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Monthly IPDA Central Bank Biases
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Ratio = Base Rate / Quote Rate (&gt;1.0 BUY ONLY, &lt;1.0 SELL ONLY)
              </p>
            </div>
          </div>
          <Badge variant="blue" size="sm">
            Formula Active
          </Badge>
        </div>

        {/* IPDA Assets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {biasesToDisplay.map((item) => {
            const isBullish = item.bias === 'BULLISH';
            return (
              <button
                key={item.asset}
                onClick={() => onToggleBias(item.asset, item.bias)}
                className={`flex flex-col p-2.5 rounded-xl border text-left transition-all group hover:scale-[1.02] shadow-xs ${
                  isBullish 
                    ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 text-emerald-950' 
                    : 'bg-rose-50/70 border-rose-200 hover:border-rose-400 text-rose-950'
                }`}
                title={item.formula || `Click to toggle ${item.asset} bias`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {item.asset}
                  </span>
                  {isBullish ? (
                    <span className="p-0.5 rounded bg-emerald-200 text-emerald-800">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-0.5 rounded bg-rose-200 text-rose-800">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${isBullish ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isBullish ? 'BUY ONLY' : 'SELL ONLY'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-semibold">
                    {item.ratio !== undefined ? `R: ${item.ratio.toFixed(2)}` : '1M'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Defensive Risk Stepping & Performance Engine (Right Column - 5 Cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Defensive Risk Stepping
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Automated risk reduction protecting drawdown
              </p>
            </div>
          </div>

          <button 
            onClick={onOpenSettings}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
          >
            Configure
          </button>
        </div>

        {/* 3-Tier Risk Ladder */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Tier 1 */}
          <div className={`p-2 rounded-xl border text-center transition-all ${
            isNormal 
              ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-2 ring-emerald-400/20' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className="text-[10px] font-semibold text-slate-500">Base / Win</div>
            <div className="text-sm font-black text-emerald-700 font-mono">1.0%</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-medium">0 Losses</div>
          </div>

          {/* Tier 2 */}
          <div className={`p-2 rounded-xl border text-center transition-all ${
            isReduced 
              ? 'bg-amber-50 border-amber-400 shadow-xs ring-2 ring-amber-400/20' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className="text-[10px] font-semibold text-slate-500">1st Loss</div>
            <div className="text-sm font-black text-amber-700 font-mono">0.5%</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-medium">1 Loss</div>
          </div>

          {/* Tier 3 */}
          <div className={`p-2 rounded-xl border text-center transition-all ${
            isDefensive 
              ? 'bg-rose-50 border-rose-400 shadow-xs ring-2 ring-rose-400/20' 
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}>
            <div className="text-[10px] font-semibold text-slate-500">2nd+ Loss</div>
            <div className="text-sm font-black text-rose-700 font-mono">0.25%</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Defensive</div>
          </div>
        </div>

        {/* Active Risk Mode Summary */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              Current Active Tier: <strong className="text-slate-900">{currentRiskTier}</strong>
            </span>
            <span className={`font-mono font-bold ${consecutiveLosses > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {consecutiveLosses === 0 ? 'Optimal State' : `${consecutiveLosses} Loss Streak`}
            </span>
          </div>
        </div>

        {/* Quick KPI Strip (No Dollar Amounts) */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-[11px]">
          <span className="text-slate-500 font-medium">
            Win Rate: <strong className="text-emerald-700 font-mono font-bold">{winRate}%</strong>
          </span>
          <span className="text-slate-500 font-medium">
            Loss Streak: <strong className={`font-mono font-bold ${consecutiveLosses === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {consecutiveLosses}
            </strong>
          </span>
          <span className="text-slate-500 font-medium">
            Total Trades: <strong className="text-slate-900 font-mono font-bold">{totalTrades}</strong>
          </span>
        </div>

      </div>

    </div>
  );
}

export const StrategyControlCards = React.memo(StrategyControlCardsComponent);
