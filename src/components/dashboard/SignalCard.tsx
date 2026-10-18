'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar,
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Skull, 
  BarChart2,
  Trash2,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Signal, SignalStatus } from '@/types';
import { soundEngine } from '@/lib/soundEngine';
import { getSignalTradingDay, isMajorPair } from '@/lib/strategyValidator';

interface SignalCardProps {
  signal: Signal;
  onUpdateStatus: (id: string, status: SignalStatus, outcome?: 'WIN' | 'LOSS' | 'BE', pnlUsd?: number) => void;
  onDeleteSignal: (id: string) => void;
  onViewPayload: (signal: Signal) => void;
  onOpenChart?: (symbol: string, signal?: Signal) => void;
}

export function SignalCardComponent({
  signal,
  onUpdateStatus,
  onDeleteSignal,
  onOpenChart
}: SignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isBuy = signal.action === 'BUY';
  const isCBDR = signal.strategy === 'CBDR';
  const isStopHunt = signal.strategy === 'STOP_HUNT';

  // Copy lot size to clipboard
  const handleCopyLots = () => {
    navigator.clipboard.writeText(signal.calculated_lot_size.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mark as WIN handler
  const handleMarkWin = async () => {
    setIsUpdating(true);
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
      soundEngine.playWinSound();
      await onUpdateStatus(signal.id, 'CLOSED_PROFIT', 'WIN', signal.targets[0]?.potentialProfitUsd);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark as LOSS handler
  const handleMarkLoss = async () => {
    setIsUpdating(true);
    try {
      soundEngine.playLossSound();
      await onUpdateStatus(signal.id, 'SL_HIT', 'LOSS', -signal.risk_amount_usd);
    } finally {
      setIsUpdating(false);
    }
  };

  // Move to BE handler
  const handleMoveBE = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(signal.id, 'TP1_HIT', 'BE');
    } finally {
      setIsUpdating(false);
    }
  };

  const rawDateStr = signal.date_of_entry || signal.created_at;
  const createdDate = new Date(rawDateStr);
  const isValidDate = !isNaN(createdDate.getTime());
  
  // Date of Entry formatting
  const entryIsoDate = signal.date_of_entry || (isValidDate ? createdDate.toISOString().split('T')[0] : (signal.created_at ? signal.created_at.split('T')[0] : ''));
  const entryDateFormatted = isValidDate ? createdDate.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York', 
    weekday: 'short',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) : entryIsoDate;

  const nyTime = isValidDate ? createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }) : '';
  const istTime = isValidDate ? createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }) : '';
  const timeFormatted = nyTime && istTime ? `${nyTime} NY • ${istTime} IST` : '';
  const { dayName } = getSignalTradingDay(signal);

  const validationStatus = signal.validation?.overallStatus || 'PASSED';
  const isValid = validationStatus === 'PASSED';

  // Apple-style Minimal Status Badge
  const getStatusBadge = () => {
    switch (signal.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Pending
          </span>
        );
      case 'IN_TRADE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            In Trade
          </span>
        );
      case 'TP1_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            TP1 (BE Active)
          </span>
        );
      case 'CLOSED_PROFIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Trophy className="w-3 h-3 text-emerald-600" />
            Target Hit (+3R)
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Skull className="w-3 h-3 text-rose-600" />
            SL Hit (-1R)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {signal.status}
          </span>
        );
    }
  };

  return (
    <div className="stripe-card rounded-2xl overflow-hidden flex flex-col justify-between">
      
      {/* Top Card Body */}
      <div className="p-4 sm:p-5">
        
        {/* Row 1: Symbol, Direction Pill & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
              isBuy 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}>
              {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                  {signal.symbol.replace(/([A-Z]{3})([A-Z]{3})/, '$1 / $2')}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
                  isBuy 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {signal.action} {isBuy ? '▲' : '▼'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {isCBDR ? 'CBDR 15m' : isStopHunt ? 'Stop Hunt 5m' : signal.strategy}
                </span>

                {isCBDR && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isMajorPair(signal.symbol)
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isMajorPair(signal.symbol) ? 'Major • PDH/PDL Sweep' : '🎯 Minor • 1st London Imbalance/FVG'}
                  </span>
                )}

                {/* Prominent Date of Entry Pill */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80 font-mono">
                  <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Entry: {entryIsoDate}</span>
                </span>

                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {dayName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {getStatusBadge()}
            
            {/* Live Floating Pips Pill */}
            {signal.raw_payload?.floatingPips !== undefined && (
              <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${
                Number(signal.raw_payload.floatingPips) >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {Number(signal.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(signal.raw_payload.floatingPips)} pips
              </span>
            )}
          </div>

        </div>

        {/* Execution Time & Date Ribbon */}
        <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl mb-4">
          <div className="flex items-center gap-2 text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1 text-slate-900 font-bold font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{entryDateFormatted}</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-slate-600 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-700 font-semibold">{signal.session_name || timeFormatted}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setShowValidationDetails(!showValidationDetails)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 font-medium shrink-0 ml-1"
            title="View validation criteria"
          >
            {isValid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
            <span>Rules</span>
            {showValidationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Validation Drawer (Collapsible) */}
        {showValidationDetails && signal.validation && (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-4 text-xs">
            <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Strategy Verification:</span>
              <span className="text-[10px] text-slate-400">{signal.validation.summary}</span>
            </div>
            <div className="space-y-1.5">
              {signal.validation.checks.map((check) => (
                <div 
                  key={check.id} 
                  className={`p-2 rounded-lg border flex items-start justify-between gap-2 text-xs ${
                    check.passed 
                      ? 'bg-white border-emerald-200 text-slate-700' 
                      : check.severity === 'ERROR'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : check.severity === 'ERROR' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold block text-[11px]">{check.name}</span>
                      <span className="text-[10px] text-slate-500">{check.message}</span>
                    </div>
                  </div>
                  {check.received && (
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold shrink-0">
                      {check.received}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core 3-Box Price Matrix (Stripe Minimalist Style) */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          
          {/* Limit Entry */}
          <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
            <div className="text-[10px] uppercase font-semibold text-blue-600 tracking-wide mb-1 flex items-center justify-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-blue-500" />
              <span>Entry ({entryIsoDate})</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 font-mono">
              {signal.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {isCBDR && !isMajorPair(signal.symbol) 
                ? '1st London Imbalance' 
                : isCBDR 
                  ? '1st FVG (Post-Sweep)' 
                  : '5m Imbalance/FVG'}
            </div>
          </div>

          {/* Stop Loss */}
          <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100 text-center">
            <div className="text-[10px] uppercase font-semibold text-rose-500 tracking-wide mb-1">
              Stop Loss
            </div>
            <div className="text-sm sm:text-base font-bold text-rose-700 font-mono">
              {signal.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              -{signal.sl_distance_pips_points} pips
            </div>
          </div>

          {/* Take Profit (1:3 RR) */}
          <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100 text-center">
            <div className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wide mb-1">
              Target (1:3)
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-700 font-mono">
              {signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              +{Math.round(signal.sl_distance_pips_points * 3)} pips
            </div>
          </div>

        </div>

        {/* Lot Sizing Pill */}
        <div className="py-2 px-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Position Size:</span>
            <span className="font-bold text-slate-800 font-mono">
              {signal.calculated_lot_size} Lots
            </span>
            <span className="text-[10px] text-slate-500 font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-semibold">
              {signal.risk_percent}% Risk
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLots}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

      </div>

      {/* Card Action Footer */}
      <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {signal.status === 'IN_TRADE' && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMarkWin}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all shadow-xs"
                title="Mark trade as 1:3 Win"
              >
                Mark Win (+3R)
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMoveBE}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-xs"
                title="Move Stop Loss to Breakeven"
              >
                Move to BE
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMarkLoss}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all shadow-xs"
                title="Mark trade as Stop Loss Hit"
              >
                Mark SL (-1R)
              </button>
            </>
          )}

          {signal.status === 'PENDING' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(signal.id, 'IN_TRADE')}
              className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all shadow-xs"
            >
              Fill Limit Order
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteSignal(signal.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete signal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {onOpenChart && (
          <button
            type="button"
            onClick={() => onOpenChart(signal.symbol, signal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
            title={`Open Interactive Chart for ${signal.symbol}`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-300" />
            <span>Chart</span>
          </button>
        )}
      </div>

    </div>
  );
}

export const SignalCard = React.memo(SignalCardComponent);
