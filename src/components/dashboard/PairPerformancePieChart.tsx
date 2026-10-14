'use client';

import React, { useState, useMemo } from 'react';
import { BacktestTradeRecord } from '@/types';
import { PieChart as PieIcon, Trophy, Filter, Sparkles, Layers } from 'lucide-react';

interface PairPerformancePieChartProps {
  trades: BacktestTradeRecord[];
  onSelectPair?: (symbol: string) => void;
  selectedPair?: string;
  initialStrategy?: string;
}

export interface PairStatMetric {
  symbol: string;
  totalTrades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  netR: number;
  color: string;
  category: string;
}

const PALETTE = [
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#7c3aed', // purple-600
  '#d97706', // amber-600
  '#0891b2', // cyan-600
  '#e11d48', // rose-600
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
  '#64748b'  // slate-500
];

const STRATEGY_FILTERS = [
  { id: 'ALL', label: 'All Trades', shortLabel: 'All', badge: 'Complete Archive' },
  { id: 'CBDR', label: 'CBDR 15m (Focus #1)', shortLabel: 'CBDR', badge: 'London 15m' },
  { id: 'NEW_YORK', label: 'New York (Focus #2)', shortLabel: 'NY Open', badge: 'NY 1m/15m' },
  { id: 'STOP_HUNT', label: 'Stop Hunt (5m)', shortLabel: 'Stop Hunt', badge: 'Asian Sweep 5m' }
];

export function PairPerformancePieChart({
  trades,
  onSelectPair,
  selectedPair = 'ALL',
  initialStrategy = 'ALL'
}: PairPerformancePieChartProps) {
  const [strategyFilter, setStrategyFilter] = useState<string>(initialStrategy);
  const [metricMode, setMetricMode] = useState<'netR' | 'wins' | 'winRate'>('netR');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // 1. Filter trades by chosen Strategy
  const filteredTrades = useMemo(() => {
    if (strategyFilter === 'ALL') return trades;
    return trades.filter(t => t.strategy.toUpperCase() === strategyFilter.toUpperCase());
  }, [trades, strategyFilter]);

  // Strategy aggregate overview metrics
  const strategyStats = useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;
    let totalBe = 0;
    let totalR = 0;

    for (const t of filteredTrades) {
      totalR += t.riskRewardAchieved;
      if (t.outcome === 'WIN') totalWins++;
      else if (t.outcome === 'LOSS') totalLosses++;
      else totalBe++;
    }

    const winRate = filteredTrades.length > 0
      ? Number(((totalWins / filteredTrades.length) * 100).toFixed(1))
      : 0;

    return {
      count: filteredTrades.length,
      wins: totalWins,
      losses: totalLosses,
      be: totalBe,
      winRate,
      netR: Number(totalR.toFixed(1))
    };
  }, [filteredTrades]);

  // 2. Calculate stats for all pairs from filtered backtest trades
  const pairStats = useMemo(() => {
    const map: Record<string, { total: number; wins: number; losses: number; be: number; netR: number }> = {};

    for (const t of filteredTrades) {
      const sym = t.symbol.toUpperCase();
      if (!map[sym]) {
        map[sym] = { total: 0, wins: 0, losses: 0, be: 0, netR: 0 };
      }
      map[sym].total++;
      map[sym].netR += t.riskRewardAchieved;
      if (t.outcome === 'WIN') map[sym].wins++;
      else if (t.outcome === 'LOSS') map[sym].losses++;
      else map[sym].be++;
    }

    const list: PairStatMetric[] = Object.entries(map).map(([symbol, data], idx) => {
      const winRate = data.total > 0 ? Number(((data.wins / data.total) * 100).toFixed(1)) : 0;
      let category = 'Forex Major/Cross';
      if (symbol === 'XAUUSD') category = 'Commodity';
      else if (['NAS100', 'SPX500', 'US30'].includes(symbol)) category = 'Index';
      else if (symbol.includes('JPY')) category = 'Yen Cross';
      else if (symbol.includes('CHF') || symbol.includes('GBP') || symbol.includes('EUR')) category = 'European Cross';

      return {
        symbol,
        totalTrades: data.total,
        wins: data.wins,
        losses: data.losses,
        be: data.be,
        winRate,
        netR: Number(data.netR.toFixed(1)),
        color: PALETTE[idx % PALETTE.length],
        category
      };
    });

    // Sort by selected metric
    if (metricMode === 'netR') {
      list.sort((a, b) => b.netR - a.netR);
    } else if (metricMode === 'wins') {
      list.sort((a, b) => b.wins - a.wins);
    } else {
      list.sort((a, b) => b.winRate - a.winRate || b.totalTrades - a.totalTrades);
    }

    // Assign consistent top colors to the top ranked
    return list.map((item, i) => ({
      ...item,
      color: PALETTE[i % PALETTE.length]
    }));
  }, [filteredTrades, metricMode]);

  // 3. Top pairs vs other grouped for pie slices
  const { topPairs, pieSlices, totalMetricValue } = useMemo(() => {
    const top = pairStats.slice(0, 8);
    const others = pairStats.slice(8);

    let otherMetric = 0;
    let otherTrades = 0;
    let otherWins = 0;
    let otherLosses = 0;
    let otherBe = 0;

    for (const o of others) {
      if (metricMode === 'netR') otherMetric += Math.max(0, o.netR);
      else if (metricMode === 'wins') otherMetric += o.wins;
      else otherMetric += o.winRate;
      otherTrades += o.totalTrades;
      otherWins += o.wins;
      otherLosses += o.losses;
      otherBe += o.be;
    }

    const slices: { symbol: string; label: string; value: number; color: string; percentage: number; stats: PairStatMetric }[] = [];
    
    let sum = 0;
    top.forEach(p => {
      const val = metricMode === 'netR' ? Math.max(0, p.netR) : metricMode === 'wins' ? p.wins : p.winRate;
      sum += val;
    });
    sum += otherMetric;

    top.forEach(p => {
      const val = metricMode === 'netR' ? Math.max(0, p.netR) : metricMode === 'wins' ? p.wins : p.winRate;
      const pct = sum > 0 ? (val / sum) * 100 : 0;
      slices.push({
        symbol: p.symbol,
        label: p.symbol,
        value: val,
        color: p.color,
        percentage: Number(pct.toFixed(1)),
        stats: p
      });
    });

    if (others.length > 0 && otherMetric > 0) {
      const pct = sum > 0 ? (otherMetric / sum) * 100 : 0;
      const otherWinRate = otherTrades > 0 ? Number(((otherWins / otherTrades) * 100).toFixed(1)) : 0;
      slices.push({
        symbol: 'OTHERS',
        label: `Other (${others.length} Pairs)`,
        value: otherMetric,
        color: '#94a3b8',
        percentage: Number(pct.toFixed(1)),
        stats: {
          symbol: 'OTHERS',
          totalTrades: otherTrades,
          wins: otherWins,
          losses: otherLosses,
          be: otherBe,
          winRate: otherWinRate,
          netR: Number(otherMetric.toFixed(1)),
          color: '#94a3b8',
          category: 'Other Crosses'
        }
      });
    }

    return {
      topPairs: pairStats,
      pieSlices: slices,
      totalMetricValue: sum
    };
  }, [pairStats, metricMode]);

  // 4. Generate SVG Pie/Donut paths
  const svgPaths = useMemo(() => {
    let cumulativeAngle = -Math.PI / 2; // start from top
    const radius = 80;
    const innerRadius = 52;
    const cx = 100;
    const cy = 100;

    return pieSlices.map((slice) => {
      const sliceAngle = totalMetricValue > 0 ? (slice.value / totalMetricValue) * 2 * Math.PI : 0;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle = endAngle;

      // Outer arc points
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      // Inner arc points
      const ix1 = cx + innerRadius * Math.cos(endAngle);
      const iy1 = cy + innerRadius * Math.sin(endAngle);
      const ix2 = cx + innerRadius * Math.cos(startAngle);
      const iy2 = cy + innerRadius * Math.sin(startAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
        'Z'
      ].join(' ');

      return {
        ...slice,
        pathData
      };
    });
  }, [pieSlices, totalMetricValue]);

  const activeHovered = useMemo(() => {
    if (!hoveredSymbol) return null;
    return pieSlices.find(s => s.symbol === hoveredSymbol) || null;
  }, [hoveredSymbol, pieSlices]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      
      {/* 1. Header Toolbar with Strategy Filter & Metric Mode */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <span>Pair Performance Distribution</span>
                <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                  Interactive Pie
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Empirical breakdown of pair profitability and win rate per strategy model.
              </p>
            </div>
          </div>

          {/* Metric Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setMetricMode('netR')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metricMode === 'netR'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Net Return (R)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('wins')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metricMode === 'wins'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Wins
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('winRate')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metricMode === 'winRate'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Win Rate %
            </button>
          </div>
        </div>

        {/* Strategy Filter Pills Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" />
              Strategy:
            </span>
            {STRATEGY_FILTERS.map(strat => {
              const isActive = strategyFilter === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setStrategyFilter(strat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{strat.label}</span>
                  <span className="sm:hidden">{strat.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Active Strategy Mini Stats */}
          <div className="flex items-center gap-3 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-slate-600">
            <span>
              Trades: <strong className="text-slate-900 font-bold">{strategyStats.count}</strong>
            </span>
            <span>•</span>
            <span>
              Win Rate: <strong className="text-emerald-700 font-bold">{strategyStats.winRate}%</strong>
            </span>
            <span>•</span>
            <span>
              Net: <strong className="text-blue-700 font-bold">+{strategyStats.netR}R</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visual Donut + Ranked Leaderboard Grid */}
      {filteredTrades.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <p className="text-sm font-bold text-slate-700">No trades found for this strategy selection.</p>
          <p className="text-xs text-slate-500">Switch to &quot;All Models&quot; or log new backtest trades for this model.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Interactive SVG Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-2 relative">
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {svgPaths.map((slice) => {
                  const isHovered = hoveredSymbol === slice.symbol;
                  return (
                    <path
                      key={slice.symbol}
                      d={slice.pathData}
                      fill={slice.color}
                      opacity={hoveredSymbol ? (isHovered ? 1.0 : 0.4) : 0.9}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 3 : 1.5}
                      className="cursor-pointer transition-all duration-200 hover:opacity-100"
                      onMouseEnter={() => setHoveredSymbol(slice.symbol)}
                      onMouseLeave={() => setHoveredSymbol(null)}
                      onClick={() => onSelectPair && slice.symbol !== 'OTHERS' && onSelectPair(slice.symbol)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                {activeHovered ? (
                  <div className="animate-in fade-in zoom-in-95 duration-100">
                    <span className="font-mono font-black text-slate-900 text-sm block">
                      {activeHovered.label}
                    </span>
                    <span className="text-emerald-700 font-mono font-black text-base block">
                      {metricMode === 'netR' ? `+${activeHovered.stats.netR}R` : metricMode === 'wins' ? `${activeHovered.stats.wins} Wins` : `${activeHovered.stats.winRate}% WR`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block">
                      {activeHovered.percentage}% Share
                    </span>
                  </div>
                ) : (
                  <div>
                    <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Top Performer
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm block">
                      {topPairs[0]?.symbol || 'N/A'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold block">
                      {topPairs[0] ? `+${topPairs[0].netR}R Net` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-2 text-center font-medium">
              💡 Hover over pie slices to inspect metrics • Click to filter by pair
            </p>
          </div>

          {/* Right: Top Performing Pairs Leaderboard Table */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1 border-b border-slate-100">
              <span>Rank &amp; Currency Pair</span>
              <div className="flex items-center gap-6">
                <span>Trades</span>
                <span>Win Rate</span>
                <span className="text-right min-w-[50px]">Net Return</span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {topPairs.slice(0, 10).map((pair, index) => {
                const isSelected = selectedPair.toUpperCase() === pair.symbol.toUpperCase();
                const isHovered = hoveredSymbol === pair.symbol;

                return (
                  <div
                    key={pair.symbol}
                    onMouseEnter={() => setHoveredSymbol(pair.symbol)}
                    onMouseLeave={() => setHoveredSymbol(null)}
                    onClick={() => onSelectPair && onSelectPair(pair.symbol)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300 shadow-xs'
                        : isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-black text-[10px] ${
                        index === 0 
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : index === 1
                          ? 'bg-slate-200 text-slate-800'
                          : index === 2
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{index + 1}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pair.color }} />
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {pair.symbol}
                        </span>
                      </div>

                      <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                        {pair.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
                      <span className="text-slate-600 font-medium text-[11px]">
                        <strong className="text-emerald-700">{pair.wins}W</strong> - <strong className="text-rose-700">{pair.losses}L</strong>
                      </span>

                      <span className="font-black text-blue-700 text-[11px] min-w-[50px]">
                        {pair.winRate}%
                      </span>

                      <span className={`font-black text-right min-w-[50px] ${
                        pair.netR > 0 ? 'text-emerald-700' : pair.netR < 0 ? 'text-rose-700' : 'text-slate-600'
                      }`}>
                        {pair.netR > 0 ? `+${pair.netR}R` : `${pair.netR}R`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
