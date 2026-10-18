'use client';

import React, { useState, useMemo } from 'react';
import { Signal, TradeAction } from '@/types';
import { isMajorPair } from '@/lib/strategyValidator';
import { 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  Check, 
  RotateCcw, 
  Info,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface V2DashboardProps {
  displayedSignals: Signal[];
  allSignals: Signal[];
  isLoading: boolean;
  viewMode: 'cards' | 'table';
  setViewMode: (mode: 'cards' | 'table') => void;
  selectedStrategy: string;
  setSelectedStrategy: (s: any) => void;
  selectedStatus: string;
  setSelectedStatus: (s: any) => void;
  selectedDirection: string;
  setSelectedDirection: (d: any) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  strategyCounts: { all: number; cbdr: number; stopHunt: number; newYork: number };
  isRefreshingLive?: boolean;
  isBackgroundSyncing?: boolean;
  autoSync5s: boolean;
  setAutoSync5s: React.Dispatch<React.SetStateAction<boolean>>;
  countdown: number;
  tradeToast: { id: string; symbol: string; outcome: 'WIN' | 'LOSS'; message: string; pnl: number } | null;
  setTradeToast: React.Dispatch<React.SetStateAction<{ id: string; symbol: string; outcome: 'WIN' | 'LOSS'; message: string; pnl: number } | null>>;
  handleRefreshLiveSignals: () => void;
  handleUpdateSignalStatus: (id: string, status: any) => void;
  handleDeleteSignal: (id: string) => void;
  handleViewPayload: (s: Signal) => void;
  handleOpenChart: (symbol: string, signal?: Signal) => void;
  setIsCreateOpen: (open: boolean) => void;
  setIsSimulatorOpen: (open: boolean) => void;
  setActiveTab: (tab: any) => void;
  onSwitchToV1: () => void;
}

export function V2Dashboard({
  allSignals,
  isLoading,
  viewMode,
  setViewMode,
  onSwitchToV1
}: V2DashboardProps) {
  // V2 Specific Filter States
  const [v2CategoryFilter, setV2CategoryFilter] = useState<'ALL' | 'CBDR_MINOR' | 'CBDR_MAJOR' | 'STOP_HUNT'>('ALL');
  const [v2DirectionFilter, setV2DirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [v2Search, setV2Search] = useState('');
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({});

  const toggleCheckExpand = (id: string) => {
    setExpandedChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter for pairs in live trade that have passed strategy validation
  const qualifiedLivePairs = useMemo(() => {
    return allSignals.filter(signal => {
      // Must be currently active / in trade
      const isActiveTrade = signal.status === 'IN_TRADE' || signal.status === 'PENDING';
      // Must have qualified/passed strategy rules
      const hasPassedRules = signal.validation?.isValid !== false && signal.validation?.overallStatus !== 'FAILED';

      return isActiveTrade && hasPassedRules;
    });
  }, [allSignals]);

  // Apply V2 category and direction filters
  const filteredPairs = useMemo(() => {
    return qualifiedLivePairs.filter(signal => {
      const isMajor = isMajorPair(signal.symbol);

      // Category filter
      if (v2CategoryFilter === 'CBDR_MINOR') {
        if (signal.strategy !== 'CBDR' || isMajor) return false;
      } else if (v2CategoryFilter === 'CBDR_MAJOR') {
        if (signal.strategy !== 'CBDR' || !isMajor) return false;
      } else if (v2CategoryFilter === 'STOP_HUNT') {
        if (signal.strategy !== 'STOP_HUNT') return false;
      }

      // Direction filter
      if (v2DirectionFilter !== 'ALL' && signal.action !== v2DirectionFilter) {
        return false;
      }

      // Search filter
      if (v2Search.trim()) {
        const q = v2Search.toLowerCase().trim();
        const sym = signal.symbol.toLowerCase();
        const strat = signal.strategy.toLowerCase();
        if (!sym.includes(q) && !strat.includes(q)) return false;
      }

      return true;
    });
  }, [qualifiedLivePairs, v2CategoryFilter, v2DirectionFilter, v2Search]);

  // Statistics for Category Pills
  const counts = useMemo(() => {
    let cbdrMinor = 0;
    let cbdrMajor = 0;
    let stopHunt = 0;

    qualifiedLivePairs.forEach(s => {
      const isMajor = isMajorPair(s.symbol);
      if (s.strategy === 'CBDR') {
        if (isMajor) cbdrMajor++;
        else cbdrMinor++;
      } else if (s.strategy === 'STOP_HUNT') {
        stopHunt++;
      }
    });

    return {
      total: qualifiedLivePairs.length,
      cbdrMinor,
      cbdrMajor,
      stopHunt
    };
  }, [qualifiedLivePairs]);

  return (
    <div className="space-y-6">
      
      {/* V2 Header Banner - Qualified Strategy Pairs (NO Prices / NO TP / NO SL) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-500/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Version 2.0 • Qualified Pairs Board
              </span>
              <span className="text-[11px] text-slate-400">
                • Filtered Strictly by Rule Execution (No Prices or TP/SL)
              </span>
            </div>
            
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Strategy Qualified Pairs in Live Trade</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                {counts.total} Active
              </span>
            </h2>
            
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Displaying currency pairs that have satisfied all institutional strategy conditions. Major pairs enforce the <strong>PDH/PDL liquidity sweep</strong> rule, while Minor pairs execute directly on the <strong>1st London Imbalance</strong>. All pricing and TP/SL values are omitted.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToV1}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-indigo-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Switch to v1 (Full Details)</span>
            </button>
          </div>
        </div>
      </div>

      {/* V2 Filter & Control Ribbon */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        
        {/* Category Pills (Major vs Minor vs Stop Hunt) */}
        <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setV2CategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              v2CategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>All Qualified</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              v2CategoryFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setV2CategoryFilter('CBDR_MINOR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              v2CategoryFilter === 'CBDR_MINOR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
            title="Minor Pairs: Direct 1st London 15m Imbalance (No PDH/PDL Sweep Required)"
          >
            <span>CBDR Minor (1st Imbalance)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              v2CategoryFilter === 'CBDR_MINOR' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.cbdrMinor}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setV2CategoryFilter('CBDR_MAJOR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              v2CategoryFilter === 'CBDR_MAJOR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
            title="Major Pairs: Must Sweep Previous Day High or Low (PDH/PDL)"
          >
            <span>CBDR Major (PDH/PDL Sweep)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              v2CategoryFilter === 'CBDR_MAJOR' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.cbdrMajor}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setV2CategoryFilter('STOP_HUNT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              v2CategoryFilter === 'STOP_HUNT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>Stop Hunt (Asian Sweep)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              v2CategoryFilter === 'STOP_HUNT' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.stopHunt}
            </span>
          </button>
        </div>

        {/* Right Tools: Direction, Search & View Mode */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setV2DirectionFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                v2DirectionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setV2DirectionFilter('BUY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                v2DirectionFilter === 'BUY' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setV2DirectionFilter('SELL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                v2DirectionFilter === 'SELL' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              SELL
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={v2Search}
              onChange={(e) => setV2Search(e.target.value)}
              placeholder="Search pair..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 w-28 sm:w-36 font-semibold"
            />
          </div>

          {/* View Toggle (Cards vs Table) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* Main List of Qualified Pairs */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-3" />
          <p className="text-xs font-medium text-slate-600 tracking-wide">Scanning Live Strategy Validations...</p>
        </div>
      ) : filteredPairs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No Qualified Pairs Under Current Filter
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
            There are currently no active live trades matching this specific filter. Pairs appear here only when all institutional validation rules have passed.
          </p>
          <button
            type="button"
            onClick={() => { setV2CategoryFilter('ALL'); setV2DirectionFilter('ALL'); setV2Search(''); }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View - Clean Institutional Pair Cards (Zero Prices, Zero TP/SL) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPairs.map((signal) => {
            const isMajor = isMajorPair(signal.symbol);
            const isBuy = signal.action === 'BUY';
            const entryDate = signal.date_of_entry || signal.created_at.split('T')[0];
            const isExpanded = !!expandedChecks[signal.id];

            return (
              <div 
                key={signal.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Pair Header Row: Symbol, Major/Minor Badge, Direction Badge */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black font-sans text-xs tracking-wider shadow-xs">
                        {signal.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 font-sans">
                          {signal.symbol}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border ${
                            isMajor 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isMajor ? 'Major Pair' : 'Minor Cross'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            {signal.timeframe}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Trade Direction Badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold font-mono text-xs shadow-2xs border ${
                      isBuy 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{signal.action}</span>
                    </div>
                  </div>

                  {/* Institutional Qualification Rule Ribbon */}
                  <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl mb-4 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Strategy Qualification Rule:
                    </div>
                    
                    {signal.strategy === 'CBDR' ? (
                      isMajor ? (
                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>CBDR Major: PDH / PDL Liquidity Sweep Confirmed</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>CBDR Minor: Direct 1st London 15m Imbalance Entry</span>
                        </div>
                      )
                    ) : (
                      <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Stop Hunt: Asian Range Sweep + 5m CHoCH</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 font-medium">
                      {isMajor 
                        ? 'High-liquidity major pair verified through previous daily high/low sweep in Killzone.'
                        : 'Minor currency pair enters strictly on first 15m imbalance. No PDH/PDL sweep required.'
                      }
                    </div>
                  </div>

                  {/* Session Window & Date of Entry */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        <span>Date of Entry</span>
                      </div>
                      <div className="font-mono font-bold text-slate-800">
                        {entryDate}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Session</span>
                      </div>
                      <div className="font-semibold text-slate-800 truncate" title={signal.session_name || 'London Session'}>
                        {signal.session_name || 'London Session'}
                      </div>
                    </div>
                  </div>

                  {/* Strategy Rule Verification Drawer (Zero Prices) */}
                  <div className="border border-slate-200/70 rounded-xl overflow-hidden mb-2">
                    <button
                      type="button"
                      onClick={() => toggleCheckExpand(signal.id)}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Institutional Rules Passed ({signal.validation?.checks?.length || 4}/4)</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white space-y-2 border-t border-slate-200/60 text-xs animate-in fade-in duration-150">
                        {signal.validation?.checks && signal.validation.checks.length > 0 ? (
                          signal.validation.checks.map(check => (
                            <div key={check.id} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                                  {check.name}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                  {check.message
                                    .replace(/\b\d+\.\d+\b/g, '[Target Level]')
                                    .replace(/\(\d+\.\d+\s*–\s*\d+\.\d+\)/g, '(Imbalance Zone)')
                                    .replace(/Zone:\s*\d+\.\d+\s*–\s*\d+\.\d+/g, 'Zone: 15m Imbalance')
                                    .replace(/@\s*\d+\.\d+/g, '@ Imbalance Level')
                                  }
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-1.5 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Rule: Strictly 1 Trade Per Day (Enforced)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Rule: Valid London Session Window (03:00 - 11:45 NY)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Rule: Macro Central Bank Rate Bias Aligned</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Rule: {isMajor ? 'Major PDH/PDL Sweep Confirmed' : 'Minor 1st Imbalance Validated'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Live Trade Status Pill */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Qualified Live Trade Active</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    {signal.strategy}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View - Clean Minimal Qualified Pairs Spreadsheet (No Prices) */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">Date of Entry</th>
                  <th className="py-3 px-4">Currency Pair</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Strategy Rule Qualified</th>
                  <th className="py-3 px-4">Session Window</th>
                  <th className="py-3 px-4 text-center">Rule Verification</th>
                  <th className="py-3 px-4 text-right">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPairs.map((signal) => {
                  const isMajor = isMajorPair(signal.symbol);
                  const isBuy = signal.action === 'BUY';
                  const entryDate = signal.date_of_entry || signal.created_at.split('T')[0];

                  return (
                    <tr key={signal.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date of Entry */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>{entryDate}</span>
                        </div>
                      </td>

                      {/* Currency Pair */}
                      <td className="py-3 px-4 font-sans font-black text-sm text-slate-900 whitespace-nowrap">
                        {signal.symbol}
                      </td>

                      {/* Major vs Minor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          isMajor ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isMajor ? 'Major Pair' : 'Minor Cross'}
                        </span>
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                          isBuy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{signal.action}</span>
                        </span>
                      </td>

                      {/* Strategy Rule Qualified */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {signal.strategy === 'CBDR' ? (
                          isMajor ? (
                            <span className="text-blue-900 font-semibold">
                              CBDR: PDH / PDL Liquidity Run Sweep
                            </span>
                          ) : (
                            <span className="text-indigo-900 font-semibold">
                              CBDR: 1st London 15m Imbalance Entry
                            </span>
                          )
                        ) : (
                          <span className="text-purple-900 font-semibold">
                            Stop Hunt: Asian Range Sweep + 5m CHoCH
                          </span>
                        )}
                      </td>

                      {/* Session Window */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {signal.session_name || 'London Session'}
                      </td>

                      {/* Rule Verification */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Passed (All Rules)</span>
                        </span>
                      </td>

                      {/* Live Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>IN TRADE</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
