'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
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
  ListOrdered
} from 'lucide-react';

interface CbdrStrategyRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CbdrStrategyRulesModal({ isOpen, onClose }: CbdrStrategyRulesModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'entry' | 'pairs_risk' | 'mistakes' | 'stop_hunt'>('overview');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CBDR Strategy — Detailed Institutional Trading Rules"
      subtitle="Complete rulebook derived from TFU detailed notes • 15m Timeframe • London Session • 1:3 to 1:4+ RR"
      maxWidth="4xl"
      icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
    >
      <div className="space-y-5 text-xs text-slate-800">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Overview &amp; Daily Structure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'entry'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Step-by-Step Entry Process</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pairs_risk')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pairs_risk'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>3. Pairs, Risk &amp; RR Targets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mistakes'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>4. Mistakes &amp; Live Examples</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stop_hunt')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stop_hunt'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>5. Stop Hunt Model (5m Asian Sweep)</span>
          </button>
        </div>

        {/* TAB 1: Overview & Daily Structure */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Timeframe</span>
                <span className="font-mono font-black text-sm text-blue-700">15-minute ONLY</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Session Focus</span>
                <span className="font-mono font-black text-sm text-emerald-700">07:00 – 16:00 UTC (03:00 – 12:00 NY / 12:30 – 21:30 IST)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Best Days</span>
                <span className="font-mono font-black text-sm text-purple-700">Mon / Tue / Wed</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">No Trading</span>
                <span className="font-mono font-black text-sm text-rose-700">Thursday &amp; Friday</span>
              </div>
            </div>

            {/* Secret #1: Trading Days & Daily Structure */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Secret #1: Trading Days &amp; Weekly Holiday Protocol</span>
                </h4>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-bold border border-amber-200">
                  Max 3 Trades / Week
                </span>
              </div>

              <p className="text-slate-600 text-[11px] font-medium">
                The core discipline of CBDR is to <strong>stop trading once you hit Take Profit (TP)</strong>. One good setup secures the weekly profit target (4% to 8%+), allowing a 4–7 day holiday.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="p-2.5 font-bold">Trading Day</th>
                      <th className="p-2.5 font-bold">Action Rule</th>
                      <th className="p-2.5 font-bold">If Win (TP Hit)</th>
                      <th className="p-2.5 font-bold">If Loss (SL Hit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">Monday</td>
                      <td className="p-2.5 text-emerald-700 font-bold">Trade (Sweep Sunday Low/High)</td>
                      <td className="p-2.5 text-emerald-700 font-bold">🎉 Holiday Tuesday–Friday</td>
                      <td className="p-2.5 text-amber-700 font-bold">Trade Tuesday</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">Tuesday</td>
                      <td className="p-2.5 text-blue-700 font-bold">Only if Monday SL hit</td>
                      <td className="p-2.5 text-emerald-700 font-bold">🎉 Holiday Wednesday–Friday</td>
                      <td className="p-2.5 text-amber-700 font-bold">Trade Wednesday</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">Wednesday</td>
                      <td className="p-2.5 text-blue-700 font-bold">Only if Tuesday SL hit</td>
                      <td className="p-2.5 text-emerald-700 font-bold">🎉 Holiday</td>
                      <td className="p-2.5 text-rose-700 font-bold">🛑 Week is Over (No more trades)</td>
                    </tr>
                    <tr className="bg-rose-50/50 hover:bg-rose-50">
                      <td className="p-2.5 font-bold text-rose-900">Thursday</td>
                      <td className="p-2.5 text-rose-700 font-bold" colSpan={3}>🚫 NO TRADING — Study retailer behavior</td>
                    </tr>
                    <tr className="bg-rose-50/50 hover:bg-rose-50">
                      <td className="p-2.5 font-bold text-rose-900">Friday</td>
                      <td className="p-2.5 text-rose-700 font-bold" colSpan={3}>🚫 NO TRADING — Study retailer behavior</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Secret #2: London vs New York */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-blue-600" />
                Secret #2: London vs New York Session Dynamics
              </h4>
              <ul className="space-y-1.5 text-slate-700 text-[11px]">
                <li>• <strong>London = Strongest session globally</strong> (sets true weekly direction, not New York).</li>
                <li>• <strong>GBP = 6th strongest currency</strong> (USD is 10th). Institutional money flows first in London.</li>
                <li>• <strong>Underground transatlantic cable</strong> connects LSE &rarr; NYSE, transmitting confidential daily order flow.</li>
                <li>• <em>&quot;London sets the tone of the week.&quot;</em> Reliable institutional moves without US manipulation whipsaws.</li>
              </ul>
            </div>

          </div>
        )}

        {/* TAB 2: Step-by-Step Entry Process */}
        {activeTab === 'entry' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Step 1 to Step 6 */}
            <div className="space-y-3">
              
              {/* Step 1 & 2 */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-mono text-[10px]">1</span>
                  <span>Chart Setup &amp; Mark Previous Day High / Low</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong className="text-slate-900 block mb-1">Indicator Setup (Sessions &amp; SMC by LuxAlgo):</strong>
                    <div>• <strong>Sessions:</strong> LuxAlgo Session B (London) • Hours: <span className="text-emerald-700 font-bold">0700-1600</span> UTC (03:00 AM – 12:00 PM NY / 12:30 PM – 09:30 PM IST)</div>
                    <div>• <strong>SMC:</strong> Enable <span className="text-blue-700 font-bold">Fair Value Gaps (15m)</span> • Extend FVG: <strong>3</strong> • Enable <span className="text-purple-700 font-bold">Daily PDH/PDL</span></div>
                    <div>• <strong>Daily Dividers:</strong> Enabled (Mon–Sun vertical lines)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                    <strong className="text-slate-900 block mb-1 font-sans">Daily Markings:</strong>
                    <div>• <strong>Monday:</strong> Mark High/Low from <span className="text-blue-700 font-bold">Sunday</span></div>
                    <div>• <strong>Tuesday:</strong> Mark High/Low from <span className="text-blue-700 font-bold">Monday</span></div>
                    <div>• <strong>Wednesday:</strong> Mark High/Low from <span className="text-blue-700 font-bold">Tuesday</span></div>
                  </div>
                </div>
              </div>

              {/* Step 2: Major vs Minor Pairs Liquidity Sweep Rule */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-mono text-[10px]">2</span>
                    <span>Major vs Minor Pairs Rule (Liquidity Sweep Distinction)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-300">
                    Core Algorithmic Rule
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* Major Pairs Rule */}
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-indigo-900">🏛️ Major Pairs (Must Follow PDH/PDL Sweep):</strong>
                      <span className="text-[9px] bg-indigo-200/80 px-1.5 py-0.2 rounded font-black text-indigo-900">SWEEP REQUIRED</span>
                    </div>
                    <p className="text-[10px] text-indigo-900 font-medium">
                      <em>EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD</em>
                    </p>
                    <ul className="space-y-0.5 text-[10px] text-indigo-800 list-disc list-inside">
                      <li><strong>BUY:</strong> Price <strong>MUST sweep Previous Day Low (PDL)</strong> to clear sell-side liquidity before London shift &amp; 1st FVG entry.</li>
                      <li><strong>SELL:</strong> Price <strong>MUST sweep Previous Day High (PDH)</strong> to clear buy-side liquidity before London shift &amp; 1st FVG entry.</li>
                    </ul>
                  </div>

                  {/* Minor Pairs Rule */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-emerald-900">🎯 Minor / Cross Pairs (No PDH/PDL Sweep):</strong>
                      <span className="text-[9px] bg-emerald-200/80 px-1.5 py-0.2 rounded font-black text-emerald-900">NO SWEEP NEEDED</span>
                    </div>
                    <p className="text-[10px] text-emerald-900 font-medium">
                      <em>GBPNZD, EURGBP, EURJPY, GBPJPY, AUDNZD, CADJPY, GBPCHF, etc.</em>
                    </p>
                    <ul className="space-y-0.5 text-[10px] text-emerald-800 list-disc list-inside">
                      <li><strong>DO NOT follow Previous Day High/Low sweep.</strong></li>
                      <li>Enter <strong>directly on the 1st Imbalance (15m FVG)</strong> formed during London session (07:00 – 16:00 UTC / 03:00 – 12:00 NY / 12:30 – 21:30 IST).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 3: Identify FIRST Imbalance (CRITICAL) */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-mono text-[10px]">3</span>
                    <span className="text-amber-950">Enter on FIRST Imbalance (15m London FVG)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[10px] font-bold border border-rose-300">
                    NO 2nd or 3rd Imbalance Entries!
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  <strong>Both Major and Minor pairs execute strictly on the 1st Imbalance of the London session (07:00 - 16:00 UTC / 03:00 - 12:00 NY).</strong>
                  <br />• <strong>Buy:</strong> Enter limit order at <span className="text-emerald-800 font-bold">1st Bullish 15m FVG</span> base/top.
                  <br />• <strong>Sell:</strong> Enter limit order at <span className="text-rose-800 font-bold">1st Bearish 15m FVG</span> base/top.
                </p>
              </div>

              {/* Step 5 & 6: Entry Execution & Management */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono text-[10px]">4</span>
                  <span>Entry Execution &amp; &quot;Set and Forget&quot; Trade Management</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Execution:</strong>
                    <div>• <strong>Entry:</strong> Limit order at 1st FVG level</div>
                    <div>• <strong>Stop Loss (Buy):</strong> Below London session low</div>
                    <div>• <strong>Stop Loss (Sell):</strong> Above London session high</div>
                    <div>• <strong>Take Profit:</strong> Nearby liquidity (1:3 to 1:4 minimum)</div>
                    <div>• <strong>Bonus Confluence:</strong> BPR (Break, Pullback, Retest)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Management Protocol:</strong>
                    <div>• <strong>After TP1 Hit:</strong> Move SL to Breakeven (BE)</div>
                    <div>• <strong>Extend Runner:</strong> Target higher liquidity on 1H/4H (up to 1:7 RR)</div>
                    <div>• <strong>If Price Returns:</strong> Zero loss, profit secured</div>
                    <div>• <strong>Set and Forget:</strong> Don&apos;t watch chart &bull; Avoid emotion</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: Pair Selection & Risk Targets */}
        {activeTab === 'pairs_risk' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Optimal Approach Strip */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Optimal Approach: Buy One Pair + Sell Another on Same Day</span>
              </h4>
              <p className="text-emerald-900 text-xs font-medium">
                Example: <strong>USDJPY Buy (4%) + EURUSD Sell (4%) &rarr; 8% total in 1 single day!</strong>
                <br />Primary Focus: <strong>EUR &amp; GBP pairs</strong> (directly tied to London session flow).
              </p>
            </div>

            {/* Risk & Return Rules Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider block">
                  Risk Management Rules
                </span>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">Max Trades / Week:</span>
                    <strong className="text-slate-900">3 (Mon–Wed)</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">Target per Trade:</span>
                    <strong className="text-emerald-700">4% Target</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">Prop Firm Friendly:</span>
                    <strong className="text-blue-700">Clear challenges in 2 days</strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider block">
                  Risk-Reward Expectations
                </span>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">Minimum RR:</span>
                    <strong className="text-emerald-700">1:3 or 1:4 RR</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">With Execution / Runner:</span>
                    <strong className="text-purple-700">Up to 1:7 RR</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-sans">Extreme Hold Example:</span>
                    <strong className="text-amber-700">1:106 RR (Jan &rarr; Mar/Apr)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Scope */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
              <strong className="text-slate-900 block">All Pairs &amp; Markets Supported:</strong>
              <div>• Forex Majors &amp; Crosses (GBPUSD, EURUSD, USDJPY, GBPJPY, EURJPY, GBPCHF, EURCHF, etc.)</div>
              <div>• Commodities (XAUUSD Gold, Crude Oil) &bull; US Indices (NAS100, SPX500, US30)</div>
              <div>• Indian MCX commodities also respect London session timings.</div>
              <div>• <strong>Always follow IPDA direction for macro directional bias!</strong></div>
            </div>

          </div>
        )}

        {/* TAB 4: Mistakes to Avoid & Live Examples */}
        {activeTab === 'mistakes' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Common Mistakes Table */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Common Mistakes to Avoid &amp; Penalties
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="p-2 font-bold">Mistake</th>
                      <th className="p-2 font-bold">Result / Impact</th>
                      <th className="p-2 font-bold">Rule Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Taking 2nd / 3rd Imbalance</td>
                      <td className="p-2 text-slate-600">Lower accuracy &amp; false retests</td>
                      <td className="p-2 font-bold text-slate-900">Wait strictly for 1st FVG only</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Entry outside London session</td>
                      <td className="p-2 text-slate-600">Invalid setup / lack of institutional volume</td>
                      <td className="p-2 font-bold text-slate-900">Enter strictly 07:00 – 16:00 UTC / 03:00 AM – 12:00 PM NY (12:30 PM – 09:30 PM IST)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Trading Thursday or Friday</td>
                      <td className="p-2 text-slate-600">Late-week consolidation whipsaws</td>
                      <td className="p-2 font-bold text-slate-900">No trading (Study days)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Not waiting for London open</td>
                      <td className="p-2 text-slate-600">Premature entry caught in sweep</td>
                      <td className="p-2 font-bold text-slate-900">Wait for London Judas sweep after 03:00 AM NY (12:30 PM IST / 07:00 UTC)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Using other timeframes (5m, 1m)</td>
                      <td className="p-2 text-slate-600">Breaks core CBDR 15m logic</td>
                      <td className="p-2 font-bold text-slate-900">15-minute timeframe ONLY</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Moving SL after entry (prematurely)</td>
                      <td className="p-2 text-slate-600">Risk management violation</td>
                      <td className="p-2 font-bold text-slate-900">Move SL to BE ONLY after TP1 hit</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-rose-700">Entry after 12:00 PM NY (16:00 UTC)</td>
                      <td className="p-2 text-slate-600">Missed institutional order flow window</td>
                      <td className="p-2 font-bold text-slate-900">Last entry strictly before 12:00 PM NY / 16:00 UTC (09:30 PM IST)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation Live Examples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 space-y-1.5">
                <span className="font-bold text-xs text-emerald-900 block">Example 1: USDJPY Buy (20th Oct)</span>
                <div className="text-[11px] space-y-0.5">
                  <div>• Swept Sunday low</div>
                  <div>• 1st bullish FVG in London</div>
                  <div>• BPR (Break, Pullback, Retest) confluence</div>
                  <div>• <strong>Result:</strong> 4% target &rarr; Extended runner to <strong>1:7 RR</strong></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-950 space-y-1.5">
                <span className="font-bold text-xs text-blue-900 block">Example 2: EURUSD Sell (Same Day)</span>
                <div className="text-[11px] space-y-0.5">
                  <div>• Swept Previous Day high</div>
                  <div>• 1st bearish FVG in London</div>
                  <div>• Confluence with IPDA interest rate bias</div>
                  <div>• <strong>Result:</strong> 4% gain &rarr; <strong>8% total portfolio gain in 1 day!</strong></div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: Stop Hunt Model (5m Asian Sweep) */}
        {activeTab === 'stop_hunt' && (
          <div className="space-y-4">
            
            {/* Model Architecture Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-mono text-[10px] font-bold">
                  MODEL #2
                </span>
                <span className="font-black text-slate-900 text-sm">
                  ICT Stop Hunt 5m Model (Asian Range Liquidity Sweep)
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                Built on smart money engineering liquidity around the <strong>Asian Killzone (21:00 – 01:00 NY)</strong>.
                Price sweeps the Asian range extreme, shifts market structure (CHoCH) on the 5-minute timeframe,
                prints a Fair Value Gap (FVG), and distributes into the <strong>Opposing Asian extreme level</strong>.
              </p>
            </div>

            {/* Core Strategy Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>1. Observation vs. Trading Timings</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="p-2 rounded-lg bg-pink-50 border border-pink-200 text-pink-950 font-medium">
                    <strong>Asian Killzone (21:00 – 01:00 NY):</strong> Observation ONLY (No Trading). Mark the highest high and lowest low of this session.
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                    <strong>Trading Execution (After 01:00 NY):</strong> Price must sweep the Asian level after the killzone ends. If no sweep today, wait for tomorrow!
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium">
                    <strong>Trading Days:</strong> Active all week from <strong>Monday to Friday</strong>.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>2. Stop Loss &amp; Take Profit Rules</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 font-medium">
                    <strong>Stop Loss Placement:</strong> Placed strictly <strong>2 to 4 pips</strong> above/below the 5-minute Fair Value Gap (FVG / Imbalance).
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                    <strong>Take Profit Target:</strong> Targets the <strong>Opposing Asian Killzone Level</strong>! (Sell targets Asian Low, Buy targets Asian High).
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-950 font-medium">
                    <strong>Macro IPDA Alignment:</strong> Must align with Central Bank interest rate bias (e.g., EURUSD = Sell Only, USDJPY = Buy Only).
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Execution Cards (SELL vs BUY) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* SELL SETUP */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                  <span>Bearish Setup (SELL) — e.g. EURUSD</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-rose-950">
                  <div>1. <strong>IPDA Bias:</strong> Must be SELL ONLY (Rate Ratio &lt; 1.0).</div>
                  <div>2. <strong>Level Marked:</strong> High of Asian Killzone (21:00 – 01:00 NY).</div>
                  <div>3. <strong>Sweep:</strong> Price sweeps above Asian High after 01:00 NY.</div>
                  <div>4. <strong>Shift:</strong> Red Bearish CHoCH appears on 5-minute chart.</div>
                  <div>5. <strong>Imbalance:</strong> Bearish 5m Fair Value Gap (FVG) forms.</div>
                  <div>6. <strong>Entry:</strong> Limit or market order on the 5m FVG.</div>
                  <div>7. <strong>Stop Loss:</strong> 2–4 pips above the Bearish FVG.</div>
                  <div>8. <strong>Take Profit:</strong> Directly at the <strong>Asian Killzone LOW</strong>!</div>
                </div>
              </div>

              {/* BUY SETUP */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>Bullish Setup (BUY) — e.g. USDJPY</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-emerald-950">
                  <div>1. <strong>IPDA Bias:</strong> Must be BUY ONLY (Rate Ratio &gt; 1.0).</div>
                  <div>2. <strong>Level Marked:</strong> Low of Asian Killzone (21:00 – 01:00 NY).</div>
                  <div>3. <strong>Sweep:</strong> Price sweeps below Asian Low after 01:00 NY.</div>
                  <div>4. <strong>Shift:</strong> Green Bullish CHoCH appears on 5-minute chart.</div>
                  <div>5. <strong>Imbalance:</strong> Bullish 5m Fair Value Gap (FVG) forms.</div>
                  <div>6. <strong>Entry:</strong> Limit or market order on the 5m FVG.</div>
                  <div>7. <strong>Stop Loss:</strong> 2–4 pips below the Bullish FVG.</div>
                  <div>8. <strong>Take Profit:</strong> Directly at the <strong>Asian Killzone HIGH</strong>!</div>
                </div>
              </div>

            </div>

            {/* Indicators Setup Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 space-y-2 font-mono text-[11px]">
              <div className="text-amber-400 font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>TradingView LuxAlgo Indicator Settings for Stop Hunt Model:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                <div className="space-y-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-white font-bold">ICT Killzones [LuxAlgo]:</div>
                  <div>• Asian Session: Checked (2100-0100 NY)</div>
                  <div>• Show Retracements: Enabled</div>
                  <div>• Extend: Enabled</div>
                  <div>• Fib 0 (Low): Enabled (Black)</div>
                  <div>• Fib 1 (High): Enabled (Black)</div>
                  <div>• All other Fibs: Unchecked</div>
                </div>
                <div className="space-y-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-white font-bold">Smart Money Concepts [LuxAlgo]:</div>
                  <div>• Timeframe: 5-minute (5m)</div>
                  <div>• Internal Structure: CHoCH only</div>
                  <div>• Bullish CHoCH: #089981 (Green)</div>
                  <div>• Bearish CHoCH: #F23645 (Red)</div>
                  <div>• Fair Value Gaps (FVG): Enabled (Extend: 1)</div>
                  <div>• Confluence Filter: Unchecked</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer Note */}
        <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-center font-medium text-xs flex items-center justify-center gap-2 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>&quot;One good CBDR trade can change your week. Master the rules. Trade less. Win more.&quot;</span>
        </div>

      </div>
    </Modal>
  );
}
