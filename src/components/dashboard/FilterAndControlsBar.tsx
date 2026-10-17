'use client';

import React from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Plus,
  Zap,
  Search,
  Filter
} from 'lucide-react';

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
  onOpenCreateSignal
}: FilterAndControlsBarProps) {
  const strategies = [
    { key: 'ALL', label: 'All Trades', count: counts.all },
    { key: 'CBDR', label: '⚡ CBDR (15m)', count: counts.cbdr },
    { key: 'STOP_HUNT', label: '🎯 Stop Hunt (5m)', count: counts.stopHunt }
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d121f]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 shadow-xl">
      
      {/* LEFT: Segmented Strategy Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {strategies.map(s => {
          const isSelected = selectedStrategy.toUpperCase() === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelectStrategy(s.key)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                  : 'bg-[#141a2c] text-slate-300 hover:text-white hover:bg-[#1b233a] border border-white/[0.06]'
              }`}
            >
              <span>{s.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-white/[0.08] text-slate-300'
              }`}>
                {s.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* RIGHT: Search, Direction / Status Filter & View Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        
        {/* Search Input */}
        <div className="relative flex-1 sm:w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#121828] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Direction Filter */}
        <select
          value={selectedDirection}
          onChange={(e) => onSelectDirection(e.target.value)}
          className="bg-[#121828] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
        >
          <option value="ALL">All Actions</option>
          <option value="BUY">BUY Only ▲</option>
          <option value="SELL">SELL Only ▼</option>
        </select>

        {/* View Mode Toggle: Cards vs Table */}
        <div className="flex items-center bg-[#121828] border border-white/[0.08] rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'cards' 
                ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
            title="Card View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table' 
                ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
            title="Compact Table View"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New Signal Button */}
        <button
          type="button"
          onClick={onOpenCreateSignal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Signal</span>
        </button>

      </div>

    </div>
  );
}

export const FilterAndControlsBar = React.memo(FilterAndControlsBarComponent);
