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
  Trophy, 
  Skull, 
  BarChart2,
  Trash2,
  ShieldCheck,
  Zap,
  Target
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
  onViewPayload,
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
  const { dayName, dateFormatted } = getSignalTradingDay(signal);

  const validationStatus = signal.validation?.overallStatus || 'PASSED';
  const isValid = validationStatus === 'PASSED';

  // Status Badge
  const getStatusBadge = () => {
    switch (signal.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/80 text-slate-300 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Pending Entry
          </span>
        );
      case 'IN_TRADE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 glow-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            In Trade
          </span>
        );
      case 'TP1_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 glow-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            TP1 Hit (BE Active)
          </span>
        );
      case 'CLOSED_PROFIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 glow-emerald">
            <Trophy className="w-3 h-3 text-emerald-400" />
            Closed Profit (+3R)
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 glow-rose">
            <Skull className="w-3 h-3 text-rose-400" />
            SL Hit (-1R)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {signal.status}
          </span>
        );
    }
  };

  return (
    <div className="relative bg-[#0d121f]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group">
      
      {/* Top Accent Strip with Neon Glow */}
      <div className={`h-1 w-full ${
        isBuy ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500' : 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500'
      }`} />

      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#090e1a]/60">
        <div className="flex items-start justify-between gap-3">
          
          {/* Symbol & Direction */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl font-black border transition-transform group-hover:scale-105 ${
              isBuy 
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-950/40' 
                : 'bg-rose-950/70 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-950/40'
            }`}>
              {isBuy ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  {signal.symbol.replace(/([A-Z]{3})([A-Z]{3})/, '$1 / $2')}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider border ${
                  isBuy 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}>
                  {signal.action} {isBuy ? '▲' : '▼'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                  {isCBDR ? '⚡ CBDR 15m (London)' : isStopHunt ? '🎯 Stop Hunt 5m' : signal.strategy}
                </span>

                {isCBDR && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    isMajorPair(signal.symbol)
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                  }`}>
                    {isMajorPair(signal.symbol) ? '⚡ Major (PDH/PDL Swept)' : '🎯 Minor Cross'}
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#141b2d] text-slate-300 border border-white/[0.06]">
                  📅 {dayName}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {getStatusBadge()}
            
            {/* Quick Validation Check Pill */}
            <button 
              type="button"
              onClick={() => setShowValidationDetails(!showValidationDetails)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-400 hover:text-white bg-[#121827] border border-white/[0.06] transition-colors"
              title="View strategy validation criteria"
            >
              {isValid ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
              <span>{validationStatus}</span>
              {showValidationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

        </div>
      </div>

      {/* Dedicated Trade Entry Date & Time Ribbon */}
      <div className="px-4 py-2 bg-[#0a0e19]/90 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-300 font-bold">Execution Window:</span>
          <span className="font-mono text-[11px] bg-[#121829] px-2 py-0.5 rounded border border-white/[0.08] font-bold text-cyan-300">
            {signal.session_name || timeFormatted}
          </span>
        </div>

        {signal.raw_payload?.floatingPips !== undefined && (
          <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
            Number(signal.raw_payload.floatingPips) >= 0
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
          }`}>
            Live PnL: {Number(signal.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(signal.raw_payload.floatingPips)} pips
          </span>
        )}
      </div>

      {/* Validation Checklist Drawer (Accordion) */}
      {showValidationDetails && signal.validation && (
        <div className="p-3.5 bg-[#0a0f1d] border-b border-white/[0.08] text-xs">
          <div className="font-bold text-white mb-2 flex items-center justify-between">
            <span>Automated Strategy Rules Checklist:</span>
            <span className="text-[10px] text-slate-400">{signal.validation.summary}</span>
          </div>
          <div className="space-y-1.5">
            {signal.validation.checks.map((check) => (
              <div 
                key={check.id} 
                className={`p-2 rounded-xl border flex items-start justify-between gap-2 ${
                  check.passed 
                    ? 'bg-[#101728] border-emerald-500/30 text-slate-200' 
                    : check.severity === 'ERROR'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : check.severity === 'ERROR' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block text-[11px] text-white">{check.name}</span>
                    <span className="text-[10px] text-slate-400">{check.message}</span>
                  </div>
                </div>
                {check.received && (
                  <span className="text-[10px] font-mono bg-white/[0.08] px-1.5 py-0.5 rounded text-slate-300 font-bold shrink-0">
                    {check.received}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Trade Prices Matrix */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* 3-Level Grid (Entry, SL, TP1) */}
        <div className="grid grid-cols-3 gap-2.5">
          
          {/* Limit Entry */}
          <div className="p-3 rounded-xl bg-[#111728] border border-white/[0.08] relative">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
              <span>Limit Entry</span>
            </div>
            <div className="text-base font-black text-white font-mono">
              {signal.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[9px] text-cyan-400 font-mono mt-1 font-bold">
              1st 15m FVG
            </div>
          </div>

          {/* Stop Loss */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 relative">
            <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mb-1 flex items-center justify-between">
              <span>Stop Loss</span>
            </div>
            <div className="text-base font-black text-rose-300 font-mono">
              {signal.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[9px] text-rose-400/80 font-mono mt-1 font-bold">
              {signal.sl_distance_pips_points} pips risk
            </div>
          </div>

          {/* Take Profit (1:3 RR) */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 relative">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1 flex items-center justify-between">
              <span>Take Profit</span>
            </div>
            <div className="text-base font-black text-emerald-300 font-mono">
              {signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>
            <div className="text-[9px] text-emerald-400 font-mono mt-1 font-bold">
              1:{signal.primary_risk_reward || 3.0} RR Target
            </div>
          </div>

        </div>

        {/* Position Sizing & Lots Row */}
        <div className="p-3 rounded-xl bg-[#111728]/80 border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Lot Sizing:</span>
            <span className="text-base font-black text-cyan-400 font-mono">
              {signal.calculated_lot_size} Lots
            </span>
            <span className="text-[10px] text-blue-300 font-mono bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded font-bold">
              {signal.risk_percent}% Risk
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLots}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded-lg border border-white/[0.08]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Lots'}</span>
          </button>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-white/[0.06] bg-[#090e1a]/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {signal.status === 'IN_TRADE' && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMarkWin}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all"
                title="Mark trade as 1:3 Win"
              >
                Mark Win (+3R)
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMoveBE}
                className="px-2.5 py-1 rounded-lg bg-[#141b2d] hover:bg-[#1a233b] text-cyan-300 border border-white/[0.08] text-[11px] font-bold transition-all"
                title="Move Stop Loss to Breakeven"
              >
                Move to BE
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleMarkLoss}
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all"
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
              className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition-all"
            >
              Fill Limit Order
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteSignal(signal.id)}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            title="Delete signal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {onOpenChart && (
          <button
            type="button"
            onClick={() => onOpenChart(signal.symbol, signal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-xs"
            title={`Open Interactive TradingView Chart for ${signal.symbol}`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Chart</span>
          </button>
        )}
      </div>

    </div>
  );
}

export const SignalCard = React.memo(SignalCardComponent);
