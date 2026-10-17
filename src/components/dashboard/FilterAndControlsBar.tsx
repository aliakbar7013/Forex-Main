'use client';

import React from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Plus,
  Search
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
    { key: 'ALL', label: 'All Signals', count: counts.all },
    { key: 'CBDR', label: 'CBDR (15m)', count: counts.cbdr },
    { key: 'STOP_HUNT', label: 'Stop Hunt (5m)', count: counts.stopHunt }
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-xs">
      
      {/* LEFT: Apple-Style Segmented Strategy Filter Bar */}
      <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {strategies.map(s => {
          const isSelected = selectedStrategy.toUpperCase() === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelectStrategy(s.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
              }`}
            >
              <span>{s.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                isSelected ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/60 text-slate-600'
              }`}>
                {s.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* RIGHT: Search, Action Filter & View Mode Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        
        {/* Search Input */}
        <div className="relative flex-1 sm:w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Direction Filter */}
        <select
          value={selectedDirection}
          onChange={(e) => onSelectDirection(e.target.value)}
          className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-xs"
        >
          <option value="ALL">All Actions</option>
          <option value="BUY">BUY Only ▲</option>
          <option value="SELL">SELL Only ▼</option>
        </select>

        {/* View Mode Toggle: Cards vs Table */}
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50">
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'cards' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
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
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Table View"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New Signal Button */}
        <button
          type="button"
          onClick={onOpenCreateSignal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Signal</span>
        </button>

      </div>

    </div>
  );
}

export const FilterAndControlsBar = React.memo(FilterAndControlsBarComponent);
