'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Plus, ArrowUpRight, ArrowDownRight, Send } from 'lucide-react';
import { StrategyType, TradeAction } from '@/types';
import { soundEngine } from '@/lib/soundEngine';

interface CreateSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignalCreated: () => void;
}

export function CreateSignalModal({
  isOpen,
  onClose,
  onSignalCreated
}: CreateSignalModalProps) {
  const [strategy, setStrategy] = useState<StrategyType>('CBDR');
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('15m');
  const [action, setAction] = useState<TradeAction>('BUY');
  const [entry, setEntry] = useState('1.08500');
  const [sl, setSl] = useState('1.08200');
  const [tp1, setTp1] = useState('1.09100');
  const [tp2, setTp2] = useState('1.09700');
  const [tp3, setTp3] = useState('');
  const [dateOfEntry, setDateOfEntry] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        strategy,
        symbol: symbol.toUpperCase().trim(),
        timeframe,
        action,
        date_of_entry: dateOfEntry,
        entry: parseFloat(entry),
        sl: parseFloat(sl),
        tp1: parseFloat(tp1),
        tp2: tp2 ? parseFloat(tp2) : undefined,
        tp3: tp3 ? parseFloat(tp3) : undefined,
        notes: notes || `Manual setup: ${strategy} on ${symbol}`
      };

      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create signal');
      }

      if (action === 'SELL') {
        soundEngine.playSellSignalChime();
      } else {
        soundEngine.playBuySignalChime();
      }

      onSignalCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
      soundEngine.playWarningSound();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Manual Trading Signal"
      subtitle="Publish a new trading setup with automatic defensive risk and lot size calculation"
      maxWidth="xl"
      icon={<Plus className="w-5 h-5 text-blue-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Strategy & Timeframe */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Strategy Model:
            </label>
            <select
              value={strategy}
              onChange={(e) => {
                const strat = e.target.value as StrategyType;
                setStrategy(strat);
                if (strat === 'CBDR') {
                  setTimeframe('15m');
                  setSymbol('EURUSD');
                } else if (strat === 'STOP_HUNT') {
                  setTimeframe('5m');
                  setSymbol('GBPUSD');
                } else if (strat === 'NEW_YORK') {
                  setTimeframe('1m');
                  setSymbol('NAS100');
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="CBDR">1. CBDR Strategy (15m London 1st FVG)</option>
              <option value="STOP_HUNT">2. Stop Hunt Model (5m Asian Sweep)</option>
              <option value="NEW_YORK">3. New York Strategy (1m/15m Indices)</option>
              <option value="CUSTOM">Custom Strategy</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Timeframe:
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="1m">1m (1-Minute)</option>
              <option value="5m">5m (5-Minute)</option>
              <option value="15m">15m (15-Minute)</option>
              <option value="1h">1h (1-Hour)</option>
              <option value="4h">4h (4-Hour)</option>
              <option value="1D">1D (Daily)</option>
            </select>
          </div>
        </div>

        {/* Symbol & Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Symbol / Pair:
            </label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. EURUSD, NAS100, XAUUSD"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Direction:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('BUY')}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  action === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>BUY</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  action === 'SELL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>SELL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date of Entry */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
            Date of Entry:
          </label>
          <input
            type="date"
            required
            value={dateOfEntry}
            onChange={(e) => setDateOfEntry(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        {/* Stop Hunt Helper Banner */}
        {strategy === 'STOP_HUNT' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <span>🎯 Stop Hunt Model Rules (5-Minute Asian Sweep)</span>
            </div>
            <div className="text-[11px] text-amber-800 space-y-0.5">
              <p>• <strong>Observation</strong>: Asian Killzone (21:00 – 01:00 NY) strictly marks Asian High & Low.</p>
              <p>• <strong>Sweep</strong>: Post-01:00 NY sweep of Asian {action === 'SELL' ? 'HIGH' : 'LOW'} + {action === 'SELL' ? 'Red Bearish' : 'Green Bullish'} CHoCH + FVG.</p>
              <p>• <strong>Stop Loss</strong>: 2–4 pips {action === 'SELL' ? 'above' : 'below'} the 5m FVG imbalance.</p>
              <p>• <strong>Take Profit</strong>: Directly targets opposing Asian {action === 'SELL' ? 'LOW' : 'HIGH'}.</p>
              <p>• <strong>Single Model Rule</strong>: Pairs with an entry already taken under CBDR must not be traded in the Stop Hunt model.</p>
            </div>
          </div>
        )}

        {/* Entry & Stop Loss */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Limit Entry Price:
            </label>
            <input
              type="number"
              step="any"
              required
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">
              Stop Loss (SL):
            </label>
            <input
              type="number"
              step="any"
              required
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="w-full bg-rose-50 border border-rose-300 rounded-xl px-3 py-2 text-xs font-mono text-rose-700 font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Targets (TP1, TP2, TP3) */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-emerald-700 block mb-1">
              TP1 (50% scale):
            </label>
            <input
              type="number"
              step="any"
              required
              value={tp1}
              onChange={(e) => setTp1(e.target.value)}
              className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              TP2 (30% scale):
            </label>
            <input
              type="number"
              step="any"
              value={tp2}
              onChange={(e) => setTp2(e.target.value)}
              placeholder="Optional"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              TP3 (20% Runner):
            </label>
            <input
              type="number"
              step="any"
              value={tp3}
              onChange={(e) => setTp3(e.target.value)}
              placeholder="Optional"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Setup Notes (Optional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 1st London FVG after PDH liquidity run"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-mono font-bold">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Publishing...' : 'Publish Signal'}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
}
