'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Globe } from 'lucide-react';

export interface TradableAssetOption {
  symbol: string;
  name: string;
  category: 'MAJOR' | 'YEN_CROSS' | 'POUND_EURO_CROSS' | 'COMMODITY_CROSS' | 'COMMODITY' | 'INDEX';
  categoryLabel: string;
  baseCode: string;
  quoteCode: string;
  bias: 'BUY_ONLY' | 'SELL_ONLY' | 'NEUTRAL' | 'EXEMPT';
}

export const ALL_TRADABLE_ASSETS: TradableAssetOption[] = [
  // 1. Majors
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'EUR', quoteCode: 'USD', bias: 'SELL_ONLY' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'GBP', quoteCode: 'USD', bias: 'BUY_ONLY' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'USD', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'USD', quoteCode: 'CHF', bias: 'BUY_ONLY' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'AUD', quoteCode: 'USD', bias: 'SELL_ONLY' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'USD', quoteCode: 'CAD', bias: 'BUY_ONLY' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'MAJOR', categoryLabel: 'Majors', baseCode: 'NZD', quoteCode: 'USD', bias: 'SELL_ONLY' },

  // 2. Pound & Euro Crosses (including GBPCHF, EURCHF, EURGBP, etc.)
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'GBP', quoteCode: 'CHF', bias: 'BUY_ONLY' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'EUR', quoteCode: 'CHF', bias: 'BUY_ONLY' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'EUR', quoteCode: 'GBP', bias: 'SELL_ONLY' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'EUR', quoteCode: 'AUD', bias: 'SELL_ONLY' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'EUR', quoteCode: 'CAD', bias: 'SELL_ONLY' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'EUR', quoteCode: 'NZD', bias: 'SELL_ONLY' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'GBP', quoteCode: 'AUD', bias: 'BUY_ONLY' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'GBP', quoteCode: 'CAD', bias: 'BUY_ONLY' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar', category: 'POUND_EURO_CROSS', categoryLabel: 'Pound & Euro Crosses', baseCode: 'GBP', quoteCode: 'NZD', bias: 'BUY_ONLY' },

  // 3. Yen Crosses
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'GBP', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'EUR', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'AUD', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'CAD', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'CHF', quoteCode: 'JPY', bias: 'BUY_ONLY' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', category: 'YEN_CROSS', categoryLabel: 'Yen Crosses', baseCode: 'NZD', quoteCode: 'JPY', bias: 'BUY_ONLY' },

  // 4. Commodity Crosses
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'AUD', quoteCode: 'CAD', bias: 'BUY_ONLY' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'AUD', quoteCode: 'CHF', bias: 'BUY_ONLY' },
  { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'AUD', quoteCode: 'NZD', bias: 'SELL_ONLY' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'CAD', quoteCode: 'CHF', bias: 'BUY_ONLY' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'NZD', quoteCode: 'CAD', bias: 'BUY_ONLY' },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc', category: 'COMMODITY_CROSS', categoryLabel: 'Commodity Crosses', baseCode: 'NZD', quoteCode: 'CHF', bias: 'BUY_ONLY' },

  // 5. Commodities & Indices
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', category: 'COMMODITY', categoryLabel: 'Commodities', baseCode: 'XAU', quoteCode: 'USD', bias: 'SELL_ONLY' },
  { symbol: 'NAS100', name: 'Nasdaq 100 Index', category: 'INDEX', categoryLabel: 'Indices', baseCode: 'NAS', quoteCode: '100', bias: 'EXEMPT' },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'INDEX', categoryLabel: 'Indices', baseCode: 'SPX', quoteCode: '500', bias: 'EXEMPT' },
  { symbol: 'US30', name: 'Dow Jones 30 Index', category: 'INDEX', categoryLabel: 'Indices', baseCode: 'US', quoteCode: '30', bias: 'EXEMPT' }
];

interface PairFilterSelectProps {
  value: string; // 'ALL' or symbol like 'GBPCHF'
  onChange: (symbol: string) => void;
  className?: string;
  buttonLabelPrefix?: string;
}

export function PairFilterSelect({
  value,
  onChange,
  className = '',
  buttonLabelPrefix = 'Pair:'
}: PairFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedAsset = useMemo(() => {
    if (value === 'ALL' || !value) return null;
    return ALL_TRADABLE_ASSETS.find(a => a.symbol.toUpperCase() === value.toUpperCase());
  }, [value]);

  // Filtered list
  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return ALL_TRADABLE_ASSETS;
    const q = searchTerm.trim().toUpperCase();
    return ALL_TRADABLE_ASSETS.filter(a => 
      a.symbol.toUpperCase().includes(q) || 
      a.name.toUpperCase().includes(q) ||
      a.categoryLabel.toUpperCase().includes(q)
    );
  }, [searchTerm]);

  // Grouped by Category
  const groupedAssets = useMemo(() => {
    const groups: Record<string, TradableAssetOption[]> = {};
    for (const asset of filteredAssets) {
      if (!groups[asset.categoryLabel]) {
        groups[asset.categoryLabel] = [];
      }
      groups[asset.categoryLabel].push(asset);
    }
    return groups;
  }, [filteredAssets]);

  const handleSelect = (symbol: string) => {
    onChange(symbol);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs min-w-[140px] max-w-[220px]"
        title="Select currency pair, cross, or index"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-slate-500 font-medium text-[11px] shrink-0">{buttonLabelPrefix}</span>
          {selectedAsset ? (
            <div className="flex items-center gap-1 truncate">
              <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] font-black shrink-0">
                {selectedAsset.symbol}
              </span>
            </div>
          ) : (
            <span className="font-bold text-slate-900 truncate">All Pairs (31 Assets)</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover: right-0 ensures it opens inwards and never overflows right edge */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          
          {/* Header & Small Search Input */}
          <div className="p-2.5 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search pair (e.g. GBPCHF, EURCHF, NAS100)..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Asset List Scrollable Container */}
          <div className="max-h-80 overflow-y-auto p-1.5 divide-y divide-slate-100">
            
            {/* Quick Option: All Pairs */}
            <div className="pb-1">
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  value === 'ALL' || !value
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>All Pairs &amp; Crosses (All 31 Tradable Assets)</span>
                </div>
                {(value === 'ALL' || !value) && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            </div>

            {/* Categorized Options */}
            {Object.keys(groupedAssets).length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No matching currency pairs found for &quot;{searchTerm}&quot;
              </div>
            ) : (
              Object.entries(groupedAssets).map(([category, items]) => (
                <div key={category} className="pt-2 pb-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>{category}</span>
                    <span className="font-mono text-[9px] text-slate-700 font-bold">{items.length} Pairs</span>
                  </div>
                  
                  <div className="space-y-0.5 mt-0.5">
                    {items.map(asset => {
                      const isSelected = value?.toUpperCase() === asset.symbol.toUpperCase();
                      return (
                        <button
                          key={asset.symbol}
                          type="button"
                          onClick={() => handleSelect(asset.symbol)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                              : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-bold border border-slate-200 shrink-0">
                              {asset.baseCode}/{asset.quoteCode}
                            </span>
                            <div className="flex flex-col text-left truncate">
                              <span className="font-mono font-bold text-slate-900 leading-tight">
                                {asset.symbol}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate">
                                {asset.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {/* Direction Bias Badge */}
                            {asset.bias === 'BUY_ONLY' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono text-[9px] font-black border border-emerald-300">
                                BUY ▲
                              </span>
                            ) : asset.bias === 'SELL_ONLY' ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-950 font-mono text-[9px] font-black border border-rose-300">
                                SELL ▼
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[9px] font-bold border border-slate-200">
                                EXEMPT
                              </span>
                            )}

                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between">
            <span>⚡ IPDA Central Bank Direction Filter</span>
            <span className="font-bold text-blue-700">31 Tradable Instruments</span>
          </div>

        </div>
      )}

    </div>
  );
}
