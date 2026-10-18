'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  BarChart2, 
  Target, 
  ShieldAlert, 
  Trophy, 
  XCircle, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Layers, 
  Maximize2,
  Minimize2,
  TrendingUp,
  Flame,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { BacktestTradeRecord } from '@/types';
import { getTradingViewSymbol } from '@/components/dashboard/TradingViewRealtimeChart';

interface BacktestTradeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: BacktestTradeRecord | null;
}

export function BacktestTradeChartModal({
  isOpen,
  onClose,
  trade
}: BacktestTradeChartModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState<string>('15');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewTab, setViewTab] = useState<'chart' | 'blueprint'>('chart');

  useEffect(() => {
    if (trade?.timeframe) {
      const clean = trade.timeframe.replace('m', '').trim();
      if (['1', '5', '15', '60', '240', 'D'].includes(clean)) {
        setCurrentTimeframe(clean);
      } else if (clean === '15') {
        setCurrentTimeframe('15');
      }
    }
  }, [trade]);

  const widgetContainerId = useMemo(
    () => `tv_backtest_inspect_${Math.random().toString(36).substring(7)}`,
    [trade?.id, currentTimeframe]
  );

  const handleCopy = (val: string | number, field: string) => {
    navigator.clipboard.writeText(val.toString());
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (!isOpen || !trade || viewTab !== 'chart') return;

    const container = document.getElementById(widgetContainerId);
    if (!container) return;

    container.innerHTML = '';

    const tvSymbol = getTradingViewSymbol(trade.symbol);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // Advanced widget config with Volume completely removed
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
  }, [isOpen, trade, widgetContainerId, currentTimeframe, viewTab]);

  if (!trade) return null;

  const isBuy = trade.action === 'BUY';
  const isWin = trade.outcome === 'WIN';
  const isLoss = trade.outcome === 'LOSS';
  const riskDist = Math.abs(trade.entry - trade.sl);
  const rewardDist = Math.abs(trade.tp1 - trade.entry);
  const calculatedRR = riskDist > 0 ? Number((rewardDist / riskDist).toFixed(2)) : 3.0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Backtest Trade Execution Analysis — ${trade.symbol} (${trade.action})`}
      subtitle={`Verified ${trade.strategy} setup on ${trade.trading_day}, ${trade.date_executed} • ${trade.session} Session`}
      maxWidth={isFullscreen ? 'full' : '5xl'}
      icon={<BarChart2 className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-4 text-xs text-slate-800">
        
        {/* 1. Header Toolbar & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
          
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setViewTab('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'chart'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>1. Live TradingView Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('blueprint')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'blueprint'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2. Visual Entry &amp; Position Blueprint</span>
            </button>
          </div>

          {/* Timeframe & Fullscreen buttons */}
          <div className="flex items-center gap-2">
            {viewTab === 'chart' && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
                {['1', '5', '15', '60', '240', 'D'].map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setCurrentTimeframe(tf)}
                    className={`px-2 py-1 rounded-lg transition-all ${
                      currentTimeframe === tf
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tf === 'D' ? '1D' : `${tf}m`}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* 2. Visual Position & Price Levels Visualizer (TradingView Long/Short Position Tool Style) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-black text-slate-900 text-base sm:text-lg">
                {trade.symbol}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-black font-mono text-white ${
                isBuy ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                {trade.action} {isBuy ? '▲ (LONG)' : '▼ (SHORT)'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono text-[10px] border border-slate-200">
                {trade.strategy} • {trade.timeframe}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>{trade.trading_day}, {trade.date_executed} • {trade.session}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono flex items-center gap-1 border shadow-xs ${
                isWin 
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300' 
                  : isLoss 
                  ? 'bg-rose-100 text-rose-950 border-rose-300' 
                  : 'bg-amber-100 text-amber-950 border-amber-300'
              }`}>
                {isWin && <Trophy className="w-3.5 h-3.5 text-emerald-700" />}
                {isLoss && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                <span>{trade.outcome} ({trade.riskRewardAchieved > 0 ? `+${trade.riskRewardAchieved}R` : `${trade.riskRewardAchieved}R`})</span>
              </span>
            </div>
          </div>

          {/* Point of Entry, Stop Loss, Take Profit & Exit Price Visual Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            
            {/* Point of Entry */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 shadow-xs space-y-1 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-blue-600" />
                  Point of Entry (E)
                </span>
                <button
                  onClick={() => handleCopy(trade.entry, 'entry')}
                  className="text-blue-500 hover:text-blue-800"
                  title="Copy Entry Price"
                >
                  {copiedField === 'entry' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-blue-600" />}
                </button>
              </div>
              <div className="font-mono font-black text-slate-900 text-sm sm:text-base">
                {trade.entry}
              </div>
              <span className="text-[10px] text-blue-700 font-bold block">
                1st London 15m FVG Entry
              </span>
            </div>

            {/* Stop Loss */}
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 shadow-xs space-y-1 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Stop Loss (SL)
                </span>
                <button
                  onClick={() => handleCopy(trade.sl, 'sl')}
                  className="text-rose-400 hover:text-rose-700"
                  title="Copy SL Price"
                >
                  {copiedField === 'sl' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-rose-600" />}
                </button>
              </div>
              <div className="font-mono font-black text-rose-800 text-sm sm:text-base">
                {trade.sl}
              </div>
              <span className="text-[10px] text-rose-700 font-medium block">
                Below/Above London Session Extreme
              </span>
            </div>

            {/* Take Profit 1 */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-1 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-emerald-600" />
                  Take Profit 1 (TP1)
                </span>
                <button
                  onClick={() => handleCopy(trade.tp1, 'tp1')}
                  className="text-emerald-500 hover:text-emerald-800"
                  title="Copy TP1 Price"
                >
                  {copiedField === 'tp1' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                </button>
              </div>
              <div className="font-mono font-black text-emerald-800 text-sm sm:text-base">
                {trade.tp1}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold block">
                Target: +{calculatedRR}R (1:3 Target)
              </span>
            </div>

            {/* Take Profit 2 / Runner */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 shadow-xs space-y-1 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-600" />
                  Take Profit 2 (TP2)
                </span>
                <button
                  onClick={() => handleCopy(trade.tp2 || trade.tp1, 'tp2')}
                  className="text-purple-400 hover:text-purple-700"
                  title="Copy TP2 Price"
                >
                  {copiedField === 'tp2' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-purple-600" />}
                </button>
              </div>
              <div className="font-mono font-black text-purple-800 text-sm sm:text-base">
                {trade.tp2 || '—'}
              </div>
              <span className="text-[10px] text-purple-700 font-medium block">
                Extended 1H/4H Runner (+5.0R)
              </span>
            </div>

            {/* Exact Exit Price */}
            <div className={`p-3 rounded-xl border shadow-xs space-y-1 relative group ${
              isWin ? 'bg-emerald-50/80 border-emerald-300' : isLoss ? 'bg-rose-50/80 border-rose-300' : 'bg-slate-50 border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isWin ? 'text-emerald-900' : isLoss ? 'text-rose-900' : 'text-slate-900'
                }`}>
                  <Zap className="w-3 h-3 text-amber-500" />
                  Exact Exit Price
                </span>
                <button
                  onClick={() => handleCopy(trade.exit_price || (isWin ? trade.tp1 : isLoss ? trade.sl : trade.entry), 'exit_price')}
                  className="text-slate-400 hover:text-slate-700"
                  title="Copy Exit Price"
                >
                  {copiedField === 'exit_price' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                </button>
              </div>
              <div className={`font-mono font-black text-sm sm:text-base ${
                isWin ? 'text-emerald-800' : isLoss ? 'text-rose-800' : 'text-slate-900'
              }`}>
                {trade.exit_price || (isWin ? trade.tp1 : isLoss ? trade.sl : trade.entry)}
              </div>
              <span className={`text-[10px] font-bold block ${
                isWin ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-600'
              }`}>
                {isWin ? 'Exited at TP1 (+3.0R Target)' : isLoss ? 'Exited at SL (Stop Protected)' : 'Exited at Break-Even'}
              </span>
            </div>

          </div>

          {/* Trade Notes & Institutional Confluences */}
          {trade.notes && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium">
              <strong className="text-slate-900">Institutional Confluences: </strong>
              <span>{trade.notes}</span>
            </div>
          )}
        </div>

        {/* 3. Main Display Body */}
        {viewTab === 'chart' ? (
          /* Live TradingView Candlestick Chart (No Volume Indicator) */
          <div className={`w-full rounded-2xl bg-white border border-slate-200 overflow-hidden relative shadow-sm ${
            isFullscreen ? 'h-[75vh]' : 'h-[520px]'
          }`}>
            <div 
              id={widgetContainerId}
              className="tradingview-widget-container w-full h-full"
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        ) : (
          /* Visual Position & Execution Blueprint Diagram */
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>TradingView Position Tool &amp; ICT Execution Blueprint</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Visual mapping of Point of Entry, Stop Loss, and Take Profit targets on {trade.symbol}.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-bold border border-emerald-300">
                1:{calculatedRR} Risk:Reward Ratio
              </span>
            </div>

            {/* Visual Long/Short Ladder Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              
              {/* Left 7 cols: TradingView Style Position Tool Box */}
              <div className="md:col-span-7 rounded-xl border border-slate-300 p-4 bg-slate-50 space-y-2 flex flex-col justify-between font-mono">
                
                {/* 1. Take Profit Zone (Green) */}
                <div className="p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-emerald-700" />
                      TAKE PROFIT TARGET (TP1)
                    </span>
                    <span className="text-emerald-900 font-black text-sm">{trade.tp1}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 flex justify-between">
                    <span>Reward Multiplier: <strong>+{calculatedRR}R</strong></span>
                    <span>Scale 50% &amp; Move SL to Breakeven</span>
                  </div>
                </div>

                {/* 2. Point of Entry Line (Blue/Slate) */}
                <div className="p-3 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>POINT OF ENTRY (1st 15m London FVG):</span>
                  </div>
                  <span className="text-sm font-black tracking-wider">{trade.entry}</span>
                </div>

                {/* 3. Stop Loss Zone (Red) */}
                <div className="p-3.5 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                      STOP LOSS (SL)
                    </span>
                    <span className="text-rose-900 font-black text-sm">{trade.sl}</span>
                  </div>
                  <div className="text-[11px] text-rose-800 flex justify-between">
                    <span>Risk Allocation: <strong>-1.0R ({trade.risk_percent}%)</strong></span>
                    <span>Placed Below/Above London Low/High</span>
                  </div>
                </div>

              </div>

              {/* Right 5 cols: Setup Verification Checklist */}
              <div className="md:col-span-5 rounded-xl border border-slate-200 p-4 bg-white space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  ICT Strategy Checklist
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">15-Minute Timeframe:</strong>
                      <span className="text-slate-500 text-[11px]">Strict 15m candle structure verified.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">London Session Execution:</strong>
                      <span className="text-slate-500 text-[11px]">Between 07:00 – 16:00 UTC (03:00 AM – 12:00 PM NY / 12:30 PM – 09:30 PM IST).</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">1st London Imbalance (FVG):</strong>
                      <span className="text-slate-500 text-[11px]">Entered strictly on 1st FVG (no 2nd/3rd).</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">1:3.0+ Minimum RR:</strong>
                      <span className="text-slate-500 text-[11px]">Satisfies the 1:3 to 1:4+ R:R target.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 4. Footer Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 font-medium gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>💡 <strong>Note:</strong> Volume indicator has been removed from charts for clear price-action and FVG imbalance focus.</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span>Broker Chart Feed: <strong className="text-blue-700">{getTradingViewSymbol(trade.symbol)}</strong> (OANDA)</span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
