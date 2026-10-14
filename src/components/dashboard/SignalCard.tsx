'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Trophy, 
  Skull, 
  Crosshair, 
  Trash2, 
  Code
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Signal, SignalStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { soundEngine } from '@/lib/soundEngine';
import { getSignalTradingDay, isMajorPair } from '@/lib/strategyValidator';
import { BarChart2 } from 'lucide-react';

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
  onViewPayload,
  onOpenChart
}: SignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isBuy = signal.action === 'BUY';
  const isCBDR = signal.strategy === 'CBDR';
  const isStopHunt = signal.strategy === 'STOP_HUNT';
  const isNewYork = signal.strategy === 'NEW_YORK';

  // Strategy Theme
  const getStrategyBadge = () => {
    if (isCBDR) {
      return (
        <Badge variant="cyan" size="sm" dot>
          CBDR Model • {signal.timeframe}
        </Badge>
      );
    }
    if (isStopHunt) {
      return (
        <Badge variant="amber" size="sm" dot>
          Stop Hunt • {signal.timeframe}
        </Badge>
      );
    }
    if (isNewYork) {
      return (
        <Badge variant="purple" size="sm" dot>
          New York Open • {signal.timeframe}
        </Badge>
      );
    }
    return (
      <Badge variant="slate" size="sm">
        {signal.strategy} • {signal.timeframe}
      </Badge>
    );
  };

  // Status Badge
  const getStatusBadge = () => {
    switch (signal.status) {
      case 'PENDING':
        return <Badge variant="slate" size="sm">Pending Entry</Badge>;
      case 'IN_TRADE':
        return <Badge variant="blue" size="sm" dot>In Trade</Badge>;
      case 'TP1_HIT':
        return <Badge variant="emerald" size="sm" dot>TP1 Hit (BE Active)</Badge>;
      case 'TP2_HIT':
        return <Badge variant="emerald" size="sm" dot>TP2 Hit</Badge>;
      case 'CLOSED_PROFIT':
        return <Badge variant="emerald" size="sm">Closed Profit</Badge>;
      case 'SL_HIT':
        return <Badge variant="rose" size="sm">SL Hit</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="slate" size="sm">{signal.status}</Badge>;
    }
  };

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
        particleCount: 80,
        spread: 70,
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

  // Calculate formatted relative date in New York & Indian Time (IST)
  const createdDate = new Date(signal.created_at);
  const nyTime = createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  const istTime = createdDate.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  const timeFormatted = `${nyTime} NY • ${istTime} IST`;
  const { dayName, dateFormatted, fullDateFormatted, isCbdrValid } = getSignalTradingDay(signal);
  const todayDayName = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
  const isTodayNonTradingDay = todayDayName === 'Thursday' || todayDayName === 'Friday';

  // Rule Validation Status Display
  const validationStatus = signal.validation?.overallStatus || 'PASSED';
  const isValid = validationStatus === 'PASSED';
  const isWarning = validationStatus === 'WARNING';
  const isFailed = validationStatus === 'FAILED';

  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      
      {/* Top Accent Strip */}
      <div className={`h-1.5 w-full ${
        isBuy ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'
      }`} />

      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-start justify-between gap-3">
          
          {/* Symbol & Direction */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-black ${
              isBuy 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs' 
                : 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
            }`}>
              {isBuy ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 font-mono">
                  {signal.symbol}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-black tracking-wider ${
                  isBuy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {signal.action}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {getStrategyBadge()}
                {isCBDR && (
                  <>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isMajorPair(signal.symbol)
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    }`}>
                      {isMajorPair(signal.symbol) ? '⚡ Major (USD Attached): PDH/PDL Swept' : '🎯 Minor (No USD): 1st Imbalance'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                      🔒 1 Trade / Day
                    </span>
                  </>
                )}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  isCBDR
                    ? isCbdrValid 
                      ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  📅 {dayName} ({dateFormatted})
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-col items-end gap-1.5">
            {getStatusBadge()}
            
            {/* Validation State Badge */}
            <div 
              onClick={() => setShowValidationDetails(!showValidationDetails)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                isValid 
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200' 
                  : isWarning 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200' 
                    : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 animate-pulse'
              }`}
              title="Click to view strategy criteria validation details"
            >
              {isValid && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
              {isWarning && <AlertTriangle className="w-3 h-3 text-amber-700" />}
              {isFailed && <XCircle className="w-3 h-3 text-rose-700" />}
              <span>{validationStatus}</span>
              {showValidationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>

        </div>
      </div>

      {/* Dedicated Trade Entry Date & Time Ribbon */}
      <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-slate-700 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-900">Entry Placed:</span>
          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-slate-900 shadow-2xs">
            {fullDateFormatted} • {timeFormatted}
          </span>
        </div>
        {isCBDR && isTodayNonTradingDay ? (
          <span className="text-[10px] font-mono font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
            <span>Entered on {dayName} ({dateFormatted}) • Running on {todayDayName} (CBDR Non-Trading Day)</span>
          </span>
        ) : signal.session_name ? (
          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
            {signal.session_name}
          </span>
        ) : null}
      </div>

      {/* Validation Checklist Drawer (Accordion) */}
      {showValidationDetails && signal.validation && (
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span>Automated Strategy Rules Checklist:</span>
            <span className="text-[10px] text-slate-500 font-medium">{signal.validation.summary}</span>
          </div>
          <div className="space-y-1.5">
            {signal.validation.checks.map((check) => (
              <div 
                key={check.id} 
                className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                  check.passed 
                    ? 'bg-white border-emerald-200 text-slate-800' 
                    : check.severity === 'ERROR'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : check.severity === 'ERROR' ? (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block text-[11px] text-slate-900">{check.name}</span>
                    <span className="text-[10px] text-slate-600 font-medium">{check.message}</span>
                  </div>
                </div>
                {check.received && (
                  <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold shrink-0">
                    {check.received}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Ladder (Entry, SL, TP1, TP2, TP3) */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Prominent Current Running Price & Floating PnL Box */}
        {Boolean(signal.raw_payload?.currentPrice) && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Current Running Price
                </span>
              </div>
              
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                TradingView Live Feed
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-amber-300 tracking-tight tabular-nums">
                  {Number(signal.raw_payload?.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {signal.raw_payload?.floatingPips !== undefined && (
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black shadow-xs ${
                    Number(signal.raw_payload.floatingPips) >= 0
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {Number(signal.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(signal.raw_payload.floatingPips)} pips
                  </span>
                )}
              </div>
            </div>

            {/* Distance to Target vs Stop */}
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                🎯 TP1 (1:3): {signal.tp1} ({(() => {
                  const pipFactor = signal.symbol.includes('JPY') ? 0.01 : signal.symbol.includes('XAU') ? 0.1 : 0.0001;
                  const pipsToTp = Math.abs((signal.tp1 - Number(signal.raw_payload?.currentPrice || signal.entry)) / pipFactor).toFixed(1);
                  return `${pipsToTp} pips away`;
                })()})
              </span>
              <span className="text-rose-400 flex items-center gap-1 font-bold">
                🛑 SL: {signal.sl} ({(() => {
                  const pipFactor = signal.symbol.includes('JPY') ? 0.01 : signal.symbol.includes('XAU') ? 0.1 : 0.0001;
                  const pipsToSl = Math.abs((Number(signal.raw_payload?.currentPrice || signal.entry) - signal.sl) / pipFactor).toFixed(1);
                  return `${pipsToSl} pips cushion`;
                })()})
              </span>
            </div>
          </div>
        )}

        {/* Entry & SL Row */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Limit Entry (1st Imbalance) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5 flex items-center justify-between">
              <span>Limit Entry</span>
              <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                1st Imbalance
              </span>
            </div>
            <div className="text-base font-black text-slate-900 font-mono">
              {signal.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            {Boolean(signal.raw_payload?.imbalanceZone) && (
              <div className="text-[9px] text-indigo-900 bg-indigo-50/80 border border-indigo-200/80 px-1.5 py-0.5 rounded font-mono mt-1 font-bold truncate" title={`15m FVG Zone: ${signal.raw_payload?.imbalanceZone}`}>
                FVG: {String(signal.raw_payload?.imbalanceZone)}
              </div>
            )}
          </div>

          {/* Stop Loss (London Session Low/High for Majors, Imbalance + Breathing Space for Minors) */}
          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider mb-0.5 flex items-center justify-between">
              <span>Stop Loss</span>
              <span className="font-mono text-[9px] text-rose-600 font-bold bg-rose-100/80 px-1 py-0.2 rounded">
                {String(signal.raw_payload?.slPlacementType || (isMajorPair(signal.symbol) ? (isBuy ? 'London Session Low' : 'London Session High') : (isBuy ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG')))}
              </span>
            </div>
            <div className="text-base font-black text-rose-700 font-mono">
              {signal.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
              Risk: {signal.sl_distance_pips_points} pips
            </div>
          </div>

        </div>

        {/* Take Profit Targets Row */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
            <span>Targets & Scale-Outs</span>
            <span className="text-emerald-700 font-mono font-bold text-[10px]">
              Primary 1:{signal.primary_risk_reward} RR
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* TP1 (50% scale-out) */}
            <div className={`p-2 rounded-xl border text-center transition-all ${
              signal.status === 'TP1_HIT' || signal.status === 'CLOSED_PROFIT'
                ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-2 ring-emerald-300/30'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-[9px] font-bold text-slate-600">TP1 (50% BE)</div>
              <div className="text-xs font-black text-emerald-700 font-mono">
                {signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
              </div>
              <div className="text-[9px] text-emerald-700 font-mono mt-0.5 font-bold">
                1:{signal.primary_risk_reward || 2.0} RR
              </div>
            </div>

            {/* TP2 (30% scale-out) */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-600">TP2 (30%)</div>
              <div className="text-xs font-black text-slate-900 font-mono">
                {signal.tp2 ? signal.tp2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) : 'Runner'}
              </div>
              <div className="text-[9px] text-slate-600 font-mono mt-0.5 font-bold">
                {signal.tp2 ? `1:${((signal.primary_risk_reward || 2.0) * 1.5).toFixed(1)} RR` : 'Runner'}
              </div>
            </div>

            {/* TP3 (20% Runner) */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-600">TP3 (20%)</div>
              <div className="text-xs font-black text-slate-900 font-mono">
                {signal.tp3 ? signal.tp3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) : 'Runner'}
              </div>
              <div className="text-[9px] text-slate-600 font-mono mt-0.5 font-bold">
                {signal.tp3 ? `1:${((signal.primary_risk_reward || 2.0) * 2.5).toFixed(1)} RR` : 'Runner'}
              </div>
            </div>
          </div>
        </div>

        {/* Defensive Lot Sizing Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">Position Size</span>
              <span className="text-[10px] text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 border border-blue-200">
                {signal.risk_percent}% Risk
              </span>
            </div>

            {/* Copy Lots Button */}
            <button
              onClick={handleCopyLots}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Lots' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                {signal.calculated_lot_size}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">
                Lots
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-800">
                {signal.sl_distance_pips_points} pts
              </span>
              <span className="text-[10px] text-slate-500 block font-medium">
                Stop Distance
              </span>
            </div>
          </div>
        </div>

        {/* Realized Outcome (if trade completed) */}
        {signal.realized_pnl_usd !== undefined && signal.realized_pnl_usd !== null && (
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            signal.realized_pnl_usd >= 0 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <span className="text-xs font-bold flex items-center gap-1">
              {signal.realized_pnl_usd >= 0 ? <Trophy className="w-4 h-4 text-emerald-600" /> : <Skull className="w-4 h-4 text-rose-600" />}
              Trade Outcome:
            </span>
            <span className="text-sm font-black font-mono">
              {signal.realized_pnl_usd >= 0 ? `WIN (+${signal.primary_risk_reward || 2.0}R)` : 'LOSS (-1.0R)'}
            </span>
          </div>
        )}

      </div>

      {/* Clean Footer - TradingView Chart Access */}
      {onOpenChart && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end">
          <button
            onClick={() => onOpenChart(signal.symbol, signal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs"
            title={`Open Live TradingView Chart for ${signal.symbol}`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Open TradingView Chart</span>
          </button>
        </div>
      )}

    </div>
  );
}

export const SignalCard = React.memo(SignalCardComponent);
