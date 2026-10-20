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
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [placement, setPlacement] = useState<'left' | 'right'>('left');
  const [verticalPlacement, setVerticalPlacement] = useState<'bottom' | 'top'>('bottom');

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

  // Compute smart viewport positioning so dropdown NEVER clips on the left or bottom edge
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Dropdown width is max 380px.
      // If there's plenty of space to the right (>= 380px), align left-0.
      // If the button is close to the right edge (spaceRight < 380px), align right-0.
      const spaceRight = viewportWidth - rect.left;
      const spaceLeft = rect.right;
      if (spaceRight < 380 && spaceLeft >= 380) {
        setPlacement('right');
      } else {
        setPlacement('left');
      }

      // Check vertical space (dropdown height is ~340px)
      const spaceBelow = viewportHeight - rect.bottom;
      if (spaceBelow < 340 && rect.top > 340) {
        setVerticalPlacement('top');
      } else {
        setVerticalPlacement('bottom');
      }

      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedAsset = useMemo(() => {
    if (value === 'ALL' || !value) return null;
    return ALL_TRADABLE_ASSETS.find(a => a.symbol.toUpperCase() === value.toUpperCase());
  }, [value]);

  // Filtered list by search and quick category
  const filteredAssets = useMemo(() => {
    let list = ALL_TRADABLE_ASSETS;
    if (categoryFilter !== 'ALL') {
      list = list.filter(a => a.categoryLabel === categoryFilter);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toUpperCase();
    return list.filter(a => 
      a.symbol.toUpperCase().includes(q) || 
      a.name.toUpperCase().includes(q) ||
      a.categoryLabel.toUpperCase().includes(q)
    );
  }, [searchTerm, categoryFilter]);

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
      
      {/* Trigger Button with High Contrast & Clear Font */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-xs min-w-[160px] max-w-[260px] cursor-pointer ${
          isOpen
            ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
            : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
        }`}
        title="Select currency pair, cross, or index"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-slate-500 font-medium text-[11px] shrink-0">{buttonLabelPrefix}</span>
          {selectedAsset ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 font-mono text-[11px] font-black shrink-0">
                {selectedAsset.symbol}
              </span>
              <span className="text-[11px] text-slate-600 truncate hidden sm:inline font-medium">
                {selectedAsset.name.split('/')[0].trim()}
              </span>
            </div>
          ) : (
            <span className="font-extrabold text-slate-900 truncate">All Pairs (31 Assets)</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Dropdown Popover: Intelligent placement (left-0 or right-0) prevents clipping */}
      {isOpen && (
        <div 
          className={`absolute ${placement === 'right' ? 'right-0' : 'left-0'} ${
            verticalPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-[min(380px,calc(100vw-2rem))] bg-white border border-slate-300 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ring-1 ring-black/5`}
        >
          
          {/* Header & Sticky Search Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbol (e.g. GBPJPY, EURCHF)..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[10px]">
              {['ALL', 'Majors', 'Yen Crosses', 'Pound & Euro Crosses', 'Commodity Crosses'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All (31)' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Asset List Scrollable Container with Comfortable Max Height */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto p-2 divide-y divide-slate-100">
            
            {/* Quick Option: All Pairs */}
            <div className="pb-1.5">
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  value === 'ALL' || !value
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-300 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold">All Tradable Assets (31 Pairs &amp; Indices)</span>
                </div>
                {(value === 'ALL' || !value) && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            </div>

            {/* Categorized Options */}
            {Object.keys(groupedAssets).length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 font-medium">
                No matching currency pairs found for &quot;{searchTerm}&quot;
              </div>
            ) : (
              Object.entries(groupedAssets).map(([category, items]) => (
                <div key={category} className="pt-2 pb-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-50 rounded-md mb-1 flex items-center justify-between">
                    <span>{category}</span>
                    <span className="font-mono text-[9px] text-slate-600 font-bold">{items.length} Pairs</span>
                  </div>
                  
                  <div className="space-y-0.5">
                    {items.map(asset => {
                      const isSelected = value?.toUpperCase() === asset.symbol.toUpperCase();
                      return (
                        <button
                          key={asset.symbol}
                          type="button"
                          onClick={() => handleSelect(asset.symbol)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-300 shadow-xs'
                              : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-bold border border-slate-200 shrink-0">
                              {asset.baseCode}/{asset.quoteCode}
                            </span>
                            <div className="flex flex-col text-left min-w-0">
                              <span className="font-mono font-extrabold text-slate-900 text-xs leading-tight">
                                {asset.symbol}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate">
                                {asset.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {/* Direction Bias Badge */}
                            {asset.bias === 'BUY_ONLY' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono text-[9px] font-black border border-emerald-300">
                                BUY ▲
                              </span>
                            ) : asset.bias === 'SELL_ONLY' ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-950 font-mono text-[9px] font-black border border-rose-300">
                                SELL ▼
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[9px] font-bold border border-slate-200">
                                EXEMPT
                              </span>
                            )}

                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
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
          <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-600 flex items-center justify-between font-medium">
            <span>⚡ IPDA Central Bank Bias</span>
            <span className="font-bold text-blue-700">31 Tradable Instruments</span>
          </div>

        </div>
      )}

    </div>
  );
}
