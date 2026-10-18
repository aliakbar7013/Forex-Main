'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PlusCircle, Save, Calendar } from 'lucide-react';
import { StrategyType, TradeAction } from '@/types';

interface LogBacktestTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTradeAdded: () => void;
}

export function LogBacktestTradeModal({ isOpen, onClose, onTradeAdded }: LogBacktestTradeModalProps) {
  const [strategy, setStrategy] = useState<StrategyType>('CBDR');
  const [symbol, setSymbol] = useState('EURUSD');
  const [action, setAction] = useState<TradeAction>('SELL');
  const [timeframe, setTimeframe] = useState('15m');
  const [entry, setEntry] = useState('1.08500');
  const [sl, setSl] = useState('1.08800');
  const [tp1, setTp1] = useState('1.07900');
  const [tp2, setTp2] = useState('1.07300');
  const [riskPercent, setRiskPercent] = useState('1.0');
  const [calculatedLotSize, setCalculatedLotSize] = useState('1.67');
  const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'BE'>('WIN');
  const [riskReward, setRiskReward] = useState('2.0');
  const [tradingDay, setTradingDay] = useState('Monday');
  const [session, setSession] = useState('London');
  const [dateExecuted, setDateExecuted] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('CBDR London PDH sweep entry on 1st FVG with mandatory bearish yield ratio.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        strategy,
        symbol: symbol.toUpperCase().trim(),
        action,
        timeframe,
        entry: parseFloat(entry),
        sl: parseFloat(sl),
        tp1: parseFloat(tp1),
        tp2: tp2 ? parseFloat(tp2) : undefined,
        risk_percent: parseFloat(riskPercent),
        risk_amount_usd: 500,
        calculated_lot_size: parseFloat(calculatedLotSize),
        outcome,
        realized_pnl: outcome === 'WIN' ? 1000 : outcome === 'LOSS' ? -500 : 0,
        riskRewardAchieved: parseFloat(riskReward),
        trading_day: tradingDay,
        session,
        date_executed: dateExecuted,
        notes
      };

      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onTradeAdded();
        onClose();
      }
    } catch (err) {
      console.error('Failed to log backtest trade', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Historical Backtest Trade"
      subtitle="Record a manual backtest setup into the permanent trade database to test strategy win rate & edge"
      maxWidth="2xl"
      icon={<PlusCircle className="w-5 h-5 text-purple-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Strategy & Instrument */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Strategy Model</label>
            <select
              value={strategy}
              onChange={e => {
                const s = e.target.value as StrategyType;
                setStrategy(s);
                if (s === 'CBDR') { setTimeframe('15m'); setSession('London'); }
                else if (s === 'STOP_HUNT') { setTimeframe('5m'); setSession('Post-Asian'); }
                else if (s === 'NEW_YORK') { setTimeframe('1m'); setSession('NY Open'); setSymbol('NAS100'); }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="CBDR">1. CBDR Strategy (15m London Mon–Wed)</option>
              <option value="STOP_HUNT">2. Stop Hunt Model (5m Asian Sweep)</option>
              <option value="NEW_YORK">3. New York Strategy (1m Indices)</option>
              <option value="CUSTOM">Custom Strategy</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Symbol / Pair</label>
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-blue-500 focus:bg-white"
              placeholder="EURUSD"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Order Direction</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value as TradeAction)}
              className={`w-full border rounded-xl px-3 py-2 font-bold ${
                action === 'BUY' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <option value="BUY">BUY (Long) ▲</option>
              <option value="SELL">SELL (Short) ▼</option>
            </select>
          </div>
        </div>

        {/* Trading Day & Session */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Trading Day
            </label>
            <select
              value={tradingDay}
              onChange={e => setTradingDay(e.target.value)}
              className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 font-semibold ${
                strategy === 'CBDR' && (tradingDay === 'Thursday' || tradingDay === 'Friday')
                  ? 'border-rose-300 text-rose-900 bg-rose-50'
                  : 'border-slate-300'
              }`}
            >
              <option value="Monday">Monday (CBDR Permitted ✅)</option>
              <option value="Tuesday">Tuesday (CBDR Permitted ✅)</option>
              <option value="Wednesday">Wednesday (CBDR Permitted ✅)</option>
              <option value="Thursday">Thursday (CBDR Blocked 🚫)</option>
              <option value="Friday">Friday (CBDR Blocked 🚫)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Execution Date</label>
            <input
              type="date"
              value={dateExecuted}
              onChange={e => setDateExecuted(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Session Window (NY / IST)</label>
            <input
              type="text"
              value={session}
              onChange={e => setSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              placeholder="London (07:00 - 16:00 UTC / 03:00 - 12:00 NY / 12:30 - 09:30 PM IST)"
            />
          </div>
        </div>

        {/* Price Levels */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Entry Price</label>
            <input
              type="number"
              step="any"
              value={entry}
              onChange={e => setEntry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-rose-700 font-bold mb-1">Stop Loss (SL)</label>
            <input
              type="number"
              step="any"
              value={sl}
              onChange={e => setSl(e.target.value)}
              className="w-full bg-rose-50 border border-rose-300 rounded-xl px-3 py-2 text-rose-700 font-mono font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-emerald-700 font-bold mb-1">Take Profit (TP1)</label>
            <input
              type="number"
              step="any"
              value={tp1}
              onChange={e => setTp1(e.target.value)}
              className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-700 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Take Profit 2</label>
            <input
              type="number"
              step="any"
              value={tp2}
              onChange={e => setTp2(e.target.value)}
              placeholder="Optional"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Outcome & R:R */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Trade Outcome</label>
            <select
              value={outcome}
              onChange={e => {
                const out = e.target.value as 'WIN' | 'LOSS' | 'BE';
                setOutcome(out);
                if (out === 'WIN') setRiskReward('2.0');
                else if (out === 'LOSS') setRiskReward('-1.0');
                else setRiskReward('0.0');
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
            >
              <option value="WIN">WIN (Profit Target Hit)</option>
              <option value="LOSS">LOSS (Stop Hit)</option>
              <option value="BE">BE (Break-Even)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">R:R Ratio Achieved</label>
            <input
              type="number"
              step="any"
              value={riskReward}
              onChange={e => setRiskReward(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-blue-700 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Calculated Lots</label>
            <input
              type="number"
              step="any"
              value={calculatedLotSize}
              onChange={e => setCalculatedLotSize(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-slate-700 font-bold mb-1">Backtest Notes & Confluences</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            placeholder="Explain why trade was entered, FVG, liquidity sweep, or why trade failed..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Backtest Trade'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
