'use client';

import React from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Plus,
  Zap,
  Loader2
} from 'lucide-react';
import { PairFilterSelect } from '@/components/dashboard/PairFilterSelect';

interface FilterAndControlsBarProps {
  selectedStrategy: string;
  onSelectStrategy: (strat: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  selectedDirection: string;
  onSelectDirection: (dir: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  counts: {
    all: number;
    cbdr: number;
    stopHunt: number;
    newYork: number;
  };
  onOpenCreateSignal: () => void;
  onRefreshLiveSignals?: () => void;
  isRefreshingLive?: boolean;
  isBackgroundSyncing?: boolean;
  autoSync5s?: boolean;
  onToggleAutoSync?: () => void;
  countdown?: number;
}

export function FilterAndControlsBarComponent({
  selectedStrategy,
  onSelectStrategy,
  selectedStatus,
  onSelectStatus,
  selectedDirection,
  onSelectDirection,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  counts,
  onOpenCreateSignal,
  onRefreshLiveSignals,
  isRefreshingLive,
  isBackgroundSyncing,
  autoSync5s,
  onToggleAutoSync,
  countdown
}: FilterAndControlsBarProps) {
  const strategies = [
    { key: 'ALL', label: 'All Trades', count: counts.all },
    { key: 'CBDR', label: '⚡ CBDR 15m (London)', count: counts.cbdr },
    { key: 'STOP_HUNT', label: '🎯 Stop Hunt 5m (Asian Sweep)', count: counts.stopHunt },
    { key: 'NEW_YORK', label: '🗽 New York (Indices)', count: counts.newYork }
  ];

  const statuses = [
    { key: 'ALL', label: 'All Statuses' },
    { key: 'PENDING', label: 'Pending Entry' },
    { key: 'IN_TRADE', label: 'In Trade' },
    { key: 'TP1_HIT', label: 'TP1 Hit (BE)' },
    { key: 'CLOSED_PROFIT', label: 'Closed Profit' },
    { key: 'SL_HIT', label: 'SL Hit' },
    { key: 'CANCELLED', label: 'Cancelled' }
  ];

  return (
    <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Strategy Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {strategies.map(s => {
            const isSelected = selectedStrategy.toUpperCase() === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onSelectStrategy(s.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white border border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                  isSelected ? 'bg-slate-800 text-blue-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Tools: Search, Status Filter, View Toggle, Create Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Pair / Instrument Selector with Internal Search */}
          <div className="shrink-0">
            <PairFilterSelect
              value={searchQuery}
              onChange={onSearchChange}
              buttonLabelPrefix="Pair:"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer focus:bg-white"
          >
            {statuses.map(st => (
              <option key={st.key} value={st.key}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <select
            value={selectedDirection}
            onChange={(e) => onSelectDirection(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer focus:bg-white"
          >
            <option value="ALL">All Sides</option>
            <option value="BUY" className="text-emerald-700 font-bold">BUY (Long)</option>
            <option value="SELL" className="text-rose-700 font-bold">SELL (Short)</option>
          </select>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white text-blue-600 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Second Auto-Tick Pulse & Countdown (Rock-Solid Zero Layout Shift) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 select-none">
            <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
              <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                !autoSync5s ? 'bg-slate-400' : isBackgroundSyncing ? 'bg-cyan-500' : 'bg-emerald-500'
              }`} />
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="text-slate-600 font-medium">Live Tick:</span>
              <span className={`font-mono text-center w-12 px-1 py-0.5 rounded border text-[11px] font-bold tabular-nums transition-colors duration-200 ${
                isBackgroundSyncing
                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {autoSync5s ? (isBackgroundSyncing ? 'Sync' : `${countdown ?? 5}s`) : 'Off'}
              </span>
            </div>

            {onToggleAutoSync && (
              <button
                type="button"
                onClick={onToggleAutoSync}
                className={`w-14 text-center py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors shrink-0 ${
                  autoSync5s 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                title="Toggle automated 5s real-time price updates"
              >
                {autoSync5s ? 'Active' : 'Resume'}
              </button>
            )}
          </div>

          {/* Refresh Live Market Prices Button (Fixed Width) */}
          {onRefreshLiveSignals && (
            <button
              type="button"
              onClick={onRefreshLiveSignals}
              disabled={isRefreshingLive}
              className="flex items-center justify-center gap-1.5 w-28 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 shrink-0"
              title="Fetch fresh real-time market prices from Free API"
            >
              {isRefreshingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Zap className="w-3.5 h-3.5 shrink-0" />}
              <span className="tabular-nums">{isRefreshingLive ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {/* Add Signal Button (Fixed Width) */}
          <button
            type="button"
            onClick={onOpenCreateSignal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Signal</span>
          </button>

        </div>

      </div>
    </div>
  );
}

export const FilterAndControlsBar = React.memo(FilterAndControlsBarComponent);
