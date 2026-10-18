'use client';

import React from 'react';
import { Signal, TradeAction } from '@/types';
import { FilterAndControlsBar } from '@/components/dashboard/FilterAndControlsBar';
import { SignalCard } from '@/components/dashboard/SignalCard';
import { SignalsTable } from '@/components/dashboard/SignalsTable';
import { 
  Sparkles, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Clock, 
  RotateCcw,
  Zap,
  ArrowRight
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
  displayedSignals,
  allSignals,
  isLoading,
  viewMode,
  setViewMode,
  selectedStrategy,
  setSelectedStrategy,
  selectedStatus,
  setSelectedStatus,
  selectedDirection,
  setSelectedDirection,
  searchQuery,
  setSearchQuery,
  strategyCounts,
  isRefreshingLive,
  isBackgroundSyncing,
  autoSync5s,
  setAutoSync5s,
  countdown,
  tradeToast,
  setTradeToast,
  handleRefreshLiveSignals,
  handleUpdateSignalStatus,
  handleDeleteSignal,
  handleViewPayload,
  handleOpenChart,
  setIsCreateOpen,
  setIsSimulatorOpen,
  setActiveTab,
  onSwitchToV1
}: V2DashboardProps) {
  return (
    <div className="space-y-6">
      {/* V2 Development Ribbon / Workspace Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-purple-500/20 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                Version 2.0 (Active Workspace)
              </span>
              <span className="text-[11px] text-slate-400">
                • V1 is permanently preserved & safe
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Next-Gen Quantitative Signals Engine
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              All upcoming modifications, strategy adjustments, and interface design experiments are isolated here in Version 2. Select Version 1 in the header at any time to view the exact original release.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToV1}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Switch to v1</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Signal (v2)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Minimal Filter and View Controls Bar */}
      <FilterAndControlsBar
        selectedStrategy={selectedStrategy}
        onSelectStrategy={setSelectedStrategy}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        selectedDirection={selectedDirection}
        onSelectDirection={setSelectedDirection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        counts={strategyCounts}
        onOpenCreateSignal={() => setIsCreateOpen(true)}
        onRefreshLiveSignals={handleRefreshLiveSignals}
        isRefreshingLive={isRefreshingLive}
        isBackgroundSyncing={isBackgroundSyncing}
        autoSync5s={autoSync5s}
        onToggleAutoSync={() => setAutoSync5s(p => !p)}
        countdown={countdown}
      />

      {/* Real-Time Trade Resolution Alert Toast / Banner */}
      {tradeToast && (
        <div className={`relative overflow-hidden p-4 rounded-2xl border bg-white shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          tradeToast.outcome === 'WIN'
            ? 'border-emerald-200'
            : 'border-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 border ${
              tradeToast.outcome === 'WIN' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {tradeToast.outcome === 'WIN' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase font-mono text-slate-900">
                  {tradeToast.symbol} Trade Resolved: {tradeToast.outcome}
                </span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  tradeToast.outcome === 'WIN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  ⏱️ 5s Auto-Dismiss
                </span>
              </div>
              <div className="text-sm font-semibold mt-0.5 text-slate-700">
                {tradeToast.message}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTradeToast(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Dismiss immediately"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Second Animated Progress Bar */}
          <div 
            className={`absolute bottom-0 left-0 h-1 ${
              tradeToast.outcome === 'WIN' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{
              width: '100%',
              animation: 'shrink 5s linear forwards'
            }}
          />
        </div>
      )}

      {/* Live Signal Feed Stream */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-3" />
          <p className="text-xs font-medium text-slate-600 tracking-wide">Connecting to Live Signals Feed (v2)...</p>
        </div>
      ) : displayedSignals.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          {selectedStrategy === 'CBDR' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No Running CBDR Trades
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 font-medium leading-relaxed">
                Under ICT CBDR institutional rules, new entries are strictly taken on <strong className="text-slate-800">Monday, Tuesday, and Wednesday</strong> (London Session 07:00 – 16:00 UTC / 03:00 – 12:00 NY). Previous trades that reached target or SL are archived in Backtest.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStrategy('STOP_HUNT')}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs transition-colors shadow-xs"
                >
                  View Live Stop Hunt Trades (Mon–Fri)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('backtest')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-xs"
                >
                  View CBDR Backtest Archive
                </button>
              </div>
            </>
          ) : selectedStrategy === 'NEW_YORK' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No Active New York Index Trades
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 font-medium leading-relaxed">
                The New York Open Index model operates on NAS100, US30, and SPX500 during the 09:30 AM – 12:00 PM NY session.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStrategy('STOP_HUNT')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  View Live Stop Hunt Trades
                </button>
              </div>
            </>
          ) : (
            <>
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 mb-1">No active signals found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 font-medium">
                There are no signals matching your filter. Check the Backtest Archive for historical verified trades.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  Launch Webhook Simulator
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('backtest')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition-colors"
                >
                  View Backtest Archive
                </button>
              </div>
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onUpdateStatus={handleUpdateSignalStatus}
              onDeleteSignal={handleDeleteSignal}
              onViewPayload={handleViewPayload}
              onOpenChart={handleOpenChart}
            />
          ))}
        </div>
      ) : (
        <SignalsTable
          signals={displayedSignals}
          onUpdateStatus={handleUpdateSignalStatus}
          onDeleteSignal={handleDeleteSignal}
          onViewPayload={handleViewPayload}
          onOpenChart={handleOpenChart}
        />
      )}
    </div>
  );
}
