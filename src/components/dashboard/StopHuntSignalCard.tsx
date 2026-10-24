'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Copy, 
  Check, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  BarChart2, 
  Trash2,
  Trophy,
  Skull,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StopHuntSignal } from '@/types';
import { getPairDecimals, getPipSize } from '@/lib/pairMath';

interface StopHuntSignalCardProps {
  signal: StopHuntSignal;
  onUpdateStatus?: (id: string, status: StopHuntSignal['status'], exitPrice?: number, pnl?: number) => void;
  onDeleteSignal?: (id: string) => void;
  onOpenChart?: (symbol: string) => void;
  livePrice?: number;
}

export function StopHuntSignalCard({
  signal,
  onUpdateStatus,
  onDeleteSignal,
  onOpenChart,
  livePrice
}: StopHuntSignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const isBuy = signal.sweepType === 'LOW_SWEEP';
  const decimals = getPairDecimals(signal.pair);
  const pipUnit = getPipSize(signal.pair);

  const formatPrice = (p: number | undefined | null) => {
    if (p === undefined || p === null || isNaN(p)) return '—';
    return p.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const asianRangePips = Number(((signal.asianHigh - signal.asianLow) / pipUnit).toFixed(1));
  const currentPrice = livePrice || signal.entryPrice;
  const floatingPips = Number(((isBuy ? currentPrice - signal.entryPrice : signal.entryPrice - currentPrice) / pipUnit).toFixed(1));
  const inProfit = floatingPips >= 0;

  const handleCopyOrder = () => {
    const text = `[ASIAN STOP HUNT LIMIT ORDER]\nPair: ${signal.pair}\nType: LIMIT ${isBuy ? 'BUY' : 'SELL'}\nEntry: ${formatPrice(signal.entryPrice)}\nSL: ${formatPrice(signal.stopLoss)}\nTP: ${formatPrice(signal.takeProfit1)}\nRR: 1:${signal.riskRewardRatio}\nAsian KZ Range: [${formatPrice(signal.asianLow)} – ${formatPrice(signal.asianHigh)}]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (signal.status) {
      case 'PENDING_FILL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            PENDING LIMIT FILL
          </span>
        );
      case 'TRIGGERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            LIMIT FILLED • IN TRADE
          </span>
        );
      case 'TP_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            TP HIT (+{signal.riskRewardRatio}R)
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <Skull className="w-3.5 h-3.5 text-rose-600" />
            SL HIT (-1.0R)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            ORDER EXPIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {signal.status}
          </span>
        );
    }
  };

  return (
    <div className="stripe-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all border border-slate-200 hover:border-slate-300 shadow-xs bg-white">
      
      {/* Top Card Body */}
      <div className="p-4 sm:p-5">
        
        {/* Row 1: Pair & Action + Status Badge */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
              isBuy 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-slate-900 font-mono tracking-tight">
                {signal.pair.replace(/([A-Z]{3})([A-Z]{3})/, '$1 / $2')}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide uppercase border ${
                isBuy 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}>
                LIMIT {isBuy ? 'BUY' : 'SELL'} {isBuy ? '▲' : '▼'}
              </span>

              {/* IPDA Macro Bias Badge */}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border font-mono ${
                signal.ipdaBias === 'BULLISH'
                  ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300'
                  : signal.ipdaBias === 'BEARISH'
                    ? 'bg-rose-100/80 text-rose-900 border-rose-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                IPDA {signal.ipdaBias}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {getStatusBadge()}
          </div>
        </div>

        {/* Row 2: Asian Kill Zone Range Info Banner */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Asian Kill Zone (20:00–00:00 NY)</span>
            </span>
            <span className="font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
              Range: {asianRangePips} pips
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-bold">Asian High:</span>
              <span className="font-black text-rose-700">{formatPrice(signal.asianHigh)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-bold">Asian Low:</span>
              <span className="font-black text-emerald-700">{formatPrice(signal.asianLow)}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-medium italic">
            🛡️ Pre-condition satisfied: 0 entries inside Asian KZ. Swept post-Asian zone.
          </p>
        </div>

        {/* Row 3: Rule Verification Checklist Dropdown Button */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowChecklist(!showChecklist)}
            className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-blue-50/60 hover:bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-900 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Smart Money Setup Triggers Confirmed</span>
            </span>
            <span className="text-[10px] text-blue-700 font-bold underline">
              {showChecklist ? 'Hide Verification' : 'View Checklist (4/4 Pass)'}
            </span>
          </button>

          {showChecklist && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block text-[11px]">
                    1. Liquidity Sweep: {signal.sweepType === 'HIGH_SWEEP' ? 'Asian High Swept' : 'Asian Low Swept'}
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Retail {signal.sweepType === 'HIGH_SWEEP' ? 'Buy Stops' : 'Sell Stops'} swept at {formatPrice(signal.sweepPrice || signal.entryPrice)}.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block text-[11px]">
                    2. 5-Minute Change of Character (CHoCH): Confirmed
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    M5 candle formed {isBuy ? 'Bullish (Green)' : 'Bearish (Red)'} CHoCH breaking recent swing level {signal.chochPrice ? `@ ${formatPrice(signal.chochPrice)}` : ''}.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block text-[11px]">
                    3. Balanced Price Range (BPR): Validated
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Overlapping Fair Value Gap confirmed at [{formatPrice(signal.bprRange.low)} – {formatPrice(signal.bprRange.high)}].
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block text-[11px]">
                    4. Order Type: LIMIT ORDER ONLY (No Market Execution)
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Limit order placed at the boundary of BPR for optimal risk:reward.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Core 4-Box Price Matrix */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          
          {/* Box 1: Limit Entry */}
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wide">
                Limit Entry
              </span>
              <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 py-0.2 rounded">
                BPR Edge
              </span>
            </div>
            <div className="text-base font-black text-slate-900 font-mono tracking-tight">
              {formatPrice(signal.entryPrice)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              BPR: {formatPrice(signal.bprRange.low)} - {formatPrice(signal.bprRange.high)}
            </div>
          </div>

          {/* Box 2: Stop Loss */}
          <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wide">
                Stop Loss
              </span>
              <span className="text-[9px] font-mono text-rose-500 font-bold">1.0R</span>
            </div>
            <div className="text-base font-black text-rose-700 font-mono tracking-tight">
              {formatPrice(signal.stopLoss)}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-1">
              {isBuy ? 'Below Sweep Low' : 'Above Sweep High'}
            </div>
          </div>

          {/* Box 3: Target (Take Profit 1) */}
          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wide">
                Target (TP1)
              </span>
              <span className="text-[9px] font-mono text-emerald-700 font-bold">
                1:{signal.riskRewardRatio} RR
              </span>
            </div>
            <div className="text-base font-black text-emerald-700 font-mono tracking-tight">
              {formatPrice(signal.takeProfit1)}
            </div>
            <div className="text-[10px] text-emerald-800 font-medium mt-1 truncate">
              Opposing {isBuy ? 'Asian High' : 'Asian Low'}
            </div>
          </div>

          {/* Box 4: Current Price / Floating State */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            inProfit ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wide flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${inProfit ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>Live Price</span>
              </span>
              <span className={`text-[9px] font-mono font-bold ${inProfit ? 'text-emerald-700' : 'text-slate-500'}`}>
                {inProfit ? '+' : ''}{floatingPips} pips
              </span>
            </div>
            <div className="text-base font-black text-slate-900 font-mono tracking-tight">
              {formatPrice(currentPrice)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              {signal.status === 'PENDING_FILL' ? 'Waiting for Limit Fill' : 'Trade Active'}
            </div>
          </div>

        </div>

      </div>

      {/* Card Action Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyOrder}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-xs"
            title="Copy Limit Order parameters to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy Order'}</span>
          </button>

          {signal.status === 'PENDING_FILL' && onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(signal.id, 'TRIGGERED')}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all shadow-xs"
            >
              Fill Limit Order
            </button>
          )}

          {signal.status === 'TRIGGERED' && onUpdateStatus && (
            <>
              <button
                type="button"
                onClick={() => onUpdateStatus(signal.id, 'TP_HIT', signal.takeProfit1, 3000)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all shadow-xs"
              >
                Mark TP Hit
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(signal.id, 'SL_HIT', signal.stopLoss, -1000)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition-all shadow-xs"
              >
                Mark SL Hit
              </button>
            </>
          )}

          {onDeleteSignal && (
            <button
              type="button"
              onClick={() => onDeleteSignal(signal.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete signal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onOpenChart && (
          <button
            type="button"
            onClick={() => onOpenChart(signal.pair)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
            title={`Open Interactive Chart for ${signal.pair}`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-300" />
            <span>Chart</span>
          </button>
        )}
      </div>

    </div>
  );
}
