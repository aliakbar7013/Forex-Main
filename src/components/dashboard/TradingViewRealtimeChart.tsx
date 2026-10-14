'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart2, 
  Maximize2, 
  Minimize2, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ShieldCheck, 
  Search,
  ExternalLink,
  ChevronDown,
  Code,
  Zap
} from 'lucide-react';
import { Signal, StrategyType, TradeAction } from '@/types';
import { PairFilterSelect } from './PairFilterSelect';
import { TradingViewSyncModal } from '@/components/modals/TradingViewSyncModal';

interface TradingViewRealtimeChartProps {
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  activeSignal?: Signal | null;
  defaultTimeframe?: string;
}

// Map pair symbol to TradingView exchange symbol — strictly using OANDA broker as requested
export function getTradingViewSymbol(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  if (s === 'XAUUSD' || s === 'GOLD') return 'OANDA:XAUUSD';
  if (s === 'XAGUSD' || s === 'SILVER') return 'OANDA:XAGUSD';
  if (s === 'NAS100' || s === 'US100' || s === 'USTEC' || s === 'NAS100USD') return 'OANDA:NAS100USD';
  if (s === 'SPX500' || s === 'US500' || s === 'SPX' || s === 'SPX500USD') return 'OANDA:SPX500USD';
  if (s === 'US30' || s === 'DJ30' || s === 'DJI' || s === 'US30USD') return 'OANDA:US30USD';
  
  // Standard Forex Pairs & Crosses (GBPNZD, EURUSD, GBPUSD, USDJPY, etc.) — Always OANDA
  return `OANDA:${s}`;
}

const TIMEFRAME_OPTIONS = [
  { id: '15', label: '15m (CBDR)', short: '15m', desc: 'CBDR Model Focus' },
  { id: '5', label: '5m (Stop Hunt)', short: '5m', desc: 'Stop Hunt Model' },
  { id: '1', label: '1m (NY Open)', short: '1m', desc: 'NY Index Open' },
  { id: '60', label: '1H', short: '1H', desc: 'Hourly Liquidity' },
  { id: '240', label: '4H', short: '4H', desc: '4-Hour Higher TF' },
  { id: 'D', label: 'Daily', short: '1D', desc: 'Daily Bias & PDH/PDL' }
];

const POPULAR_PAIRS = ['GBPNZD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPCHF', 'EURCHF', 'XAUUSD', 'NAS100'];

export function TradingViewRealtimeChartComponent({
  selectedSymbol = 'GBPNZD',
  onSelectSymbol,
  activeSignal,
  defaultTimeframe = '15'
}: TradingViewRealtimeChartProps) {
  const [currentSymbol, setCurrentSymbol] = useState(selectedSymbol);
  const [currentTimeframe, setCurrentTimeframe] = useState(defaultTimeframe);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetContainerId = useMemo(() => `tradingview_widget_${Math.random().toString(36).substring(7)}`, []);

  // Synchronize when prop changes
  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== currentSymbol) {
      setCurrentSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

  const handlePairChange = (sym: string) => {
    setCurrentSymbol(sym);
    if (onSelectSymbol) onSelectSymbol(sym);
  };

  // Embed official TradingView widget script
  useEffect(() => {
    const container = document.getElementById(widgetContainerId);
    if (!container) return;

    container.innerHTML = '';

    const tvSymbol = getTradingViewSymbol(currentSymbol);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    const widgetConfig = {
      autosize: true,
      symbol: tvSymbol,
      interval: currentTimeframe,
      timezone: 'America/New_York',
      theme: 'light',
      style: '1', // Candlesticks
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      hotlist: false,
      studies: [
        'STD;Fair_Value_Gap'
      ],
      disabled_features: [
        'volume_force_overlay',
        'create_volume_indicator_by_default'
      ],
      container_id: widgetContainerId,
      support_host: 'https://www.tradingview.com'
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [currentSymbol, currentTimeframe, widgetContainerId]);

  return (
    <div 
      ref={containerRef}
      className={`rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen 
          ? 'fixed inset-4 z-50 shadow-2xl border-slate-300' 
          : 'w-full h-[640px] sm:h-[720px]'
      }`}
    >
      
      {/* 1. Header Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        
        {/* Left: Symbol & Quick Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-tight">
                  {currentSymbol}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300 font-mono">
                  LIVE REALTIME
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-300 font-mono">
                  BROKER: OANDA
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Interactive TradingView Candlestick Feed • OANDA Broker Data • NY Timezone (UTC-4)
              </span>
            </div>
          </div>

          {/* Quick Popular Pairs Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {POPULAR_PAIRS.map(sym => (
              <button
                key={sym}
                type="button"
                onClick={() => handlePairChange(sym)}
                className={`px-2 py-1 rounded-lg transition-all font-mono text-[11px] ${
                  currentSymbol === sym
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Searchable Dropdown for All 32 Pairs */}
          <div className="shrink-0">
            <PairFilterSelect
              value={currentSymbol}
              onChange={handlePairChange}
            />
          </div>
        </div>

        {/* Right: Timeframe Switches & Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Timeframe Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {TIMEFRAME_OPTIONS.map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setCurrentTimeframe(tf.id)}
                title={tf.desc}
                className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
                  currentTimeframe === tf.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">{tf.label}</span>
                <span className="sm:hidden">{tf.short}</span>
              </button>
            ))}
          </div>

          {/* TradingView Live Sync & Pine Script Button */}
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
            title="Connect TradingView Pine Script v5 with Live Webhook Alerts"
          >
            <Code className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden sm:inline">TV Live Sync</span>
            <span className="sm:hidden">Sync</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* 2. Active Strategy Trade Overlay Bar (If signal matches or active) */}
      {activeSignal && activeSignal.symbol.toUpperCase() === currentSymbol.toUpperCase() && (
        <div className="px-4 py-2.5 bg-blue-50/80 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[10px]">
              {activeSignal.strategy}
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
              activeSignal.action === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {activeSignal.action}
            </span>
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
              <Clock className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Started: {new Date(activeSignal.created_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true })} NY ({new Date(activeSignal.created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            {Boolean(activeSignal.raw_payload?.currentPrice) && (
              <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-0.5 rounded shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-300 font-sans">Running:</span>
                <strong className="text-amber-300 font-bold">{Number(activeSignal.raw_payload?.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</strong>
                {activeSignal.raw_payload?.floatingPips !== undefined && (
                  <span className={`text-[10px] font-black ${
                    Number(activeSignal.raw_payload.floatingPips) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ({Number(activeSignal.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(activeSignal.raw_payload.floatingPips)}p)
                  </span>
                )}
              </div>
            )}
            <div>
              <span className="text-slate-500 font-medium">Entry: </span>
              <strong className="text-slate-900">{activeSignal.entry}</strong>
            </div>
            <div>
              <span className="text-rose-600 font-medium">SL: </span>
              <strong className="text-rose-700">{activeSignal.sl}</strong>
            </div>
            <div>
              <span className="text-emerald-600 font-medium">TP1 (1:3): </span>
              <strong className="text-emerald-700">{activeSignal.tp1}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. TradingView Embedded Advanced Widget Container */}
      <div className="flex-1 w-full h-full relative bg-slate-50">
        <div 
          id={widgetContainerId}
          className="tradingview-widget-container w-full h-full"
          style={{ height: '100%', width: '100%' }}
        />
      </div>

      {/* 4. Chart Footer Tips */}
      <div className="px-4 py-2 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 font-medium gap-1 shrink-0">
        <div className="flex items-center gap-2">
          <span>💡 <strong>ICT Pro Tip:</strong> For CBDR, verify 15m timeframe • Check 1st London FVG imbalance • Move SL to BE after TP1</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span>Broker Feed: <strong className="text-blue-700">{getTradingViewSymbol(currentSymbol)}</strong> (OANDA)</span>
        </div>
      </div>

      {/* TradingView Sync & Pine Script Modal */}
      <TradingViewSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

    </div>
  );
}

export const TradingViewRealtimeChart = React.memo(TradingViewRealtimeChartComponent);
