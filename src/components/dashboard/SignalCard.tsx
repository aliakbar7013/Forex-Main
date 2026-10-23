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
  XCircle,
  Star
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
  liveQuote?: { price: number; bid?: number; ask?: number; change?: number; changePercent?: number };
  isFavorite?: boolean;
  onToggleFavorite?: (symbol: string) => void;
}

export function SignalCardComponent({
  signal,
  onUpdateStatus,
  onDeleteSignal,
  onOpenChart,
  liveQuote,
  isFavorite = false,
  onToggleFavorite
}: SignalCardProps) {
  const [copied, setCopied] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isBuy = signal.action === 'BUY';
  const isCBDR = signal.strategy === 'CBDR';
  const isStopHunt = signal.strategy === 'STOP_HUNT';

  // Currency & Precision Detection
  const sym = signal.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isJpy = sym.includes('JPY');
  const isGold = sym.includes('XAU') || sym.includes('GOLD');
  const pipFactor = isGold ? 0.1 : (isJpy ? 0.01 : 0.0001);

  const formatLivePrice = (p: number | undefined | null) => {
    if (p === undefined || p === null || isNaN(p)) return '—';
    if (isJpy) return p.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    if (isGold) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  };

  // Extract Live Running Price
  const rawCurrentPrice = typeof liveQuote?.price === 'number'
    ? liveQuote.price
    : (typeof signal.raw_payload?.currentPrice === 'number'
        ? signal.raw_payload.currentPrice
        : (typeof signal.raw_payload?.price === 'number' ? signal.raw_payload.price : undefined));

  // If trade is in progress and currentPrice is missing, calculate from entry + floatingPips or default to entry
  const currentPrice = rawCurrentPrice !== undefined
    ? rawCurrentPrice
    : (signal.status === 'IN_TRADE'
        ? (signal.raw_payload?.floatingPips !== undefined
            ? (isBuy ? signal.entry + (Number(signal.raw_payload.floatingPips) * pipFactor) : signal.entry - (Number(signal.raw_payload.floatingPips) * pipFactor))
            : signal.entry)
        : undefined);

  // Dynamic floating pips calculation
  const floatingPips = currentPrice !== undefined
    ? Math.round((isBuy ? (currentPrice - signal.entry) / pipFactor : (signal.entry - currentPrice) / pipFactor) * 10) / 10
    : (signal.raw_payload?.floatingPips !== undefined ? Number(signal.raw_payload.floatingPips) : 0);

  const inProfit = floatingPips >= 0;

  // Flash animation on live tick update
  const prevPriceRef = React.useRef<number | undefined>(currentPrice);
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | null>(null);

  React.useEffect(() => {
    if (currentPrice !== undefined && prevPriceRef.current !== undefined && prevPriceRef.current !== currentPrice) {
      if (currentPrice > prevPriceRef.current) {
        setPriceFlash('UP');
      } else if (currentPrice < prevPriceRef.current) {
        setPriceFlash('DOWN');
      }
      const timer = setTimeout(() => setPriceFlash(null), 900);
      prevPriceRef.current = currentPrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Target 1:3 Progress calculation
  const totalTargetDistance = Math.abs(signal.tp1 - signal.entry);
  const currentDistanceToTarget = isBuy
    ? (signal.tp1 - (currentPrice ?? signal.entry))
    : ((currentPrice ?? signal.entry) - signal.tp1);
  const remainingPipsToTarget = Math.max(0, Math.round((currentDistanceToTarget / pipFactor) * 10) / 10);

  const distanceCovered = isBuy
    ? ((currentPrice ?? signal.entry) - signal.entry)
    : (signal.entry - (currentPrice ?? signal.entry));
  const progressPercent = totalTargetDistance > 0
    ? Math.min(100, Math.max(0, Math.round((distanceCovered / totalTargetDistance) * 100)))
    : 0;

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

  // Safe Date of Entry formatting: prevents UTC midnight timezone rollback shifting day backwards
  const getSafeFormattedDate = () => {
    const raw = signal.date_of_entry || (signal.created_at ? signal.created_at.split('T')[0] : '');
    if (!raw) return '';
    const cleanStr = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [y, m, d] = cleanStr.split('-').map(Number);
      const safeDate = new Date(y, m - 1, d, 12, 0, 0);
      return safeDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return cleanStr;
    return d.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const entryDateFormatted = getSafeFormattedDate();
  const createdDate = new Date(signal.created_at || signal.date_of_entry || '');
  const isValidDate = !isNaN(createdDate.getTime());
  const entryIsoDate = signal.date_of_entry || (isValidDate ? createdDate.toISOString().split('T')[0] : '');

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Pending
          </span>
        );
      case 'IN_TRADE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            In Trade
          </span>
        );
      case 'TP1_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            TP1 (BE Active)
          </span>
        );
      case 'CLOSED_PROFIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <Trophy className="w-3 h-3 text-emerald-600" />
            Target Hit (+3R)
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <Skull className="w-3 h-3 text-rose-600" />
            SL Hit (-1R)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
            {signal.status}
          </span>
        );
    }
  };

  return (
    <div className={`stripe-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
      isFavorite ? 'ring-2 ring-amber-400/50 shadow-md bg-gradient-to-b from-amber-500/[0.02] to-transparent' : ''
    }`}>
      
      {/* Top Card Body */}
      <div className="p-4 sm:p-5">
        
        {/* Row 1: Symbol & Direction (Left) + Status & Floating Pips (Right) */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
              isBuy 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}>
              {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-lg font-black text-slate-900 font-mono tracking-tight whitespace-nowrap">
                {signal.symbol.replace(/([A-Z]{3})([A-Z]{3})/, '$1 / $2')}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase border whitespace-nowrap ${
                isBuy 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {signal.action} {isBuy ? '▲' : '▼'}
              </span>

              {/* Interactive Favorite Star Button & Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(signal.symbol);
                }}
                className={`p-1 rounded-lg transition-all flex items-center gap-1 group cursor-pointer ${
                  isFavorite 
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 shadow-xs' 
                    : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                }`}
                title={isFavorite ? `★ ${signal.symbol} is a Favorite Pair (Click to unstar)` : `Star ${signal.symbol} as Favorite Pair`}
              >
                <Star className={`w-3.5 h-3.5 transition-transform group-hover:scale-115 ${
                  isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300 group-hover:text-amber-500'
                }`} />
                {isFavorite && (
                  <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider font-sans whitespace-nowrap pr-0.5">
                    FAV
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {floatingPips !== undefined && signal.status === 'IN_TRADE' && (
              <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border whitespace-nowrap ${
                inProfit
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {inProfit ? '+' : ''}{floatingPips} pips
              </span>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Row 2: Strategy, Setup & Entry Date Ribbon */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-slate-100 mb-3">
          <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
            {isCBDR ? 'CBDR 15m' : isStopHunt ? 'Stop Hunt 5m' : signal.strategy}
          </span>

          {isCBDR && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${
              isMajorPair(signal.symbol)
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isMajorPair(signal.symbol) ? 'Major • PDH/PDL Sweep' : '🎯 Minor • 1st London FVG'}
            </span>
          )}

          {/* Prominent Date of Entry Pill */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80 font-mono whitespace-nowrap">
            <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
            <span>Entry: {entryIsoDate}</span>
          </span>

          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
            {dayName}
          </span>
        </div>

        {/* Row 3: Session Time & Rules Trigger */}
        <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-50 border border-slate-100 rounded-lg mb-3">
          <div className="flex items-center gap-2 text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1 text-slate-900 font-bold font-mono text-[11px] whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{entryDateFormatted}</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-slate-600 text-[11px] whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-700 font-semibold">{signal.session_name || timeFormatted}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setShowValidationDetails(!showValidationDetails)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-semibold shrink-0 ml-1 transition-colors"
            title="View validation criteria"
          >
            {isValid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Rules</span>
            {showValidationDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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

        {/* Core 4-Box Price Matrix (2x2 Grid for optimal readability and spacing) */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          
          {/* Box 1: Limit Entry */}
          <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/90 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wide flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-blue-500" />
                <span>Entry</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono font-medium">Order</span>
            </div>
            <div className="text-base font-bold text-slate-900 font-mono tracking-tight">
              {formatLivePrice(signal.entry)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              {isCBDR && !isMajorPair(signal.symbol) 
                ? '1st London FVG' 
                : isCBDR 
                  ? 'Post-Sweep FVG' 
                  : '5m Imbalance'}
            </div>
          </div>

          {/* Box 2: Live Current Price (Prominently Running) */}
          <div className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
            priceFlash === 'UP'
              ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-300 shadow-sm'
              : priceFlash === 'DOWN'
                ? 'bg-rose-100/90 border-rose-400 ring-2 ring-rose-300 shadow-sm'
                : inProfit
                  ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                  : 'bg-rose-50/90 border-rose-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    inProfit ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    inProfit ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}></span>
                </span>
                <span className={inProfit ? 'text-emerald-700' : 'text-rose-700'}>
                  Live Price
                </span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Tick
              </span>
            </div>
            <div className={`text-base font-black font-mono tracking-tight ${
              inProfit ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {currentPrice !== undefined ? formatLivePrice(currentPrice) : 'Syncing...'}
            </div>
            <div className={`text-[10px] font-bold font-mono mt-1 ${
              inProfit ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {inProfit ? '+' : ''}{floatingPips} pips
            </div>
          </div>

          {/* Box 3: Stop Loss */}
          <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100/90 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wide">
                Stop Loss
              </span>
              <span className="text-[9px] text-rose-400 font-mono font-medium">1.0R</span>
            </div>
            <div className="text-base font-bold text-rose-700 font-mono tracking-tight">
              {formatLivePrice(signal.sl)}
            </div>
            <div className="text-[10px] text-rose-600 font-semibold font-mono mt-1">
              -{signal.sl_distance_pips_points} pips
            </div>
          </div>

          {/* Box 4: Take Profit (1:3 RR) */}
          <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/90 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wide">
                Target (1:3)
              </span>
              <span className="text-[9px] text-emerald-500 font-mono font-medium">3.0R</span>
            </div>
            <div className="text-base font-bold text-emerald-700 font-mono tracking-tight">
              {formatLivePrice(signal.tp1)}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold font-mono mt-1">
              +{Math.round(signal.sl_distance_pips_points * 3)} pips
            </div>
          </div>

        </div>

        {/* Dynamic 1:3 Target Progress Bar */}
        {signal.status === 'IN_TRADE' && currentPrice !== undefined && (
          <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${inProfit ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>1:3 Target Progress: <strong className="font-mono text-slate-900">{progressPercent}%</strong></span>
              </span>
              <span className="font-mono text-slate-500">
                {remainingPipsToTarget > 0 ? `${remainingPipsToTarget} pips to TP1` : 'Target Level Reached'}
              </span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent >= 80 
                    ? 'bg-emerald-500 shadow-sm' 
                    : progressPercent >= 40 
                      ? 'bg-emerald-400' 
                      : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

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
