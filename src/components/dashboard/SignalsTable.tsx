'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Clock,
  BarChart2,
  Trophy,
  Skull
} from 'lucide-react';
import { Signal, SignalStatus } from '@/types';
import { getSignalTradingDay, isMajorPair } from '@/lib/strategyValidator';

interface SignalsTableProps {
  signals: Signal[];
  onUpdateStatus?: (id: string, status: SignalStatus, outcome?: 'WIN' | 'LOSS' | 'BE', pnlUsd?: number) => void;
  onDeleteSignal?: (id: string) => void;
  onViewPayload?: (signal: Signal) => void;
  onOpenChart?: (symbol: string, signal?: Signal) => void;
}

export function SignalsTableComponent({
  signals,
  onOpenChart
}: SignalsTableProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyLots = (id: string, lots: number) => {
    navigator.clipboard.writeText(lots.toString());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (signals.length === 0) {
    return (
      <div className="bg-[#0d121f]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-12 text-center shadow-xl">
        <p className="text-slate-400 font-medium">No trading signals match the selected filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d121f]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0a0e19] border-b border-white/[0.08] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Strategy &amp; Day</th>
              <th className="py-3.5 px-4">Execution Window</th>
              <th className="py-3.5 px-4">Symbol / Action</th>
              <th className="py-3.5 px-4 font-mono text-cyan-300">Live Price</th>
              <th className="py-3.5 px-4 font-mono">Limit Entry</th>
              <th className="py-3.5 px-4 font-mono">Stop Loss</th>
              <th className="py-3.5 px-4 font-mono">Target (1:3 TP)</th>
              <th className="py-3.5 px-4 font-mono">Lot Size</th>
              <th className="py-3.5 px-4 font-mono">Risk %</th>
              <th className="py-3.5 px-4">Status &amp; Outcome</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-slate-300 font-mono">
            {signals.map((s) => {
              const isBuy = s.action === 'BUY';
              const { dayName } = getSignalTradingDay(s);

              return (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  
                  {/* Strategy & Day */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-bold text-white">{s.strategy}</span>
                      {s.strategy === 'CBDR' && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isMajorPair(s.symbol)
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        }`}>
                          {isMajorPair(s.symbol) ? '⚡ Major' : '🎯 Minor'}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#141b2d] text-slate-300 border border-white/[0.06]">
                        📅 {dayName}
                      </span>
                    </div>
                  </td>

                  {/* Execution Window */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-cyan-300 font-bold text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{s.session_name || 'London Session'}</span>
                    </div>
                  </td>

                  {/* Symbol & Action */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-white text-sm">{s.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        isBuy 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      }`}>
                        {s.action} {isBuy ? '▲' : '▼'}
                      </span>
                    </div>
                  </td>

                  {/* Current Running Price & Floating Pips */}
                  <td className="py-3 px-4 whitespace-nowrap bg-black/20">
                    {Boolean(s.raw_payload?.currentPrice) ? (
                      <div>
                        <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>{Number(s.raw_payload?.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
                        </div>
                        {s.raw_payload?.floatingPips !== undefined && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black mt-0.5 border ${
                            Number(s.raw_payload.floatingPips) >= 0 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' 
                              : 'bg-rose-950 text-rose-300 border-rose-500/30'
                          }`}>
                            {Number(s.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(s.raw_payload.floatingPips)} pips
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Syncing...</span>
                    )}
                  </td>

                  {/* Limit Entry */}
                  <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                    <div>{s.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[9px] text-cyan-400 font-bold">1st Imbalance</span>
                  </td>

                  {/* SL */}
                  <td className="py-3 px-4 font-bold text-rose-400 whitespace-nowrap">
                    <div>{s.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[9px] text-rose-400/80 font-normal">
                      -{s.sl_distance_pips_points || 15} pips
                    </span>
                  </td>

                  {/* TP1 (1:3 Target) */}
                  <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                    <div>{s.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[9px] text-emerald-400 font-bold">
                      1:3.0 RR (+{((s.sl_distance_pips_points || 15) * 3).toFixed(1)}p)
                    </span>
                  </td>

                  {/* Lots */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-cyan-400 text-sm">
                        {s.calculated_lot_size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLots(s.id, s.calculated_lot_size)}
                        className="text-slate-400 hover:text-white p-0.5 rounded"
                        title="Copy Lots"
                      >
                        {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-cyan-400 font-bold">{s.risk_percent}% Risk</div>
                    <div className="text-[10px] text-slate-400 font-medium">1:{s.primary_risk_reward || 3.0} RR</div>
                  </td>

                  {/* Status & Outcome */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {s.outcome === 'WIN' || s.status === 'TP1_HIT' || s.status === 'CLOSED_PROFIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40 glow-emerald flex items-center gap-1 w-fit">
                        <Trophy className="w-3 h-3 text-emerald-400" />
                        <span>WIN (+{s.primary_risk_reward || 3.0}R)</span>
                      </span>
                    ) : s.outcome === 'LOSS' || s.status === 'SL_HIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-500/40 glow-rose flex items-center gap-1 w-fit">
                        <Skull className="w-3 h-3 text-rose-400" />
                        <span>LOSS (-1.0R)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>{s.status}</span>
                      </span>
                    )}
                  </td>

                  {/* Actions - Chart */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenChart && (
                        <button
                          type="button"
                          onClick={() => onOpenChart(s.symbol, s)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-500/30 text-xs font-bold transition-colors"
                          title={`Open Live TradingView Chart for ${s.symbol}`}
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Chart</span>
                        </button>
                      )}
                    </div>
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

export const SignalsTable = React.memo(SignalsTableComponent);
