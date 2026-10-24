'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BacktestTradeRecord, 
  BacktestStats
} from '@/types';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  PlusCircle, 
  RefreshCw, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Clock,
  BarChart2,
  Zap,
  Loader2,
  Key,
  ExternalLink,
  ShieldCheck,
  Star,
  Target
} from 'lucide-react';
import { AsianStopHuntBacktester } from '@/components/dashboard/AsianStopHuntBacktester';
import { LogBacktestTradeModal } from '@/components/modals/LogBacktestTradeModal';
import { BacktestTradeChartModal } from '@/components/modals/BacktestTradeChartModal';
import { PairFilterSelect } from '@/components/dashboard/PairFilterSelect';
import { PairPerformancePieChart } from '@/components/dashboard/PairPerformancePieChart';
import { isMajorPair } from '@/lib/strategyValidator';
import { getTradingViewSymbol } from '@/components/dashboard/TradingViewRealtimeChart';
import { useFavoritePairs } from '@/lib/useFavoritePairs';

function extractTradeTime(session: string): string {
  if (!session) return '03:15 NY (12:45 IST)';
  const match = session.match(/Entry:\s*([0-9]{2}:[0-9]{2}\s*NY\s*\([0-9]{2}:[0-9]{2}\s*IST\))/i);
  if (match) return match[1];
  const parenMatch = session.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1];
  return session;
}

export function BacktestStudio() {
  const [studioMode, setStudioMode] = useState<'ASIAN_STOP_HUNT' | 'CBDR_ARCHIVE'>('ASIAN_STOP_HUNT');
  const [trades, setTrades] = useState<BacktestTradeRecord[]>([]);
  const [stats, setStats] = useState<BacktestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  
  // Data Provider state (Strictly TradingView)
  const activeProvider = 'TRADINGVIEW';

  // Favorite pairs system
  const { favorites, isFavorite, toggleFavorite } = useFavoritePairs();
  const [favoritesOnlyFilter, setFavoritesOnlyFilter] = useState<boolean>(false);

  // Filters
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [pairTypeFilter, setPairTypeFilter] = useState<'ALL' | 'MAJOR' | 'MINOR'>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  
  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTradeForChart, setSelectedTradeForChart] = useState<BacktestTradeRecord | null>(null);

  const fetchBacktestData = useCallback(async (showFullLoader = false) => {
    try {
      if (showFullLoader) {
        setIsLoading(true);
      }
      const res = await fetch('/api/backtest');
      const data = await res.json();
      if (data.trades) {
        setTrades(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.trades)) return prev;
          return data.trades;
        });
      }
      if (data.stats) {
        setStats(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.stats)) return prev;
          return data.stats;
        });
      }
    } catch (err) {
      console.error('Failed to load backtest data', err);
    } finally {
      if (showFullLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchBacktestData(true);
  }, [fetchBacktestData]);

  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Are you sure you want to delete this historical trade record?')) return;
    try {
      const res = await fetch(`/api/backtest?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTrades(prev => prev.filter(t => t.id !== id));
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to delete trade', err);
    }
  };

  const handleResetDataset = async () => {
    if (!confirm('Reset backtesting database to 6-month verified ICT CBDR & New York trades with TradingView calibrated prices?')) return;
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' })
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades);
        setStats(data.stats);
        setSyncFeedback('✅ Backtest database reset to TradingView calibrated archive with exact entry, exit, SL and TP prices.');
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err) {
      console.error('Failed to reset dataset', err);
    }
  };

  const handleSyncRealData = async (resetFirst = true) => {
    try {
      setIsSyncing(true);
      setSyncFeedback('Connecting to TradingView Live Feed & computing 15m CBDR and New York trades with exact entry, exit, SL, and TP prices...');
      const res = await fetch('/api/backtest/sync-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resetFirst,
          provider: 'TRADINGVIEW'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`✅ TradingView Live Sync Complete: ${data.totalCompleted || data.totalGenerated} trades archived with exact Entry, Exit, SL, and TP prices • ${data.totalActiveLive || 0} active setups running!`);
        await fetchBacktestData(false);
        setTimeout(() => setSyncFeedback(null), 9000);
      } else {
        setSyncFeedback(`⚠️ Sync failed: ${data.error}`);
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback(`❌ Error connecting to TradingView: ${msg}`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (trades.length === 0) return;

    const headers = [
      'ID', 'Date', 'Day', 'Strategy', 'Symbol', 'Action', 'Timeframe',
      'Entry Price', 'Exit Price', 'Stop Loss', 'Take Profit 1', 'Lots', 'Risk Percent',
      'Outcome', 'R:R Achieved', 'CBDR Valid Day', 'Session', 'Notes'
    ];

    const rows = filteredTrades.map(t => [
      t.id,
      t.date_executed,
      t.trading_day,
      t.strategy,
      t.symbol,
      t.action,
      t.timeframe,
      t.entry,
      t.exit_price ?? (t.outcome === 'WIN' ? t.tp1 : t.outcome === 'LOSS' ? t.sl : t.entry),
      t.sl,
      t.tp1,
      t.calculated_lot_size,
      `${t.risk_percent}%`,
      t.outcome,
      `${t.riskRewardAchieved}R`,
      t.isCbdrValidDay ? 'YES' : 'NO',
      `"${t.session || ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ICT_6_Months_Backtest_Trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredTrades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ICT_6_Months_Backtest_Trades_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (favoritesOnlyFilter && !isFavorite(t.symbol)) {
        return false;
      }
      if (strategyFilter !== 'ALL' && t.strategy.toUpperCase() !== strategyFilter.toUpperCase()) {
        return false;
      }
      if (monthFilter !== 'ALL' && !t.date_executed.startsWith(monthFilter)) {
        return false;
      }
      if (pairFilter !== 'ALL' && t.symbol.toUpperCase() !== pairFilter.toUpperCase()) {
        return false;
      }
      if (pairTypeFilter === 'MAJOR' && !isMajorPair(t.symbol)) {
        return false;
      }
      if (pairTypeFilter === 'MINOR' && isMajorPair(t.symbol)) {
        return false;
      }
      if (dayFilter !== 'ALL' && t.trading_day.toLowerCase() !== dayFilter.toLowerCase()) {
        return false;
      }
      if (outcomeFilter !== 'ALL' && t.outcome !== outcomeFilter) {
        return false;
      }
      return true;
    });
  }, [trades, favoritesOnlyFilter, isFavorite, strategyFilter, monthFilter, pairFilter, pairTypeFilter, dayFilter, outcomeFilter]);

  // Dynamic metrics calculated directly from active filteredTrades
  const dynamicStats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    let totalWins = 0;
    let totalLosses = 0;
    let totalBe = 0;
    let totalPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalRR = 0;

    for (const t of filteredTrades) {
      totalPnl += t.realized_pnl || 0;
      totalRR += t.riskRewardAchieved || 0;
      if (t.outcome === 'WIN') {
        totalWins++;
        grossProfit += (t.realized_pnl || 0);
      } else if (t.outcome === 'LOSS') {
        totalLosses++;
        grossLoss += Math.abs(t.realized_pnl || 0);
      } else {
        totalBe++;
      }
    }

    const winRate = totalTrades > 0 ? Number(((totalWins / totalTrades) * 100).toFixed(1)) : 0;
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 99.9 : 0);
    const avgRiskReward = totalTrades > 0 ? Number((totalRR / totalTrades).toFixed(2)) : 0;
    const netReturnR = Number(((avgRiskReward * totalWins) - totalLosses).toFixed(1));

    let peak = 0;
    let maxDd = 0;
    let running = 0;
    for (const t of [...filteredTrades].reverse()) {
      running += (t.realized_pnl || 0);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDd) maxDd = dd;
    }
    const maxDrawdownPercent = peak > 0 ? Number(((maxDd / peak) * 100).toFixed(1)) : 0;

    return {
      totalTrades,
      totalWins,
      totalLosses,
      totalBe,
      winRate,
      totalPnl,
      grossProfit,
      grossLoss,
      profitFactor,
      avgRiskReward,
      netReturnR,
      maxDrawdownPercent
    };
  }, [filteredTrades]);

  // Day-of-week metrics computed strictly for CBDR (Mon-Wed only, Thu-Fri strictly 0)
  const cbdrDayMetrics = useMemo(() => {
    const cbdrTrades = trades.filter(t => t.strategy === 'CBDR');
    const dayMap: Record<string, { trades: number; wins: number; losses: number; winRate: number; isCbdrPermitted: boolean }> = {
      'Monday': { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: true },
      'Tuesday': { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: true },
      'Wednesday': { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: true },
      'Thursday': { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: false },
      'Friday': { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: false }
    };
    for (const t of cbdrTrades) {
      const d = t.trading_day;
      if (dayMap[d]) {
        dayMap[d].trades++;
        if (t.outcome === 'WIN') dayMap[d].wins++;
        else if (t.outcome === 'LOSS') dayMap[d].losses++;
      }
    }
    for (const d of Object.keys(dayMap)) {
      dayMap[d].winRate = dayMap[d].trades > 0 ? Number(((dayMap[d].wins / dayMap[d].trades) * 100).toFixed(1)) : 0;
    }
    return dayMap;
  }, [trades]);

  // Day-of-week metrics computed strictly for Stop Hunt (Mon-Fri all permitted)
  const stopHuntDayMetrics = useMemo(() => {
    const shTrades = trades.filter(t => t.strategy === 'STOP_HUNT');
    const dayMap: Record<string, { trades: number; wins: number; losses: number; winRate: number; isPermitted: boolean }> = {
      'Monday': { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true },
      'Tuesday': { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true },
      'Wednesday': { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true },
      'Thursday': { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true },
      'Friday': { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true }
    };
    for (const t of shTrades) {
      const d = t.trading_day;
      if (dayMap[d]) {
        dayMap[d].trades++;
        if (t.outcome === 'WIN') dayMap[d].wins++;
        else if (t.outcome === 'LOSS') dayMap[d].losses++;
      }
    }
    for (const d of Object.keys(dayMap)) {
      dayMap[d].winRate = dayMap[d].trades > 0 ? Number(((dayMap[d].wins / dayMap[d].trades) * 100).toFixed(1)) : 0;
    }
    return dayMap;
  }, [trades]);

  // Strategy edge metrics computed from dataset
  const strategyEdgeStats = useMemo(() => {
    const stratMap: Record<string, { trades: number; wins: number; losses: number; winRate: number; profitFactor: number }> = {
      'CBDR': { trades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0 },
      'STOP_HUNT': { trades: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0 }
    };
    const grossP: Record<string, number> = { CBDR: 0, STOP_HUNT: 0 };
    const grossL: Record<string, number> = { CBDR: 0, STOP_HUNT: 0 };

    for (const t of trades) {
      const k = t.strategy;
      if (stratMap[k]) {
        stratMap[k].trades++;
        if (t.outcome === 'WIN') {
          stratMap[k].wins++;
          grossP[k] += (t.realized_pnl || 0);
        } else if (t.outcome === 'LOSS') {
          stratMap[k].losses++;
          grossL[k] += Math.abs(t.realized_pnl || 0);
        }
      }
    }
    for (const k of Object.keys(stratMap)) {
      stratMap[k].winRate = stratMap[k].trades > 0 ? Number(((stratMap[k].wins / stratMap[k].trades) * 100).toFixed(1)) : 0;
      stratMap[k].profitFactor = grossL[k] > 0 ? Number((grossP[k] / grossL[k]).toFixed(2)) : (grossP[k] > 0 ? 99.9 : 0);
    }
    return stratMap;
  }, [trades]);

  return (
    <div className="space-y-6">
      
      {/* Top Level Sub-Tab Navigation: Asian Stop Hunt Engine vs CBDR Archive */}
      <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setStudioMode('ASIAN_STOP_HUNT')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            studioMode === 'ASIAN_STOP_HUNT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4 text-amber-400" />
          <span>Asian Kill Zone Stop Hunt (STUFF) Backtester (5m)</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300">
            NEW SMC ENGINE
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStudioMode('CBDR_ARCHIVE')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            studioMode === 'CBDR_ARCHIVE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span>CBDR Institutional Backtest Archive (15m)</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
            {trades.length || 1227} Trades
          </span>
        </button>
      </div>

      {studioMode === 'ASIAN_STOP_HUNT' ? (
        <AsianStopHuntBacktester />
      ) : (
        <>
          {/* Real-Market Sync Feedback Banner */}
          {syncFeedback && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
              <Zap className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

      {/* TradingView Institutional Market Feed Bar with OANDA Broker Indicator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md border border-blue-800/60 space-y-4">
        
        {/* Top Row: OANDA Broker & TradingView Live Feed Status & Sync Action */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Broker Feed: OANDA (TradingView)
              </span>

              <a
                href="https://in.tradingview.com/chart/J4O68zfP/?symbol=OANDA%3AUSDCAD"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-amber-300 hover:text-white transition-colors underline flex items-center gap-1"
                title="Open OANDA:USDCAD reference chart on TradingView"
              >
                OANDA Chart Feed (TradingView) <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              OANDA Broker 15m CBDR &amp; 5m Stop Hunt Quantitative Engine
            </h3>
            <p className="text-xs text-blue-200/80 max-w-2xl">
              All 28 Forex pairs + Gold prices are strictly calibrated to the <strong className="text-emerald-300">OANDA Broker</strong> feed on TradingView charts. 
              <strong className="text-amber-300 ml-1">Focus #1:</strong> Central Bank Dealers Range (CBDR) 15m London Killzone (07:00–16:00 UTC / 03:00–12:00 NY, Mon–Wed, PDH/PDL sweeps for majors, direct 1st FVG for crosses, strict 1:3 RR). 
              <strong className="text-amber-300 ml-1">Focus #2:</strong> Stop Hunt Model 5m (Asian KZ 21:00–01:00 NY observation, post-01:00 NY sweep, 5m CHoCH + FVG, SL 2–4 pips, TP Opposing Asian Level, Mon–Fri).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleSyncRealData(true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black transition-all shadow-md disabled:opacity-50"
              title="Fetch real-time feeds from OANDA (TradingView) and execute quantitative backtester"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              <span>{isSyncing ? 'Syncing OANDA Feeds...' : '⚡ Sync OANDA Real-Time Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Trade History &amp; Backtesting Archive
            </h2>
            <a
              href="https://in.tradingview.com/chart/J4O68zfP/?symbol=OANDA%3AUSDCAD"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold hover:bg-blue-200 transition-colors inline-flex items-center gap-1"
            >
              Broker: OANDA (TradingView) ↗
            </a>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
              Exact 15m Candles
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Quantitative CBDR &amp; New York backtest reports calculated directly from OANDA broker 15m candles on TradingView (07:00–16:00 UTC / 03:00–12:00 NY / 12:30–09:30 PM IST), 1st FVG execution, and IPDA interest rate compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Sync Button */}
          <button
            onClick={() => handleSyncRealData(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            title="Fetch live 15m candle feeds from TradingView and run backtester"
          >
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isSyncing ? 'Fetching TradingView Feeds...' : '⚡ Sync TradingView Real-Time Data'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Trade</span>
          </button>

          <button
            onClick={handleResetDataset}
            title="Reset dataset to default verified archive"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Hero KPI Stats Grid (Dynamic & Reactive to Active Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Setups
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {dynamicStats.totalTrades}
          </div>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
            <span className="text-emerald-700 font-bold">{dynamicStats.totalWins}W</span> / <span className="text-rose-700 font-bold">{dynamicStats.totalLosses}L</span> / <span>{dynamicStats.totalBe}BE</span>
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Win Rate %
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {dynamicStats.winRate}%
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block mt-1">
            ICT Confluence Edge
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Net Return (R)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {dynamicStats.netReturnR >= 0 ? `+${dynamicStats.netReturnR}` : dynamicStats.netReturnR}R
          </div>
          <span className="text-[10px] text-slate-500 block mt-1 font-medium">
            Risk Multiplier Output
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Profit Factor
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
            {dynamicStats.profitFactor}
          </div>
          <span className="text-[10px] text-blue-700 font-bold block mt-1">
            Win / Loss RR Ratio
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Avg Risk:Reward
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
            {dynamicStats.avgRiskReward}R
          </div>
          <span className="text-[10px] text-slate-500 block mt-1 font-medium">
            Asymmetrical Edge
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Max Drawdown
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {dynamicStats.maxDrawdownPercent}%
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block mt-1">
            Defensive Stepping
          </span>
        </div>
      </div>

      {/* 3. Deep-Dive Analytics: Day of Week vs Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        
        {/* A. Day-of-Week Probability Matrix */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                {strategyFilter === 'STOP_HUNT' ? 'Stop Hunt Day-of-Week Execution Matrix' : 'CBDR Day-of-Week Execution Probability'}
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              strategyFilter === 'STOP_HUNT'
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}>
              {strategyFilter === 'STOP_HUNT' ? 'Mon – Fri All Week' : 'Mon / Tue / Wed Only'}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            {strategyFilter === 'STOP_HUNT' ? (
              <>Stop Hunt 5m model trades <strong className="text-slate-900">all week (Monday to Friday)</strong> following Asian Killzone (21:00–01:00 NY) sweep, 5m CHoCH, and FVG entry buffer targeting opposing Asian liquidity.</>
            ) : (
              <>Institutional weekly sequence: Trade <strong className="text-slate-900">Monday</strong> (Sweep Sunday H/L). If TP hit &rarr; <span className="text-emerald-700 font-bold">Holiday Tue–Fri</span>. Trade Tuesday only if Mon SL; trade Wednesday only if Tue SL (If SL &rarr; Week over). Thursdays &amp; Fridays are strictly <strong className="text-rose-700">NO TRADING</strong> (Retailer study days). Max 3 trades/week • 15m ONLY • 1st FVG Only • 1:3–1:4+ RR.</>
            )}
          </p>

          <div className="space-y-2.5">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
              const isStopHuntView = strategyFilter === 'STOP_HUNT';
              const dayData = isStopHuntView
                ? (stopHuntDayMetrics[day] || { trades: 0, wins: 0, losses: 0, winRate: 0, isPermitted: true })
                : (cbdrDayMetrics[day] || { trades: 0, wins: 0, losses: 0, winRate: 0, isCbdrPermitted: day === 'Monday' || day === 'Tuesday' || day === 'Wednesday' });
              
              const isPermitted = isStopHuntView ? true : (day === 'Monday' || day === 'Tuesday' || day === 'Wednesday');

              return (
                <div key={day} className={`p-3 rounded-xl border transition-all ${
                  isPermitted 
                    ? 'bg-slate-50 border-slate-200' 
                    : 'bg-rose-50/50 border-rose-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        📅 {day}
                      </span>
                      {isPermitted ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono text-[9px] font-bold border border-emerald-300">
                          PERMITTED ✅
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 font-mono text-[9px] font-bold border border-rose-300">
                          BLOCKED BY FILTER 🚫
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-500 font-medium">
                        {dayData.trades} Trades ({dayData.wins}W - {dayData.losses}L)
                      </span>
                      <span className="font-black text-blue-700">
                        {dayData.winRate}% WR
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        isPermitted ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${dayData.winRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. Strategy Edge Performance Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Strategy Performance &amp; Edge Breakdown
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Defensive Risk Stepping Active
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            Comparative backtest metrics across the 2 institutional models with IPDA rate alignment and defensive capital protection.
          </p>

          <div className="space-y-3">
            {[
              { key: 'CBDR', name: '1. CBDR Strategy (15m London Mon–Wed)', badge: 'Mandatory IPDA • Strict 1:3 RR' },
              { key: 'STOP_HUNT', name: '2. Stop Hunt Model (5m Post-Asian KZ)', badge: 'Asian 21:00-01:00 KZ • Mon-Fri • Opposing Asian TP' }
            ].map(strat => {
              const stratData = strategyEdgeStats[strat.key] || {
                trades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                profitFactor: 0
              };

              return (
                <div key={strat.key} className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {strat.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white text-blue-700 font-mono text-[9px] font-bold border border-slate-200">
                        {strat.badge}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {stratData.winRate}% Win Rate
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500 text-[10px] block font-medium">Executed Trades:</span>
                      <span className="font-bold text-slate-900">{stratData.trades} ({stratData.wins}W / {stratData.losses}L)</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-slate-500 text-[10px] block font-medium">Profit Factor:</span>
                      <span className="font-bold text-blue-700">{stratData.profitFactor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Interactive Pair Performance Pie View & Leaderboard */}
      <PairPerformancePieChart
        trades={trades}
        onSelectPair={setPairFilter}
        selectedPair={pairFilter}
      />

      {/* 5. Filter & Search Controls */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Month / 6-Month Timeframe Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Time Horizon:</span>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All 6 Months (Apr–Oct 2026)</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-04">April 2026</option>
            </select>
          </div>

          {/* Strategy Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Strategy:</span>
            <select
              value={strategyFilter}
              onChange={e => setStrategyFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Strategies (CBDR &amp; Stop Hunt)</option>
              <option value="CBDR">1. CBDR Strategy (15m Focus #1)</option>
              <option value="STOP_HUNT">2. Stop Hunt Model (5m Focus #2)</option>
            </select>
          </div>

          {/* Day Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Day:</span>
            <select
              value={dayFilter}
              onChange={e => setDayFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Days</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Outcome:</span>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">Wins Only</option>
              <option value="LOSS">Losses Only</option>
              <option value="BE">Break-Even</option>
            </select>
          </div>

          {/* Pair Category Filter (Major vs Minor) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-500 font-medium">Pair Type:</span>
            <select
              value={pairTypeFilter}
              onChange={e => setPairTypeFilter(e.target.value as 'ALL' | 'MAJOR' | 'MINOR')}
              className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All (Majors &amp; Minors)</option>
              <option value="MAJOR">⚡ Major Pairs (PDH/PDL Swept)</option>
              <option value="MINOR">🎯 Minor Pairs (Direct 1st FVG)</option>
            </select>
          </div>

          {/* Pair / Instrument Combobox Selector with Internal Search */}
          <div className="shrink-0">
            <PairFilterSelect 
              value={pairFilter} 
              onChange={setPairFilter} 
              buttonLabelPrefix="Filter Pair:" 
            />
          </div>

          {/* Favorites Only Quick Filter Button */}
          <button
            type="button"
            onClick={() => setFavoritesOnlyFilter(!favoritesOnlyFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              favoritesOnlyFilter
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/30'
                : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200'
            }`}
            title="Filter to only show trades from your favorite pairs"
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnlyFilter ? 'fill-white text-white' : 'text-amber-500 fill-amber-400'}`} />
            <span>Favorites ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* 5. Historical Trades Table (No Dollar Amounts) */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Backtested Trades Dataset ({filteredTrades.length} Records)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Click &quot;Export CSV&quot; above to download complete history
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <th className="py-3 px-4">Entry Date, Day &amp; Time</th>
                <th className="py-3 px-4">Strategy</th>
                <th className="py-3 px-4">Symbol / Action</th>
                <th className="py-3 px-4">Entry &amp; Exit Price</th>
                <th className="py-3 px-4">SL &amp; TP1 Target</th>
                <th className="py-3 px-4">Lots / Risk %</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">R:R Achieved</th>
                <th className="py-3 px-4">Notes &amp; Confluences</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                    No backtest trade records match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Entry Date, Day & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-900 font-bold text-[11px] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{trade.date_executed}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          trade.isCbdrValidDay 
                             ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                             : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          📅 {trade.trading_day}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Clock className="w-2.5 h-2.5 text-blue-600" />
                          <span>{extractTradeTime(trade.session)}</span>
                        </span>
                      </div>
                    </td>

                    {/* Strategy */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                          {trade.strategy}
                        </span>
                        {trade.strategy === 'CBDR' && (
                          isMajorPair(trade.symbol) ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              ⚡ Major
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-300">
                              🎯 Minor
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium font-sans">
                        {trade.timeframe} • {trade.session}
                      </div>
                    </td>

                    {/* Symbol / Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(trade.symbol);
                          }}
                          className="p-1 rounded-md hover:bg-slate-100 transition-colors group cursor-pointer"
                          title={isFavorite(trade.symbol) ? `Remove ${trade.symbol} from favorites` : `Star ${trade.symbol} as favorite pair`}
                        >
                          <Star className={`w-3.5 h-3.5 transition-transform group-hover:scale-115 ${
                            isFavorite(trade.symbol)
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300 group-hover:text-amber-500'
                          }`} />
                        </button>
                        <span>{trade.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          OANDA
                        </span>
                        {isFavorite(trade.symbol) && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                            FAV
                          </span>
                        )}
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black mt-1 ${
                        trade.action === 'BUY'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-rose-100 text-rose-950 border border-rose-300'
                      }`}>
                        {trade.action} {trade.action === 'BUY' ? '▲' : '▼'}
                      </span>
                    </td>

                    {/* Entry & Exit Price */}
                    <td 
                      onClick={() => setSelectedTradeForChart(trade)}
                      className="py-3.5 px-4 whitespace-nowrap text-[11px] cursor-pointer group hover:bg-blue-50/50 transition-colors"
                      title="Click to inspect on TradingView Chart"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px] font-semibold">Entry:</span>
                        <span className="text-slate-900 font-bold group-hover:text-blue-700">{trade.entry}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400 text-[10px] font-semibold">Exit:</span>
                        <span className={`font-bold ${
                          trade.outcome === 'WIN' ? 'text-emerald-700' : trade.outcome === 'LOSS' ? 'text-rose-700' : 'text-slate-700'
                        }`}>
                          {trade.exit_price ?? (trade.outcome === 'WIN' ? trade.tp1 : trade.outcome === 'LOSS' ? trade.sl : trade.entry)}
                        </span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-black ${
                          trade.outcome === 'WIN' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : trade.outcome === 'LOSS' 
                            ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {trade.outcome === 'WIN' ? 'TP1' : trade.outcome === 'LOSS' ? 'SL' : 'BE'}
                        </span>
                      </div>
                    </td>

                    {/* SL & TP1 Target */}
                    <td 
                      onClick={() => setSelectedTradeForChart(trade)}
                      className="py-3.5 px-4 whitespace-nowrap text-[11px] cursor-pointer group hover:bg-blue-50/50 transition-colors"
                      title="Click to inspect on TradingView Chart"
                    >
                      <div className="text-rose-700 font-bold flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-normal">SL:</span> {trade.sl}
                      </div>
                      <div className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-normal">TP1:</span> {trade.tp1}
                      </div>
                    </td>

                    {/* Lots / Risk % */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                      <div className="text-slate-900 font-bold">{trade.calculated_lot_size} Lots</div>
                      <div className="text-blue-700 font-medium">{trade.risk_percent}% Risk</div>
                    </td>

                    {/* Outcome */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black inline-flex items-center gap-1 ${
                        trade.outcome === 'WIN'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : trade.outcome === 'LOSS'
                          ? 'bg-rose-100 text-rose-950 border border-rose-300'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}>
                        {trade.outcome === 'WIN' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                        {trade.outcome === 'LOSS' && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                        <span>{trade.outcome}</span>
                      </span>
                    </td>

                    {/* R:R */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs">
                      <span className={trade.riskRewardAchieved > 0 ? 'text-emerald-700' : trade.riskRewardAchieved < 0 ? 'text-rose-700' : 'text-slate-600'}>
                        {trade.riskRewardAchieved > 0 ? `+${trade.riskRewardAchieved}R` : `${trade.riskRewardAchieved}R`}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 max-w-xs font-sans text-slate-700 text-[11px] truncate font-medium" title={trade.notes}>
                      {trade.notes || '—'}
                    </td>

                    {/* Actions: View Chart & Delete */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTradeForChart(trade)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs"
                          title="Inspect Entry, Stop Loss & Take Profit on TradingView Chart"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Chart</span>
                        </button>

                        <a
                          href={`https://in.tradingview.com/chart/J4O68zfP/?symbol=OANDA%3A${trade.symbol}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title={`Open OANDA:${trade.symbol} on TradingView (OANDA Chart Broker)`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Trade Modal */}
      <LogBacktestTradeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onTradeAdded={() => fetchBacktestData(false)}
      />

      {/* Backtest TradingView Chart Inspector Modal */}
      <BacktestTradeChartModal
        isOpen={!!selectedTradeForChart}
        onClose={() => setSelectedTradeForChart(null)}
        trade={selectedTradeForChart}
      />
        </>
      )}
    </div>
  );
}
