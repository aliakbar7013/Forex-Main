'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Terminal, Send, CheckCircle2, XCircle, Code } from 'lucide-react';
import { soundEngine } from '@/lib/soundEngine';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignalCreated?: () => void;
}

export function WebhookSimulatorModal({
  isOpen,
  onClose,
  onSignalCreated
}: WebhookSimulatorModalProps) {
  const presets = [
    {
      id: 'gold_sell_valid',
      name: '🥇 XAUUSD SELL (Valid IPDA Bearish)',
      category: 'Commodity',
      statusType: 'success',
      description: 'Gold CHF proxy (0.50%) / USD (4.50%) = 0.111 (< 1.0) -> Strictly SELL ONLY',
      payload: {
        strategy: 'Stop Hunt',
        symbol: 'XAUUSD',
        timeframe: '5m',
        action: 'SELL',
        entry: 2650.00,
        sl: 2660.00,
        tp1: 2630.00,
        tp2: 2610.00,
        tp3: 2590.00,
        session: 'London',
        asian_kz_completed: true,
        choch_confirmed: true,
        bpr_confirmed: true,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'Gold Stop Hunt: Asian high swept, bearish CHOCH, aligns with IPDA CHF/USD < 1.0 yield ratio.'
      }
    },
    {
      id: 'gold_buy_rejected',
      name: '🥇 XAUUSD BUY (Auto-Rejected by IPDA Filter)',
      category: 'Commodity',
      statusType: 'error',
      description: 'Violates IPDA: Ratio 0.111 < 1.0 forbids BUY orders on Gold',
      payload: {
        strategy: 'Stop Hunt',
        symbol: 'XAUUSD',
        timeframe: '5m',
        action: 'BUY', // Forbidden by IPDA Engine!
        entry: 2650.00,
        sl: 2640.00,
        tp1: 2670.00,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'Test: Trigger strict IPDA interceptor rejection for attempting BUY on Bearish Gold ratio.'
      }
    },
    {
      id: 'usdjpy_buy_valid',
      name: 'USDJPY BUY (Valid IPDA Bullish)',
      category: 'Major',
      statusType: 'success',
      description: 'Fed (4.50%) / BoJ (0.25%) = 18.000 (> 1.0) -> Strictly BUY ONLY',
      payload: {
        strategy: 'CBDR',
        symbol: 'USDJPY',
        timeframe: '15m',
        action: 'BUY',
        entry: 154.50,
        sl: 154.10,
        tp1: 155.30,
        tp2: 156.00,
        session: 'London',
        liquidity_sweep: true,
        fvg_number: 1,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'USDJPY CBDR London: Aligns with strong positive Fed/BoJ interest rate differential.'
      }
    },
    {
      id: 'usdjpy_sell_rejected',
      name: 'USDJPY SELL (Auto-Rejected by IPDA Filter)',
      category: 'Major',
      statusType: 'error',
      description: 'Violates IPDA: Ratio 18.000 > 1.0 forbids SELL orders on USDJPY',
      payload: {
        strategy: 'CBDR',
        symbol: 'USDJPY',
        timeframe: '15m',
        action: 'SELL', // Forbidden!
        entry: 154.50,
        sl: 154.90,
        tp1: 153.70,
        session: 'London',
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'Test: Interceptor must drop SELL signal because Fed yield dominates BoJ.'
      }
    },
    {
      id: 'eurusd_sell_valid',
      name: '🇪🇺 EURUSD SELL (Valid CBDR IPDA Bearish)',
      category: 'Major',
      statusType: 'success',
      description: 'ECB (3.15%) / Fed (4.50%) = 0.700 (< 1.0) -> Strictly SELL ONLY',
      payload: {
        strategy: 'CBDR',
        symbol: 'EURUSD',
        timeframe: '15m',
        action: 'SELL',
        entry: 1.08500,
        sl: 1.08800,
        tp1: 1.07900,
        tp2: 1.07300,
        session: 'London',
        liquidity_sweep: true,
        fvg_number: 1,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'EURUSD CBDR London: Swept PDH, entering on 1st FVG with bearish yield differential (0.700 < 1.0).'
      }
    },
    {
      id: 'eurusd_buy_rejected',
      name: '🇪🇺 EURUSD BUY (Auto-Rejected by IPDA Filter)',
      category: 'Major',
      statusType: 'error',
      description: 'Violates Mandatory IPDA: Ratio 0.700 < 1.0 forbids BUY orders on EURUSD in CBDR',
      payload: {
        strategy: 'CBDR',
        symbol: 'EURUSD',
        timeframe: '15m',
        action: 'BUY', // FORBIDDEN! Ratio 0.700 < 1.0 is strictly SELL ONLY
        entry: 1.08500,
        sl: 1.08200,
        tp1: 1.09100,
        tp2: 1.09700,
        session: 'London',
        liquidity_sweep: true,
        fvg_number: 1,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'Test: Trigger strict IPDA interceptor rejection for attempting BUY on Bearish EURUSD in CBDR.'
      }
    },
    {
      id: 'ny_nas100_valid',
      name: '🇺🇸 New York Open: NAS100 (IPDA Exempt)',
      category: 'Index',
      statusType: 'success',
      description: 'New York Strategy (Indices) is EXEMPT from IPDA rates. 15m range + 1m loose FVG entry.',
      payload: {
        strategy: 'New York',
        symbol: 'NAS100',
        timeframe: '1m',
        action: 'BUY',
        entry: 20450.00,
        sl: 20400.00,
        tp1: 20550.00,
        tp2: 20680.00,
        session: 'NY Open',
        ny_15m_range_marked: true,
        ny_1m_choch: true,
        secret: 'YOUR_WEBHOOK_SECRET',
        notes: 'NY Open Strategy: 09:29 AM range marked, 1m CHOCH + FVG entry (IPDA Exempt).'
      }
    }
  ];

  const [jsonText, setJsonText] = useState(JSON.stringify(presets[0].payload, null, 2));
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0].id);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPresetId(preset.id);
    setJsonText(JSON.stringify(preset.payload, null, 2));
    setResult(null);
  };

  const handleSendWebhook = async () => {
    setIsSending(true);
    setResult(null);

    try {
      let parsed = {};
      try {
        parsed = JSON.parse(jsonText);
      } catch (err: any) {
        setResult({
          success: false,
          error: `JSON Syntax Error: ${err.message}`
        });
        setIsSending(false);
        return;
      }

      const res = await fetch('/api/signals/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        if (parsed && (parsed as any).action === 'SELL') {
          soundEngine.playSellSignalChime();
        } else {
          soundEngine.playBuySignalChime();
        }
        if (onSignalCreated) onSignalCreated();
      } else {
        soundEngine.playWarningSound();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: `Network / Request Error: ${err.message}`
      });
      soundEngine.playWarningSound();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TradingView Webhook Simulator & IPDA Direction Tester"
      subtitle="Transmit mock alerts to test automated Central Bank IPDA ratio direction filtering, rejection interceptors, and lot sizing"
      maxWidth="3xl"
      icon={<Terminal className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-5">
        
        {/* Presets Selector */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
            1. Select Strategy & IPDA Filter Test Scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.map((p) => {
              const isSelected = selectedPresetId === p.id;
              const isErr = p.statusType === 'error';
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-300/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">
                      {p.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isErr ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {isErr ? 'IPDA Reject Test' : 'Approved Test'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 line-clamp-2 font-medium">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* JSON Payload Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Incoming JSON Payload (POST /api/signals/webhook):</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono font-medium">
              Editable JSON
            </span>
          </div>
          <textarea
            rows={9}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-blue-500 shadow-inner"
            placeholder="Paste JSON alert payload here..."
          />
        </div>

        {/* Action Trigger Button */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-medium">
            Fires live webhook event to <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded border border-blue-200">POST /api/signals/webhook</code> with zero latency SSE broadcast.
          </p>
          <button
            onClick={handleSendWebhook}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Transmitting Alert...' : 'Transmit Webhook Alert'}</span>
          </button>
        </div>

        {/* Response Feedback Box */}
        {result && (
          <div className={`p-4 rounded-xl border text-xs animate-in fade-in duration-200 ${
            result.success 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center gap-2 font-bold mb-2">
              {result.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{result.success ? 'Webhook Approved & Broadcasted!' : 'Webhook Rejected by IPDA Engine / Validator'}</span>
            </div>
            
            {result.reason && (
              <div className="p-2 rounded bg-rose-100 text-rose-900 font-mono text-[11px] mb-2 border border-rose-200 font-bold">
                <strong>Rejection Reason:</strong> {result.reason}
              </div>
            )}

            {result.ipda && (
              <div className="p-2 rounded bg-white text-slate-800 font-mono text-[11px] mb-2 border border-slate-200">
                <strong>IPDA Ratio:</strong> {result.ipda.ratio} ({result.ipda.formula || result.ipda.permittedDirection})
              </div>
            )}

            {result.lot_size !== undefined && (
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-800 font-mono font-medium">
                <span>Calculated Lot Size: <strong className="text-blue-700 font-bold">{result.lot_size} Lots</strong></span>
                <span>Risk Cap: <strong className="text-rose-700 font-bold">${result.risk_amount_usd}</strong></span>
                <span>Defensive State: <strong className="text-slate-900 font-bold">{result.defensive_state}</strong></span>
              </div>
            )}

            {result.error && (
              <p className="text-rose-700 font-mono mt-1 font-bold">{result.error}</p>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
