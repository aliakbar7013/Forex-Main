'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Target, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Flame,
  Globe2,
  ListOrdered,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function StrategyStudio() {
  const [activeTab, setActiveTab] = useState<'cbdr' | 'major_minor' | 'stophunt' | 'newyork' | 'mistakes'>('cbdr');

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Institutional Strategy Playbook &amp; Rules
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold font-mono">
                ICT Quantitative Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Verified institutional trade execution rules, daily session structures, Major vs. Minor pair algorithmic differences, and risk protection protocols.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-300 text-xs font-bold font-mono">
              ⚡ Mon–Wed Active • Thu–Fri Non-Trading (CBDR)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('cbdr')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'cbdr'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>1. CBDR 15m Model (Overview &amp; Days)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('major_minor')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'major_minor'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>2. Major vs. Minor Pair Execution Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stophunt')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'stophunt'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4 text-blue-600" />
          <span>3. Stop Hunt Model (5m Post-Asian)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('newyork')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'newyork'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span>4. New York Open Model (1m Indices)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mistakes')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'mistakes'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>5. Common Mistakes &amp; Risk Rules</span>
        </button>
      </div>

      {/* TAB 1: CBDR 15m Model Overview */}
      {activeTab === 'cbdr' && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Quick Specs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Timeframe</span>
              <span className="font-mono font-black text-sm text-blue-700">15-minute ONLY</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Session Window</span>
              <span className="font-mono font-black text-sm text-emerald-700">07:00–16:00 UTC (03:00–12:00 NY / 12:30–21:30 IST)</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Trading Days</span>
              <span className="font-mono font-black text-sm text-purple-700">Monday, Tuesday, Wednesday</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Non-Trading Days</span>
              <span className="font-mono font-black text-sm text-rose-700">Thursday &amp; Friday (No Trade)</span>
            </div>
          </div>

          {/* Weekly Trading Protocol */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Weekly Trading Schedule &amp; Holiday Protocol</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[10px] font-bold border border-amber-200">
                Max 3 Trades / Week
              </span>
            </div>

            <p className="text-slate-600 text-xs font-medium">
              The fundamental discipline of the CBDR model is: <strong>Stop trading immediately once Take Profit (TP) is hit</strong>. A single 1:3 or 1:4 setup secures the weekly profit target (4% to 8%+), allowing a 4–7 day holiday.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="p-3 font-bold">Day</th>
                    <th className="p-3 font-bold">Action Rule</th>
                    <th className="p-3 font-bold">If Win (TP Hit)</th>
                    <th className="p-3 font-bold">If Loss (SL Hit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Monday</td>
                    <td className="p-3 text-emerald-700 font-bold">Trade (Sweep Sunday Low/High for Majors)</td>
                    <td className="p-3 text-emerald-700 font-bold">🎉 Holiday Tuesday–Friday</td>
                    <td className="p-3 text-amber-700 font-bold">Trade Tuesday</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Tuesday</td>
                    <td className="p-3 text-emerald-700 font-bold">Trade (Sweep Monday Low/High for Majors)</td>
                    <td className="p-3 text-emerald-700 font-bold">🎉 Holiday Wednesday–Friday</td>
                    <td className="p-3 text-amber-700 font-bold">Trade Wednesday</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Wednesday</td>
                    <td className="p-3 text-emerald-700 font-bold">Trade (Sweep Tuesday Low/High for Majors)</td>
                    <td className="p-3 text-emerald-700 font-bold">🎉 Holiday Thursday–Sunday</td>
                    <td className="p-3 text-rose-700 font-bold">❌ Stop! No More Trades this week</td>
                  </tr>
                  <tr className="bg-rose-50/50">
                    <td className="p-3 font-bold text-rose-900">Thursday</td>
                    <td className="p-3 text-rose-700 font-bold" colSpan={3}>
                      🚫 NON-TRADING DAY — Markets typically reverse or consolidate before Friday NFP/News. DO NOT ENTER NEW TRADES.
                    </td>
                  </tr>
                  <tr className="bg-rose-50/50">
                    <td className="p-3 font-bold text-rose-900">Friday</td>
                    <td className="p-3 text-rose-700 font-bold" colSpan={3}>
                      🚫 NON-TRADING DAY — Weekly close rebalancing and high-impact volatility. DO NOT ENTER NEW TRADES.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Major vs. Minor Pair Execution Rules */}
      {activeTab === 'major_minor' && (
        <div className="space-y-5 animate-in fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Major Pairs Rule Card */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">⚡ RULE A</span>
                <h3 className="font-black text-amber-950 text-base">Major Pairs (PDH/PDL Sweep Required)</h3>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs font-mono font-bold text-amber-900">
                Pairs: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD
              </div>

              <p className="text-xs text-amber-900 font-medium">
                For all Major Pairs, the CBDR rule strictly requires:
              </p>

              <ul className="space-y-2 text-xs text-amber-950 font-medium list-disc list-inside">
                <li><strong>BUY Setup:</strong> Must sweep the <strong>Previous Day Low (PDL)</strong> / Sunday Low during or prior to London session.</li>
                <li><strong>SELL Setup:</strong> Must sweep the <strong>Previous Day High (PDH)</strong> / Sunday High during or prior to London session.</li>
                <li><strong>Entry Trigger:</strong> Once the sweep is verified, enter on the <strong>1st 15m Fair Value Gap (FVG) / Imbalance</strong> formed in the opposite direction.</li>
                <li><strong>If No Sweep Occurs:</strong> NO TRADE on this pair for the day!</li>
              </ul>
            </div>

            {/* Minor / Cross Pairs Rule Card */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-300 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">🎯 RULE B</span>
                <h3 className="font-black text-indigo-950 text-base">Minor / Cross Pairs (Direct 1st Imbalance)</h3>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-indigo-200 text-xs font-mono font-bold text-indigo-900">
                Pairs: GBPNZD, EURGBP, EURJPY, GBPJPY, AUDNZD, CADJPY, GBPCHF, etc.
              </div>

              <p className="text-xs text-indigo-900 font-medium">
                For Minor and Cross pairs, do <strong>NOT</strong> wait for or follow Previous Day High/Low sweeps:
              </p>

              <ul className="space-y-2 text-xs text-indigo-950 font-medium list-disc list-inside">
                <li><strong>No PDH/PDL Sweep Required:</strong> Cross pairs respect internal London session orderflow directly.</li>
                <li><strong>Entry Trigger:</strong> Enter directly on the <strong>1st 15m Fair Value Gap (FVG) / Imbalance</strong> that forms inside the London trading window (07:00–16:00 UTC / 03:00–12:00 NY / 12:30–21:30 IST).</li>
                <li><strong>Target:</strong> Minimum 1:3 RR (Take Profit 1). Move Stop Loss to Breakeven after TP1 hit.</li>
              </ul>
            </div>

          </div>

          {/* Risk Management & Lot Sizing */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Risk Management &amp; Defensive Stepping</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-900 block mb-1">🟢 Normal State (0 Losses)</span>
                <p className="text-emerald-800 text-[11px]">Risk <strong>1.0%</strong> of account equity. Optimal risk-to-reward ratio 1:3 minimum.</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1">🟡 Reduced State (1 Loss)</span>
                <p className="text-amber-800 text-[11px]">Automatically step down risk to <strong>0.50%</strong> to defend capital from drawdown.</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="font-bold text-rose-900 block mb-1">🔴 Defensive State (2+ Losses)</span>
                <p className="text-rose-800 text-[11px]">Step down risk to <strong>0.25%</strong>. Preserves equity until win streak recovers normal mode.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: Stop Hunt Model (Asian Kill Zone STUFF Strategy) */}
      {activeTab === 'stophunt' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  Asian Kill Zone Stop Hunt (STUFF) Model
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Smart Money Concepts (SMC) • 5-Minute (M5) Execution • Post-Asian Kill Zone Liquidity Sweeps
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                ⚡ LIMIT ORDER ONLY
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                🎯 Min 1:3 up to 1:6+ RR
              </span>
            </div>
          </div>

          {/* Quick Specifications Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Base Timezone</span>
              <span className="font-black text-slate-900">America/New_York (NY)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Execution TF</span>
              <span className="font-black text-slate-900">5-Minute (M5)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Asian KZ Window</span>
              <span className="font-black text-blue-700">20:00 – 00:00 NY</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px] uppercase">Pre-Condition</span>
              <span className="font-black text-rose-700">0 Entries Inside KZ</span>
            </div>
          </div>

          {/* Core Strategy Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Bearish SELL Setup Card */}
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                  SELL SETUP (SHORT)
                </span>
                <span className="text-xs font-mono font-bold text-rose-800">
                  IPDA Bias: BEARISH
                </span>
              </div>

              <div className="space-y-2 text-xs text-rose-950 font-medium">
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">1. Sweep:</span>
                  <span>Price breaks above <strong>Asian_High</strong> after 00:00 NY to hunt buy-stop liquidity above the Asian range.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">2. CHoCH:</span>
                  <span>Forms a verified <strong>Bearish (Red) Change of Character (CHoCH)</strong> on M5 by breaking below the recent M5 swing low.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">3. BPR:</span>
                  <span>Identify a <strong>Balanced Price Range (BPR)</strong> where a Bearish FVG overlaps with a prior Bullish FVG. CHoCH and BPR are interchangeable in order, but both must validate before entry.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">4. Limit Entry:</span>
                  <span>Place <strong>LIMIT SELL ONLY</strong> at the upper edge/overlap of the Bearish BPR. (No market execution).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">5. Stop Loss:</span>
                  <span>Placed just above the swing high formed during the Asian High sweep (+1–3 pip safety buffer).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-rose-700 shrink-0">6. Take Profit:</span>
                  <span>Target opposing retail liquidity: <strong>Asian_Low (Sell-Side Liquidity)</strong> or 1-Hour swing lows (Min 1:3 up to 1:6+ RR).</span>
                </div>
              </div>
            </div>

            {/* Bullish BUY Setup Card */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  BUY SETUP (LONG)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  IPDA Bias: BULLISH
                </span>
              </div>

              <div className="space-y-2 text-xs text-emerald-950 font-medium">
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">1. Sweep:</span>
                  <span>Price breaks below <strong>Asian_Low</strong> after 00:00 NY to hunt sell-stop liquidity below the Asian range.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">2. CHoCH:</span>
                  <span>Forms a verified <strong>Bullish (Green) Change of Character (CHoCH)</strong> on M5 by breaking above the recent M5 swing high.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">3. BPR:</span>
                  <span>Identify a <strong>Balanced Price Range (BPR)</strong> where a Bullish FVG overlaps with a prior Bearish FVG. Both Bullish CHoCH &amp; BPR must validate before setting order.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">4. Limit Entry:</span>
                  <span>Place <strong>LIMIT BUY ONLY</strong> at the lower edge/overlap of the Bullish BPR. (No market execution).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">5. Stop Loss:</span>
                  <span>Placed just below the swing low formed during the Asian Low sweep (+1–3 pip safety buffer).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-emerald-700 shrink-0">6. Take Profit:</span>
                  <span>Target opposing retail liquidity: <strong>Asian_High (Buy-Side Liquidity)</strong> or 1-Hour swing highs (Min 1:3 up to 1:6+ RR).</span>
                </div>
              </div>
            </div>

          </div>

          {/* Mandatory Pre-Condition & Filter Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-xs space-y-3">
            <h4 className="font-black text-amber-950 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Mandatory Institutional Execution Filters</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-900">
              <div className="p-3 rounded-xl bg-white/80 border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">⏳ 1. Asian KZ Pre-Condition</span>
                <p className="text-[11px] leading-relaxed">
                  <strong>NO ENTRIES</strong> inside the Asian Kill Zone (20:00 – 00:00 NY). The algorithm must wait until the zone completely concludes before scanning for liquidity sweeps.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">🧭 2. IPDA Directional Bias</span>
                <p className="text-[11px] leading-relaxed">
                  Interest rate differentials dictate permission: <strong>BULLISH</strong> pairs only take BUY setups. <strong>BEARISH</strong> pairs only take SELL setups. <strong>NEUTRAL</strong> pairs are flagged "NO TRADE" and skipped.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">🎯 3. Limit Order Discipline</span>
                <p className="text-[11px] leading-relaxed">
                  Only <strong>LIMIT orders</strong> are placed. Market orders are prohibited. Orders remain in <code>PENDING_FILL</code> until price retraces to the BPR edge, or expire cleanly at session close.
                </p>
              </div>
            </div>
          </div>

          {/* Order State Transition Flowchart */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Automated Signal Lifecycle &amp; State Machine</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">1. SCANNING</span>
                <span className="font-bold text-slate-200">Post-KZ Sweep</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">2. VALIDATION</span>
                <span className="font-bold text-amber-300">CHoCH + BPR</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
                <span className="text-[10px] text-amber-400 block font-bold">3. ORDER PLACED</span>
                <span className="font-bold text-amber-200">PENDING_FILL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40">
                <span className="text-[10px] text-blue-400 block font-bold">4. RETRACEMENT</span>
                <span className="font-bold text-blue-200">TRIGGERED (In Trade)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                <span className="text-[10px] text-emerald-400 block font-bold">5. TARGET</span>
                <span className="font-bold text-emerald-200">TP HIT (+3R–6R)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: New York Open Model */}
      {activeTab === 'newyork' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-base">New York Open Model (1m Timeframe • US Indices)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px]">INSTRUMENTS</span>
              <span className="font-bold text-slate-900">NAS100, SPX500, US30</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px]">WINDOW</span>
              <span className="font-bold text-slate-900">09:30 AM – 12:00 PM NY (07:00–09:30 PM IST)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold block text-[10px]">IPDA FILTER</span>
              <span className="font-bold text-emerald-700">Exempt (Index Momentum)</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-700 font-medium">
            <p><strong>1. 15m Range Context:</strong> Mark the opening range high/low at 09:15–09:30 AM NY.</p>
            <p><strong>2. 1m Scalp Entry:</strong> On 09:30 opening impulse, enter on 1m CHOCH + 1m FVG towards next key liquidity pool.</p>
            <p><strong>3. Target:</strong> Fixed 1:2 on TP1 (50% trim) with runners trailed to session high/low.</p>
          </div>
        </div>
      )}

      {/* TAB 5: Common Mistakes */}
      {activeTab === 'mistakes' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-base">Top Institutional Mistakes to Avoid</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-black text-rose-950 block">❌ Mistake #1: Trading Thursday or Friday</span>
              <p className="text-rose-900 font-medium">CBDR probabilities drastically decrease on Thursday and Friday. Stop trading once weekly profit is secured on Mon–Wed.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-black text-rose-950 block">❌ Mistake #2: Entering Major Pairs Without Sweep</span>
              <p className="text-rose-900 font-medium">For Major pairs (EURUSD, GBPUSD, etc.), NEVER enter before Previous Day High or Low is swept.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-black text-rose-950 block">❌ Mistake #3: Missing 1st Imbalance</span>
              <p className="text-rose-900 font-medium">Always take the 1st 15m FVG created in London. Do not wait for 2nd or 3rd FVGs which have significantly lower win rates.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-black text-rose-950 block">❌ Mistake #4: Overtrading After a Win</span>
              <p className="text-rose-900 font-medium">If Monday or Tuesday hits Take Profit (1:3+), you have won your week. Close your charts and enjoy your holiday.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
