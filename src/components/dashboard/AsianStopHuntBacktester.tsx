'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Clock, 
  Target, 
  Sliders, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  TrendingUp,
  Filter
} from 'lucide-react';
import { AsianStopHuntBacktestConfig, AsianStopHuntTradeResult } from '@/types';
import { getPairDecimals } from '@/lib/pairMath';

const ALL_FOREX_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD',
  'GBPJPY', 'EURJPY', 'GBPNZD', 'EURGBP', 'EURCAD', 'GBPAUD', 'GBPCHF', 'EURCHF',
  'AUDJPY', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'GBPCAD', 'AUDCAD', 'AUDCHF',
  'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF', 'NZDJPY'
];

export function AsianStopHuntBacktester() {
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<AsianStopHuntTradeResult[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [copiedSheets, setCopiedSheets] = useState(false);

  // Customizable Parameters
  const [asianStartHour, setAsianStartHour] = useState<number>(20); // 20:00 NY (8 PM)
  const [asianEndHour, setAsianEndHour] = useState<number>(0);      // 00:00 NY (midnight)
  const [minRr, setMinRr] = useState<number>(3.0);                 // Min 1:3.0 RR
  const [slBufferPips, setSlBufferPips] = useState<number>(3.0);   // 3 pips buffer
  const [pairSelectionPreset, setPairSelectionPreset] = useState<'ALL' | 'MAJORS' | 'YEN_CROSSES'>('ALL');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(ALL_FOREX_PAIRS);

  // Table Filters
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handlePresetChange = (preset: 'ALL' | 'MAJORS' | 'YEN_CROSSES') => {
    setPairSelectionPreset(preset);
    if (preset === 'ALL') {
      setSelectedPairs(ALL_FOREX_PAIRS);
    } else if (preset === 'MAJORS') {
      setSelectedPairs(['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD']);
    } else if (preset === 'YEN_CROSSES') {
      setSelectedPairs(['GBPJPY', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'USDJPY']);
    }
  };

  const runBacktest = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        action: 'backtest',
        min_rr: String(minRr),
        asian_start: String(asianStartHour),
        asian_end: String(asianEndHour),
        sl_buffer: String(slBufferPips),
        pairs: selectedPairs.join(',')
      });

      const res = await fetch(`/api/stop-hunt?${params.toString()}`);
      const data = await res.json();
      if (data.trades) {
        setTrades(data.trades);
      }
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to run Asian Stop Hunt backtest', err);
    } finally {
      setIsLoading(false);
    }
  }, [asianStartHour, asianEndHour, minRr, slBufferPips, selectedPairs]);

  useEffect(() => {
    runBacktest();
  }, [runBacktest]);

  // Handle CSV Download
  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      action: 'backtest',
      format: 'csv',
      min_rr: String(minRr),
      asian_start: String(asianStartHour),
      asian_end: String(asianEndHour),
      sl_buffer: String(slBufferPips),
      pairs: selectedPairs.join(',')
    });
    window.open(`/api/stop-hunt?${params.toString()}`, '_blank');
  };

  // Handle Google Sheets Copy
  const handleCopyGoogleSheets = async () => {
    try {
      const params = new URLSearchParams({
        action: 'backtest',
        format: 'sheets',
        min_rr: String(minRr),
        asian_start: String(asianStartHour),
        asian_end: String(asianEndHour),
        sl_buffer: String(slBufferPips),
        pairs: selectedPairs.join(',')
      });
      const res = await fetch(`/api/stop-hunt?${params.toString()}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSheets(true);
      setTimeout(() => setCopiedSheets(false), 2500);
    } catch (err) {
      console.error('Failed to copy Google Sheets format', err);
    }
  };

  // Filtered trades for table display
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (pairFilter !== 'ALL' && t.pair !== pairFilter) return false;
      if (outcomeFilter !== 'ALL' && t.outcome !== outcomeFilter) return false;
      if (dayFilter !== 'ALL' && t.tradingDay.toLowerCase() !== dayFilter.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.pair.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          t.tradingDay.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trades, pairFilter, outcomeFilter, dayFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Asian Kill Zone Stop Hunt (STUFF) Backtest Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold font-mono">
                Smart Money Concepts (M5)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
              Automated institutional quantitative backtester strictly enforcing Asian Killzone range marking (20:00–00:00 NY), 
              IPDA Directional Bias filter (Interest Rate Ratio), post-Asian liquidity sweeps, 5m Change of Character (CHoCH), 
              and Balanced Price Range (BPR) Limit Orders with minimum 1:3 up to 1:6+ RR.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyGoogleSheets}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all shadow-xs"
              title="Copy Google Sheets compatible Tab-Separated format to clipboard"
            >
              {copiedSheets ? <Check className="w-4 h-4 text-emerald-700" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-700" />}
              <span>{copiedSheets ? 'Copied with Formulas!' : 'Export Google Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              title="Download CSV spreadsheet"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customizable Parameters Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Configurable Strategy Parameters
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-500 text-[11px]">Pair Preset:</span>
            <button
              type="button"
              onClick={() => handlePresetChange('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                pairSelectionPreset === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All 28 Pairs + Gold
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('MAJORS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                pairSelectionPreset === 'MAJORS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              8 Majors Only
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('YEN_CROSSES')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                pairSelectionPreset === 'YEN_CROSSES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Yen Crosses
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          
          {/* Param 1: Asian Kill Zone Start */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Asian Killzone Window (NY Time):
            </label>
            <select
              value={`${asianStartHour}-${asianEndHour}`}
              onChange={(e) => {
                const [s, end] = e.target.value.split('-').map(Number);
                setAsianStartHour(s);
                setAsianEndHour(end);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="20-0">20:00 – 00:00 NY (Standard 4h Asian KZ)</option>
              <option value="21-1">21:00 – 01:00 NY (Late Asian Session)</option>
              <option value="19-0">19:00 – 00:00 NY (Early Tokyo Session)</option>
            </select>
            <span className="text-[10px] text-slate-500 block">
              High &amp; Low recorded; 0 entries allowed inside.
            </span>
          </div>

          {/* Param 2: Minimum Risk-Reward Ratio */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Target Minimum Risk:Reward:
            </label>
            <select
              value={minRr}
              onChange={(e) => setMinRr(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="3.0">1:3.0 RR (Standard Institutional)</option>
              <option value="3.5">1:3.5 RR</option>
              <option value="4.0">1:4.0 RR (Extended Swing)</option>
              <option value="5.0">1:5.0 RR (Deep Liquidity Target)</option>
              <option value="6.0">1:6.0 RR (Maximum SMC Asymmetry)</option>
            </select>
            <span className="text-[10px] text-slate-500 block">
              Targets opposing Asian KZ or 1H swing pool.
            </span>
          </div>

          {/* Param 3: Stop Loss Buffer */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              SL Sweep Buffer (Pips):
            </label>
            <select
              value={slBufferPips}
              onChange={(e) => setSlBufferPips(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="2.0">2.0 Pips Buffer</option>
              <option value="3.0">3.0 Pips Buffer (Recommended)</option>
              <option value="4.0">4.0 Pips Buffer</option>
              <option value="5.0">5.0 Pips Buffer</option>
            </select>
            <span className="text-[10px] text-slate-500 block">
              Placed beyond sweep high/low to avoid wicks.
            </span>
          </div>

          {/* Param 4: Re-Run Backtest Button */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={runBacktest}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Running Engine...' : 'Run Automated Backtest'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Performance Summary Metrics Ribbon */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Trades</span>
            <span className="text-xl font-black text-slate-900 font-mono mt-1">{metrics.totalTrades}</span>
            <span className="text-[10px] text-slate-500 font-medium">({metrics.wins}W • {metrics.losses}L)</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Win Rate</span>
            <span className="text-xl font-black text-emerald-900 font-mono mt-1">{metrics.winRate}%</span>
            <span className="text-[10px] text-emerald-800 font-semibold font-mono">1:3.0+ RR</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Net Realized PnL</span>
            <span className="text-xl font-black text-blue-900 font-mono mt-1">+${metrics.totalPnl.toLocaleString()}</span>
            <span className="text-[10px] text-blue-800 font-medium">$1,000 Risk/Trade</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Profit Factor</span>
            <span className="text-xl font-black text-purple-900 font-mono mt-1">{metrics.profitFactor}</span>
            <span className="text-[10px] text-purple-800 font-medium">Gross: +${metrics.grossProfit.toLocaleString()}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Average R:R</span>
            <span className="text-xl font-black text-amber-900 font-mono mt-1">1:{metrics.avgRr}</span>
            <span className="text-[10px] text-amber-800 font-medium">Asymmetric SMC Target</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Drawdown</span>
            <span className="text-xl font-black text-slate-900 font-mono mt-1">{metrics.maxDrawdownPercent}%</span>
            <span className="text-[10px] text-emerald-600 font-bold font-mono">Ultra Low Risk</span>
          </div>

        </div>
      )}

      {/* Day of Week Breakdown Table */}
      {metrics?.dayBreakdown && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Monday to Friday Performance Breakdown (Stop Hunt Model)
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const d = metrics.dayBreakdown[day] || { trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0 };
              return (
                <div key={day} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="font-bold text-slate-700 text-xs">{day}</span>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="text-slate-500">{d.trades} trades</span>
                    <span className="font-bold text-emerald-700">{d.winRate}% W</span>
                  </div>
                  <span className="text-xs font-black text-blue-900 font-mono mt-0.5">
                    {d.pnl >= 0 ? `+$${d.pnl.toLocaleString()}` : `-$${Math.abs(d.pnl).toLocaleString()}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pair, date, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 w-48 sm:w-56"
            />
          </div>

          {/* Pair Filter */}
          <select
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700"
          >
            <option value="ALL">All Pairs</option>
            {ALL_FOREX_PAIRS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">WIN (+3.0R+)</option>
            <option value="LOSS">LOSS (-1.0R)</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>

          {/* Day Filter */}
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700"
          >
            <option value="ALL">All Days (Mon–Fri)</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
          </select>
        </div>

        <span className="text-[11px] text-slate-500 font-medium font-mono">
          Showing {filteredTrades.length} of {trades.length} trades
        </span>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] font-bold">
              <tr>
                <th className="py-3 px-3">Date / Day</th>
                <th className="py-3 px-3">Pair</th>
                <th className="py-3 px-3">IPDA</th>
                <th className="py-3 px-3">Asian High</th>
                <th className="py-3 px-3">Asian Low</th>
                <th className="py-3 px-3">Sweep Type</th>
                <th className="py-3 px-3">BPR Limit Entry</th>
                <th className="py-3 px-3">Stop Loss</th>
                <th className="py-3 px-3">Target TP</th>
                <th className="py-3 px-3">R:R</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Exit Price</th>
                <th className="py-3 px-3">Realized PnL</th>
                <th className="py-3 px-3">Session Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No Asian Stop Hunt trades matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(t => {
                  const isBuy = t.sweepType === 'LOW_SWEEP';
                  const dec = getPairDecimals(t.pair);
                  const isWin = t.outcome === 'WIN';
                  const isLoss = t.outcome === 'LOSS';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{t.date}</span>
                        <span className="text-[10px] text-slate-400 font-sans">{t.tradingDay}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-slate-900">{t.pair}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          t.ipdaBias === 'BULLISH'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {t.ipdaBias}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {t.asianHigh.toFixed(dec)}
                      </td>

                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {t.asianLow.toFixed(dec)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.sweepType === 'HIGH_SWEEP'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {t.sweepType === 'HIGH_SWEEP' ? 'High Swept (Sell)' : 'Low Swept (Buy)'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                        {t.entryPrice.toFixed(dec)}
                      </td>

                      <td className="py-3 px-3 font-bold text-rose-600 whitespace-nowrap">
                        {t.stopLoss.toFixed(dec)}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                        {t.takeProfit.toFixed(dec)}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        1:{t.riskRewardRatio}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                          isWin
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : isLoss
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {t.outcome}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {t.exitPrice ? t.exitPrice.toFixed(dec) : '—'}
                      </td>

                      <td className={`py-3 px-3 font-black whitespace-nowrap ${
                        isWin ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                        {t.realizedPnl > 0 ? `+$${t.realizedPnl.toLocaleString()}` : t.realizedPnl < 0 ? `-$${Math.abs(t.realizedPnl).toLocaleString()}` : '$0'}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[10px] whitespace-nowrap">
                        {t.entryTimeNY} NY ({t.entryTimeIST})
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
