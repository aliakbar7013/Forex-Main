'use client';

import React from 'react';
import { 
  Copy, 
  Check, 
  Clock,
  Calendar,
  BarChart2,
  Trophy,
  Skull,
  Star
} from 'lucide-react';
import { Signal, SignalStatus } from '@/types';
import { getSignalTradingDay, isMajorPair } from '@/lib/strategyValidator';

interface SignalsTableProps {
  signals: Signal[];
  onUpdateStatus?: (id: string, status: SignalStatus, outcome?: 'WIN' | 'LOSS' | 'BE', pnlUsd?: number) => void;
  onDeleteSignal?: (id: string) => void;
  onViewPayload?: (signal: Signal) => void;
  onOpenChart?: (symbol: string, signal?: Signal) => void;
  isFavorite?: (symbol: string) => boolean;
  onToggleFavorite?: (symbol: string) => void;
}

export function SignalsTableComponent({
  signals,
  onOpenChart,
  isFavorite,
  onToggleFavorite
}: SignalsTableProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyLots = (id: string, lots: number) => {
    navigator.clipboard.writeText(lots.toString());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (signals.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <p className="text-slate-500 font-medium text-xs">No active signals match the selected filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4 font-sans">Date of Entry</th>
              <th className="py-3 px-4">Strategy &amp; Day</th>
              <th className="py-3 px-4">Window</th>
              <th className="py-3 px-4">Symbol / Action</th>
              <th className="py-3 px-4 font-mono">Running Price</th>
              <th className="py-3 px-4 font-mono">Limit Entry</th>
              <th className="py-3 px-4 font-mono">Stop Loss</th>
              <th className="py-3 px-4 font-mono">Target (1:3 TP)</th>
              <th className="py-3 px-4 font-mono">Lot Size</th>
              <th className="py-3 px-4 font-mono">Risk %</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
            {signals.map((s) => {
              const isBuy = s.action === 'BUY';
              const { dayName } = getSignalTradingDay(s);

              const rawDateStr = s.date_of_entry || s.created_at;
              const createdDate = new Date(rawDateStr);
              const isValidDate = !isNaN(createdDate.getTime());
              const entryIsoDate = s.date_of_entry || (isValidDate ? createdDate.toISOString().split('T')[0] : (s.created_at ? s.created_at.split('T')[0] : ''));
              const entryDateFormatted = isValidDate ? createdDate.toLocaleDateString('en-US', { 
                timeZone: 'America/New_York', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }) : entryIsoDate;
              const nyTime = isValidDate ? createdDate.toLocaleTimeString('en-US', { 
                timeZone: 'America/New_York', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              }) : '';
              const istTime = isValidDate ? createdDate.toLocaleTimeString('en-US', { 
                timeZone: 'Asia/Kolkata', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              }) : '';
              const timeFormatted = nyTime && istTime ? `${nyTime} NY • ${istTime} IST` : '';

              return (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  
                  {/* Date of Entry */}
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <div className="text-slate-900 font-bold text-xs flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{entryIsoDate}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      <span>{entryDateFormatted}</span>
                    </div>
                  </td>

                  {/* Strategy & Day */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-semibold text-slate-900">{s.strategy}</span>
                      {s.strategy === 'CBDR' && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          isMajorPair(s.symbol)
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isMajorPair(s.symbol) ? 'Major (Sweep)' : '🎯 Minor (1st Imbalance)'}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                        {dayName}
                      </span>
                    </div>
                  </td>

                  {/* Execution Window */}
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <div className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{s.session_name || 'London Session'}</span>
                    </div>
                    {timeFormatted && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {timeFormatted}
                      </div>
                    )}
                  </td>

                  {/* Symbol & Action */}
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <div className="flex items-center gap-1.5 font-bold">
                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(s.symbol);
                          }}
                          className="p-1 rounded-md hover:bg-slate-100 transition-colors group cursor-pointer"
                          title={isFavorite?.(s.symbol) ? `Remove ${s.symbol} from favorites` : `Star ${s.symbol} as favorite`}
                        >
                          <Star className={`w-3.5 h-3.5 transition-transform group-hover:scale-115 ${
                            isFavorite?.(s.symbol) ? 'text-amber-500 fill-amber-400' : 'text-slate-300 group-hover:text-amber-500'
                          }`} />
                        </button>
                      )}
                      <span className="text-slate-900 text-sm font-mono">{s.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isBuy 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {s.action} {isBuy ? '▲' : '▼'}
                      </span>
                      {isFavorite?.(s.symbol) && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                          FAV
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Current Running Price & Floating Pips */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {Boolean(s.raw_payload?.currentPrice) ? (
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>{Number(s.raw_payload?.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</span>
                        </div>
                        {s.raw_payload?.floatingPips !== undefined && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold mt-0.5 border ${
                            Number(s.raw_payload.floatingPips) >= 0 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {Number(s.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(s.raw_payload.floatingPips)} pips
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Syncing...</span>
                    )}
                  </td>

                  {/* Limit Entry */}
                  <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                    <div>{s.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[10px] text-slate-500 font-medium font-sans">
                      {s.strategy === 'CBDR' && !isMajorPair(s.symbol) ? '1st London Imbalance' : '1st FVG'}
                    </span>
                  </td>

                  {/* SL */}
                  <td className="py-3 px-4 font-bold text-rose-600 whitespace-nowrap">
                    <div>{s.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[10px] text-rose-500 font-medium font-sans">
                      -{s.sl_distance_pips_points || 15} pips
                    </span>
                  </td>

                  {/* TP1 (1:3 Target) */}
                  <td className="py-3 px-4 font-bold text-emerald-600 whitespace-nowrap">
                    <div>{s.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold font-sans">
                      1:3.0 RR (+{((s.sl_distance_pips_points || 15) * 3).toFixed(1)}p)
                    </span>
                  </td>

                  {/* Lots */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-sm">
                        {s.calculated_lot_size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLots(s.id, s.calculated_lot_size)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                        title="Copy Lots"
                      >
                        {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <div className="text-slate-700 font-semibold">{s.risk_percent}% Risk</div>
                    <div className="text-[10px] text-slate-400 font-medium">1:{s.primary_risk_reward || 3.0} RR</div>
                  </td>

                  {/* Status & Outcome */}
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    {s.outcome === 'WIN' || s.status === 'TP1_HIT' || s.status === 'CLOSED_PROFIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit shadow-xs">
                        <Trophy className="w-3 h-3 text-emerald-600" />
                        <span>WIN (+{s.primary_risk_reward || 3.0}R)</span>
                      </span>
                    ) : s.outcome === 'LOSS' || s.status === 'SL_HIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit shadow-xs">
                        <Skull className="w-3 h-3 text-rose-600" />
                        <span>LOSS (-1.0R)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        <span>{s.status}</span>
                      </span>
                    )}
                  </td>

                  {/* Actions - Chart */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenChart && (
                        <button
                          type="button"
                          onClick={() => onOpenChart(s.symbol, s)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
                          title={`Open Live Chart for ${s.symbol}`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
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
