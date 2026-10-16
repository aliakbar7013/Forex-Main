'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  BarChart2, 
  Copy, 
  Check, 
  Code, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { generateCbdrTradingViewPineScript, generateStopHuntTradingViewPineScript } from '@/lib/pineScriptGenerator';

interface TradingViewSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl?: string;
}

export function TradingViewSyncModal({
  isOpen,
  onClose,
  webhookUrl = 'https://perth-subscriptions-namespace-ambassador.trycloudflare.com/api/signals/webhook'
}: TradingViewSyncModalProps) {
  const [selectedModel, setSelectedModel] = useState<'CBDR' | 'STOP_HUNT'>('STOP_HUNT');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const pineScriptCode = selectedModel === 'STOP_HUNT' 
    ? generateStopHuntTradingViewPineScript(webhookUrl)
    : generateCbdrTradingViewPineScript(webhookUrl);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const sampleJsonAlert = selectedModel === 'STOP_HUNT'
    ? `{"strategy":"STOP_HUNT","symbol":"{{ticker}}","timeframe":"5m","action":"SELL","entry":{{close}},"sl":1.08500,"tp1":1.07800,"asian_high_swept":true,"choch_confirmed":true,"fvg_confirmed":true,"secret":"YOUR_WEBHOOK_SECRET"}`
    : `{"strategy":"CBDR","symbol":"{{ticker}}","timeframe":"15m","action":"BUY","entry":{{close}},"sl":{{plot_0}},"tp1":{{plot_1}},"secret":"YOUR_WEBHOOK_SECRET"}`;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(sampleJsonAlert);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TradingView Real-Time Sync & Pine Script Engine"
      subtitle="Connect live TradingView indicators to your dashboard with automated Webhook triggers"
      maxWidth="3xl"
      icon={<BarChart2 className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-6 text-xs text-slate-800">

        {/* Model Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setSelectedModel('STOP_HUNT')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-2 ${
              selectedModel === 'STOP_HUNT'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🎯 Stop Hunt Model (5m Asian Sweep)</span>
            <span className="text-[10px] bg-amber-600/50 px-1.5 py-0.5 rounded text-white font-mono">NEW</span>
          </button>
          <button
            onClick={() => setSelectedModel('CBDR')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-2 ${
              selectedModel === 'CBDR'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏛️ CBDR London Model (15m 1st FVG)</span>
          </button>
        </div>

        {/* 1. Integration Flow Overview Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Zap className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-slate-900 text-sm">
              Two-Way Real-Time TradingView Synchronization
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
            TradingView provides live market data and chart updates via <strong>Pine Script v5 + Webhooks</strong>. Once installed on your TradingView account or chart:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                1. Updated in TradingView
              </span>
              <p className="text-slate-600 text-[10px]">
                Draws Asian CBDR boxes, PDH/PDL levels, entry lines, SL buffer lines, and 1:3 TP lines directly on your TradingView candlesticks in real-time.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-1">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                2. Live Data to Dashboard
              </span>
              <p className="text-slate-600 text-[10px]">
                TradingView fires automated webhooks on every trigger, feeding live ticks and candle executions into your dashboard risk engine.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Webhook Endpoint Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>📡 Active Webhook Endpoint URL:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                HTTPS LIVE
              </span>
            </span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-2xs transition-all"
            >
              {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
          <code className="block p-2.5 rounded-lg bg-white text-blue-700 font-mono text-[11px] border border-slate-300 font-bold select-all overflow-x-auto">
            {webhookUrl}
          </code>
        </div>

        {/* 3. 3-Step Setup Instructions */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Quick 3-Step Setup Guide:
          </h4>

          <div className="space-y-2 text-[11px]">
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <strong className="text-slate-900 block">Open Pine Editor in TradingView:</strong>
                <span className="text-slate-600">
                  Open any chart on <a href="https://www.tradingview.com/chart/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">TradingView <ExternalLink className="w-2.5 h-2.5" /></a> (or in the dashboard Live Chart tab). Click the <strong>Pine Editor</strong> tab at the bottom toolbar.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <strong className="text-slate-900 block">Paste &amp; Add to Chart:</strong>
                <span className="text-slate-600">
                  Copy the Pine Script v5 code below, paste it into the editor, and click <strong>&quot;Add to chart&quot;</strong>. The CBDR boxes, sweeps, and HUD table will immediately render on your chart!
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div>
                <strong className="text-slate-900 block">Create Automated Webhook Alert:</strong>
                <span className="text-slate-600">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-[10px]">Alt + A</kbd> (or click the Clock Alert icon), set Condition to <em>Apex ICT CBDR &amp; 1:3 RR Strategy Engine</em>, check <strong>Webhook URL</strong>, and paste the endpoint URL.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Complete Pine Script v5 Code Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100 font-mono text-xs">
                Apex_CBDR_Engine_v5.pine
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 font-mono text-[9px] font-bold">
                Pine Script v5
              </span>
            </div>
            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Pine Script'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-64 leading-relaxed border border-slate-800 selection:bg-blue-600">
            {pineScriptCode}
          </pre>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span>✅ Major Pairs: Requires PDH/PDL Sweep</span>
            <span>✅ Minor Pairs: Direct 1st Imbalance (No Sweep)</span>
            <span>✅ Mon–Wed Only (Thu/Fri Blocked)</span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
