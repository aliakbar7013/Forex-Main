'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, Copy, Check, Code, ShieldCheck, Zap, Scale } from 'lucide-react';
import { generateCbdrTradingViewPineScript } from '@/lib/pineScriptGenerator';

interface WebhookDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebhookDocsModal({ isOpen, onClose }: WebhookDocsModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleJson = `{
  "strategy": "CBDR",
  "symbol": "EURUSD",
  "timeframe": "15m",
  "action": "BUY",
  "entry": 1.1158,
  "sl": 1.1130,
  "tp1": 1.1242,
  "tp2": 1.1298,
  "risk_percent": 1.0,
  "secret": "YOUR_WEBHOOK_SECRET"
}`;

  const rejectionJson = `{
  "success": false,
  "status": "rejected",
  "reason": "Violates IPDA Bearish Bias (Ratio 0.111 < 1.0: Base 0.50% / Quote 4.50%). Only SELL signals are permitted.",
  "ipda": {
    "symbol": "XAUUSD",
    "action": "BUY",
    "ratio": 0.111,
    "permittedDirection": "SELL_ONLY",
    "isCommodityProxy": true
  }
}`;

  const samplePineScript = generateCbdrTradingViewPineScript('https://cells-anna-none-trails.trycloudflare.com/api/signals/webhook');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TradingView Webhook Integration & IPDA Strategy Rules"
      subtitle="Complete documentation for connecting TradingView alerts, Pine Script payloads, and automated Central Bank IPDA filters"
      maxWidth="3xl"
      icon={<BookOpen className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-6 text-xs text-slate-800">
        
        {/* Endpoint Info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              Webhook Endpoint URL:
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold border border-blue-200">
              POST Method
            </span>
          </div>
          <code className="block p-2.5 rounded-lg bg-white text-blue-700 font-mono text-xs border border-slate-300 font-bold select-all">
            http://localhost:3000/api/signals/webhook
          </code>
        </div>

        {/* IPDA Central Bank Direction Filter Specification */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-blue-600" />
              IPDA Central Bank Bias & Direction Filter Engine:
            </span>
            <span className="text-[10px] font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-bold border border-blue-200">
              Formula: Base Rate / Quote Rate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
              <span className="font-bold text-emerald-800 block">1. Mathematical Decision Matrix (Mandatory):</span>
              <div>• <strong>Ratio &gt; 1.0:</strong> Strictly <span className="text-emerald-700 font-bold">BUY ONLY</span>. Backend auto-rejects SELL signals.</div>
              <div>• <strong>Ratio &lt; 1.0:</strong> Strictly <span className="text-rose-700 font-bold">SELL ONLY</span> (e.g. EURUSD = 0.700). Backend auto-rejects BUY signals.</div>
              <div>• <strong>Ratio == 1.0:</strong> Neutral (no edge, non-tradable).</div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
              <span className="font-bold text-amber-800 block">2. Strategy Rules & Exemption:</span>
              <div>• <strong>CBDR &amp; Stop Hunt:</strong> IPDA Central Bank differential is <span className="text-amber-800 font-bold">STRICTLY MANDATORY</span>.</div>
              <div>• <strong>New York Strategy:</strong> <span className="text-blue-700 font-bold">EXEMPT</span> from IPDA rate ratio (trades SPX500, NAS100, US30 price structure).</div>
              <div>• <strong>Gold (XAUUSD):</strong> Proxied to CHF/USD yield ratio (0.111 &lt; 1.0 &rarr; Strictly SELL ONLY).</div>
            </div>
          </div>
        </div>

        {/* Rejection Payload Specification */}
        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              Automated Rejection Response (HTTP 422):
            </span>
            <button
              onClick={() => handleCopy(rejectionJson, 'reject')}
              className="text-slate-500 hover:text-slate-900"
            >
              {copiedSection === 'reject' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-900 text-rose-300 font-mono text-[11px] border border-slate-800 overflow-x-auto">
            {rejectionJson}
          </pre>
        </div>

        {/* JSON Payload Specification */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-600" />
              Standard JSON Alert Payload:
            </span>
            <button
              onClick={() => handleCopy(sampleJson, 'json')}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
            >
              {copiedSection === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'json' ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-900 text-cyan-300 font-mono text-xs border border-slate-800 overflow-x-auto">
            {sampleJson}
          </pre>
        </div>

        {/* Pine Script Alert Code */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              TradingView Pine Script v5 Alert Example:
            </span>
            <button
              onClick={() => handleCopy(samplePineScript, 'pine')}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
            >
              {copiedSection === 'pine' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'pine' ? 'Copied' : 'Copy Pine Script'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-900 text-amber-300/90 font-mono text-[11px] border border-slate-800 overflow-x-auto max-h-56">
            {samplePineScript}
          </pre>
        </div>

      </div>
    </Modal>
  );
}
