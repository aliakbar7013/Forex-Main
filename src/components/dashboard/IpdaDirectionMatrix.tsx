'use client';

import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Settings2, 
  RefreshCw, 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { IPDAPairBias, PairCategory, IPDAOverrideMode } from '@/types';

interface IpdaDirectionMatrixProps {
  matrix: IPDAPairBias[];
  isLoading?: boolean;
  onOpenRatesModal: () => void;
  onSetOverride: (symbol: string, mode: IPDAOverrideMode) => Promise<void>;
  onSyncRates: () => Promise<void>;
}

export function IpdaDirectionMatrixComponent({
  matrix,
  isLoading = false,
  onOpenRatesModal,
  onSetOverride,
  onSyncRates
}: IpdaDirectionMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingSymbol, setUpdatingSymbol] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const categories = [
    { key: 'ALL', label: 'All Pairs (28)' },
    { key: 'COMMODITY', label: '🥇 Gold' },
    { key: 'MAJOR', label: 'Majors' },
    { key: 'YEN_CROSS', label: 'Yen Crosses' },
    { key: 'POUND_EURO_CROSS', label: 'Pound & Euro' },
    { key: 'COMMODITY_CROSS', label: 'Commodity Crosses' },
  ];

  const handleOverrideChange = async (symbol: string, mode: IPDAOverrideMode) => {
    setUpdatingSymbol(symbol);
    try {
      await onSetOverride(symbol, mode);
    } finally {
      setUpdatingSymbol(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncRates();
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter pairs
  const filteredPairs = useMemo(() => {
    return matrix.filter(pair => {
      // Category filter
      if (selectedCategory !== 'ALL' && pair.category !== selectedCategory) {
        return false;
      }
      // Direction filter
      if (selectedDirection !== 'ALL' && pair.effectiveDirection !== selectedDirection) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        const matchSymbol = pair.symbol.toUpperCase().includes(q);
        const matchName = pair.name.toUpperCase().includes(q);
        const matchBase = pair.baseCurrency.toUpperCase().includes(q);
        const matchQuote = pair.quoteCurrency.toUpperCase().includes(q);
        if (!matchSymbol && !matchName && !matchBase && !matchQuote) return false;
      }
      return true;
    });
  }, [matrix, selectedCategory, selectedDirection, searchQuery]);

  const buyCount = matrix.filter(p => p.effectiveDirection === 'BUY_ONLY').length;
  const sellCount = matrix.filter(p => p.effectiveDirection === 'SELL_ONLY').length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white font-black shadow-md">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                IPDA Central Bank Bias &amp; Direction Filter Engine
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300 font-mono">
                Ratio Formula: Base Rate / Quote Rate
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Evaluates Central Bank yield differentials to enforce strict <strong className="text-emerald-700">BUY ONLY</strong> vs <strong className="text-rose-700">SELL ONLY</strong> trade filters.
            </p>
          </div>
        </div>

        {/* Action Buttons: Sync Rates & Edit Central Bank Rates */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all disabled:opacity-50"
            title="Sync latest policy rates from global-rates.com"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-600' : 'text-slate-600'}`} />
            <span>{isSyncing ? 'Syncing Rates...' : 'Sync Global-Rates'}</span>
          </button>

          <button
            onClick={onOpenRatesModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all hover:scale-[1.02]"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Central Bank Rates</span>
          </button>
        </div>

      </div>

      {/* 2. Strategy Math Ribbon / Explanation */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ArrowUpRight className="w-4 h-4" />
          </span>
          <div>
            <span className="font-black text-emerald-800">Ratio &gt; 1.0 (BUY ONLY ▲)</span>
            <span className="block text-[10px] text-slate-600 font-medium">Base Central Bank yield exceeds Quote Bank yield.</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-rose-100 text-rose-800 border border-rose-300">
            <ArrowDownRight className="w-4 h-4" />
          </span>
          <div>
            <span className="font-black text-rose-800">Ratio &lt; 1.0 (SELL ONLY ▼)</span>
            <span className="block text-[10px] text-slate-600 font-medium">Quote Central Bank yield exceeds Base Bank yield.</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
            <HelpCircle className="w-4 h-4" />
          </span>
          <div>
            <span className="font-black text-amber-800">Gold (XAUUSD) Proxy Rule</span>
            <span className="block text-[10px] text-slate-600 font-medium">Gold yield mapped strictly to Swiss Franc (SNB / Fed).</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right Filter Controls: Direction & Search */}
        <div className="flex items-center gap-2">
          
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-bold">
            <button
              onClick={() => setSelectedDirection('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedDirection === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({matrix.length})
            </button>
            <button
              onClick={() => setSelectedDirection('BUY_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                selectedDirection === 'BUY_ONLY' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-black' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>BUY ({buyCount})</span>
            </button>
            <button
              onClick={() => setSelectedDirection('SELL_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                selectedDirection === 'SELL_ONLY' ? 'bg-rose-100 text-rose-900 border border-rose-300 font-black' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              <span>SELL ({sellCount})</span>
            </button>
          </div>

          {/* Search Pair */}
          <div className="relative min-w-[130px] sm:min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pair..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600"
            />
          </div>

        </div>

      </div>

      {/* 4. IPDA Pairs Data Grid / Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10">
            <tr>
              <th className="py-3 px-3.5">Pair Name</th>
              <th className="py-3 px-3.5 font-mono">Base Rate vs Quote Rate</th>
              <th className="py-3 px-3.5 font-mono">Calculated Ratio</th>
              <th className="py-3 px-3.5">Permitted Direction</th>
              <th className="py-3 px-3.5">Override Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-900 bg-white font-mono">
            {filteredPairs.map((pair) => {
              const isBuy = pair.effectiveDirection === 'BUY_ONLY';
              const isSell = pair.effectiveDirection === 'SELL_ONLY';
              const isDisabled = pair.effectiveDirection === 'DISABLED';
              const isNeutral = pair.effectiveDirection === 'NEUTRAL';
              const isOverridden = pair.override !== 'AUTO';

              return (
                <tr 
                  key={pair.symbol} 
                  className={`hover:bg-slate-50 transition-colors ${
                    isOverridden ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  
                  {/* Pair Name & Flags */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-mono tracking-tighter">
                        {pair.flagBase}{pair.flagQuote}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {pair.symbol}
                          </span>
                          {pair.isCommodityProxy && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-black">
                              CHF Proxy
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-sans block font-medium">
                          {pair.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Base vs Quote Rates */}
                  <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">
                        {pair.baseRate.toFixed(2)}%
                      </span>
                      <span className="text-slate-400">/</span>
                      <span className="font-bold text-slate-700">
                        {pair.quoteRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans truncate max-w-[200px]" title={`${pair.baseCentralBank} vs ${pair.quoteCentralBank}`}>
                      {pair.baseCentralBank.split(' (')[0]} / {pair.quoteCentralBank.split(' (')[0]}
                    </div>
                  </td>

                  {/* Calculated Ratio */}
                  <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-cyan-700">
                        {pair.ratio.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {pair.ratio > 1.0 ? '(> 1.0)' : '(< 1.0)'}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 block truncate max-w-[220px]" title={pair.ratioFormula}>
                      {pair.ratioFormula}
                    </span>
                  </td>

                  {/* Permitted Direction Badge */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {isBuy && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-xs shadow-xs">
                        <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                        <span>BUY ONLY ▲</span>
                      </div>
                    )}
                    {isSell && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-950 font-black text-xs shadow-xs">
                        <ArrowDownRight className="w-4 h-4 text-rose-700" />
                        <span>SELL ONLY ▼</span>
                      </div>
                    )}
                    {isNeutral && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs">
                        <span>NEUTRAL (1.0)</span>
                      </div>
                    )}
                    {isDisabled && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-400 font-bold text-xs">
                        <span>DISABLED</span>
                      </div>
                    )}
                  </td>

                  {/* Manual Override Dropdown */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <select
                      value={pair.override}
                      disabled={updatingSymbol === pair.symbol}
                      onChange={(e) => handleOverrideChange(pair.symbol, e.target.value as IPDAOverrideMode)}
                      className={`bg-white border rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-xs ${
                        isOverridden 
                          ? 'border-indigo-400 text-indigo-900 bg-indigo-50' 
                          : 'border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="AUTO">AUTO (Calculated)</option>
                      <option value="FORCE_BUY">FORCE BUY ONLY</option>
                      <option value="FORCE_SELL">FORCE SELL ONLY</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export const IpdaDirectionMatrix = React.memo(IpdaDirectionMatrixComponent);
