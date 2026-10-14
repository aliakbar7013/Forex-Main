'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Code, Copy, Check } from 'lucide-react';
import { Signal } from '@/types';

interface PayloadViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: Signal | null;
}

export function PayloadViewerModal({
  isOpen,
  onClose,
  signal
}: PayloadViewerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!signal) return null;

  const fullData = {
    id: signal.id,
    strategy: signal.strategy,
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    action: signal.action,
    entry: signal.entry,
    sl: signal.sl,
    tp1: signal.tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    calculated_lot_size: signal.calculated_lot_size,
    risk_amount_usd: signal.risk_amount_usd,
    defensive_state: signal.defensive_state,
    validation: signal.validation,
    raw_payload: signal.raw_payload,
    created_at: signal.created_at
  };

  const jsonString = JSON.stringify(fullData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Raw Signal Data & Payload: ${signal.symbol} (${signal.strategy})`}
      subtitle={`Signal ID: ${signal.id}`}
      maxWidth="2xl"
      icon={<Code className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono font-medium">
            {signal.created_at}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto max-h-[60vh] shadow-inner">
          {jsonString}
        </pre>
      </div>
    </Modal>
  );
}
