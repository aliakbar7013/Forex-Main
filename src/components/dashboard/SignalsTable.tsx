'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Clock,
  BarChart2
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
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <p className="text-slate-500 font-medium">No trading signals match the selected filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Strategy & Day</th>
              <th className="py-3.5 px-4">Trade Started Time</th>
              <th className="py-3.5 px-4">Symbol / Action</th>
              <th className="py-3.5 px-4 font-mono text-amber-900 bg-amber-50/50">Current Running Price</th>
              <th className="py-3.5 px-4 font-mono">Limit Entry</th>
              <th className="py-3.5 px-4 font-mono">Stop Loss</th>
              <th className="py-3.5 px-4 font-mono">Target (TP1)</th>
              <th className="py-3.5 px-4 font-mono">Lot Size</th>
              <th className="py-3.5 px-4 font-mono">Risk %</th>
              <th className="py-3.5 px-4">Validation</th>
              <th className="py-3.5 px-4">Status & Outcome</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {signals.map((s) => {
              const isBuy = s.action === 'BUY';
              const validationStatus = s.validation?.overallStatus || 'PASSED';
              const createdDate = new Date(s.created_at);
              const nyTimeStr = createdDate.toLocaleTimeString('en-US', { 
                timeZone: 'America/New_York', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              });
              const istTimeStr = createdDate.toLocaleTimeString('en-US', { 
                timeZone: 'Asia/Kolkata', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              });

              const { dayName, dateFormatted, fullDateFormatted, isCbdrValid } = getSignalTradingDay(s);
              const todayDayName = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
              const isTodayNonTradingDay = todayDayName === 'Thursday' || todayDayName === 'Friday';

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* Strategy & Day */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{s.strategy}</span>
                      {s.strategy === 'CBDR' && (
                        <>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isMajorPair(s.symbol)
                              ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}>
                            {isMajorPair(s.symbol) ? '⚡ Major' : '🎯 Minor'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                            🔒 1/Day
                          </span>
                        </>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        s.strategy === 'CBDR'
                          ? isCbdrValid 
                            ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        📅 {dayName}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">{dateFormatted}</div>
                  </td>

                  {/* Entry Placed Date & Time */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>{nyTimeStr} NY</span>
                      <span className="text-[10px] text-slate-400 font-normal">({istTimeStr} IST)</span>
                    </div>
                    {s.strategy === 'CBDR' && isTodayNonTradingDay ? (
                      <div className="text-[9px] text-amber-800 font-mono mt-0.5 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 inline-block">
                        Entered {dayName} • Active on {todayDayName}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">
                        {fullDateFormatted}
                      </div>
                    )}
                  </td>

                  {/* Symbol & Action */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono font-bold">
                      <span className="text-slate-900 text-sm">{s.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isBuy ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-rose-100 text-rose-950 border border-rose-300'
                      }`}>
                        {s.action}
                      </span>
                    </div>
                  </td>

                  {/* Current Running Price & Floating Pips */}
                  <td className="py-3 px-4 font-mono whitespace-nowrap bg-slate-50/70">
                    {Boolean(s.raw_payload?.currentPrice) ? (
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-slate-900 font-mono font-black text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded shadow-2xs tabular-nums">
                            {Number(s.raw_payload?.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                          </span>
                        </div>
                        {s.raw_payload?.floatingPips !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              Number(s.raw_payload.floatingPips) >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {Number(s.raw_payload.floatingPips) >= 0 ? '+' : ''}{String(s.raw_payload.floatingPips)} pips
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Syncing...</span>
                    )}
                  </td>

                  {/* Entry (1st Imbalance) */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <div>{s.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-bold w-max">
                        1st Imbalance
                      </span>
                      {Boolean(s.raw_payload?.imbalanceZone) && (
                        <span className="text-[9px] text-slate-600 font-mono bg-slate-100 border border-slate-200 px-1 py-0.2 rounded w-max" title={`FVG: ${s.raw_payload?.imbalanceZone}`}>
                          FVG: {String(s.raw_payload?.imbalanceZone)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SL (London Session Low/High for Majors, Imbalance + Breathing Space for Minors) */}
                  <td className="py-3 px-4 font-mono font-bold text-rose-700 whitespace-nowrap">
                    <div>{s.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded font-bold block mt-0.5 w-max">
                      {String(s.raw_payload?.slPlacementType || (isMajorPair(s.symbol) ? (isBuy ? 'London Session Low' : 'London Session High') : (isBuy ? 'Below Imbalance/FVG' : 'Above Imbalance/FVG')))} ({s.sl_distance_pips_points || 15}p)
                    </span>
                  </td>

                  {/* TP1 (1:3 Target) */}
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    <div>{s.tp1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</div>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-bold block mt-0.5 w-max">
                      1:3 Target (+{((s.sl_distance_pips_points || 15) * 3).toFixed(1)}p)
                    </span>
                  </td>

                  {/* Lots */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {s.calculated_lot_size}
                      </span>
                      <button
                        onClick={() => handleCopyLots(s.id, s.calculated_lot_size)}
                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                        title="Copy Lots"
                      >
                        {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    <div className="text-blue-700 font-bold">{s.risk_percent}% Risk</div>
                    <div className="text-[10px] text-slate-500 font-medium">1:{s.primary_risk_reward || 2.0} RR</div>
                  </td>

                  {/* Validation */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {validationStatus === 'PASSED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {validationStatus === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      {validationStatus === 'FAILED' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      <span className={validationStatus === 'PASSED' ? 'text-emerald-700' : validationStatus === 'WARNING' ? 'text-amber-700' : 'text-rose-700'}>
                        {validationStatus}
                      </span>
                    </div>
                  </td>

                  {/* Status & Outcome */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {s.outcome === 'WIN' || s.status === 'TP1_HIT' || s.status === 'CLOSED_PROFIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                        🎉 WIN (+{s.primary_risk_reward || 3.0}R)
                      </span>
                    ) : s.outcome === 'LOSS' || s.status === 'SL_HIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                        ⚠️ LOSS (-1.0R)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        ⚡ {s.status}
                      </span>
                    )}
                  </td>

                  {/* Actions - Chart */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenChart && (
                        <button
                          onClick={() => onOpenChart(s.symbol, s)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
                          title={`Open Live TradingView Chart for ${s.symbol}`}
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
