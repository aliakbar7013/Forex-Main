'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ListFilter, Trophy, Skull, RotateCw } from 'lucide-react';
import { TradeLog, WebhookLog } from '@/types';

interface ActivityLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogsDrawer({ isOpen, onClose }: ActivityLogsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'trades' | 'webhooks'>('trades');
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs?type=all&limit=50');
      const data = await res.json();
      if (data.tradeLogs) setTradeLogs(data.tradeLogs);
      if (data.webhookLogs) setWebhookLogs(data.webhookLogs);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Audit & Trade Execution Logs"
      subtitle="Complete ledger of trade balance transitions and raw webhook reception logs"
      maxWidth="4xl"
      icon={<ListFilter className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-4">
        
        {/* Tab Controls & Refresh */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('trades')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'trades'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Trade Ledger ({tradeLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'webhooks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Webhook Audit Logs ({webhookLogs.length})
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tab 1: Trade Logs */}
        {activeTab === 'trades' && (
          <div className="overflow-x-auto max-h-[60vh] border border-slate-200 rounded-xl">
            {tradeLogs.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs font-medium">
                No trades have been closed yet. Mark live signals as Win or Loss to record execution logs.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Symbol & Model</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Resulting Risk Tier</th>
                    <th className="py-2.5 px-3 font-mono">Loss Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {tradeLogs.map((log) => {
                    const isWin = log.outcome === 'WIN';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                          <span className="text-slate-900">{log.symbol}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-normal font-sans">({log.strategy})</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 font-bold ${isWin ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isWin ? <Trophy className="w-3.5 h-3.5 text-emerald-600" /> : <Skull className="w-3.5 h-3.5 text-rose-600" />}
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.defensive_state_after === 'DEFENSIVE' 
                              ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                              : log.defensive_state_after === 'REDUCED'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {log.defensive_state_after}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 font-bold whitespace-nowrap">
                          {log.consecutive_losses_after} Losses
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Webhook Audit Logs */}
        {activeTab === 'webhooks' && (
          <div className="overflow-x-auto max-h-[60vh] border border-slate-200 rounded-xl">
            {webhookLogs.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs font-medium">
                No webhooks logged yet. Use the Webhook Simulator or trigger a TradingView alert.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Symbol & Action</th>
                    <th className="py-2.5 px-3">Calculated Lots</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {webhookLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {log.strategy}
                      </td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <span className="text-slate-900 font-bold">{log.symbol}</span>
                        <span className="text-blue-700 font-bold ml-1.5">{log.action}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {log.lot_size} Lots
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'PROCESSED' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {log.status} {log.errors_count > 0 ? `(${log.errors_count} warnings)` : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
