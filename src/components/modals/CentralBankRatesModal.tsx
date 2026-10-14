'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  Building2, 
  RefreshCw, 
  Save, 
  ExternalLink, 
  CheckCircle2
} from 'lucide-react';
import { CentralBankRate, CurrencyCode } from '@/types';

interface CentralBankRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: CentralBankRate[];
  onSaveRates: (rates: Partial<CentralBankRate>[]) => Promise<void>;
  onSyncLiveRates: () => Promise<void>;
}

export function CentralBankRatesModal({
  isOpen,
  onClose,
  rates,
  onSaveRates,
  onSyncLiveRates
}: CentralBankRatesModalProps) {
  const [localRates, setLocalRates] = useState<Record<CurrencyCode, number>>({
    USD: 4.50,
    EUR: 3.15,
    GBP: 4.75,
    JPY: 0.25,
    CHF: 0.50,
    AUD: 4.35,
    CAD: 3.75,
    NZD: 4.75
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (rates && rates.length > 0) {
      const map: any = {};
      rates.forEach(r => {
        map[r.code] = r.rate;
      });
      setLocalRates(prev => ({ ...prev, ...map }));
    }
  }, [rates]);

  const handleRateChange = (code: CurrencyCode, value: string) => {
    const num = parseFloat(value);
    setLocalRates(prev => ({
      ...prev,
      [code]: isNaN(num) ? 0 : num
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSyncFeedback(null);
    try {
      const payload: Partial<CentralBankRate>[] = Object.entries(localRates).map(([code, rate]) => ({
        code: code as CurrencyCode,
        rate
      }));
      await onSaveRates(payload);
      setSyncFeedback('Central Bank policy rates updated successfully!');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onSyncLiveRates();
      setSyncFeedback('Synchronized live with global-rates.com central bank data.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const banksList: { code: CurrencyCode; name: string; bank: string; flag: string; url: string }[] = [
    { code: 'USD', name: 'US Dollar', bank: 'Federal Reserve (Fed)', flag: '🇺🇸', url: 'https://www.global-rates.com/en/interest-rates/central-banks/american-fed/' },
    { code: 'EUR', name: 'Euro', bank: 'European Central Bank (ECB)', flag: '🇪🇺', url: 'https://www.global-rates.com/en/interest-rates/central-banks/european-central-bank/' },
    { code: 'GBP', name: 'British Pound', bank: 'Bank of England (BoE)', flag: '🇬🇧', url: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-england/' },
    { code: 'JPY', name: 'Japanese Yen', bank: 'Bank of Japan (BoJ)', flag: '🇯🇵', url: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-japan/' },
    { code: 'CHF', name: 'Swiss Franc (Gold Proxy)', bank: 'Swiss National Bank (SNB)', flag: '🇨🇭', url: 'https://www.global-rates.com/en/interest-rates/central-banks/swiss-national-bank/' },
    { code: 'AUD', name: 'Australian Dollar', bank: 'Reserve Bank of Australia (RBA)', flag: '🇦🇺', url: 'https://www.global-rates.com/en/interest-rates/central-banks/reserve-bank-of-australia/' },
    { code: 'CAD', name: 'Canadian Dollar', bank: 'Bank of Canada (BoC)', flag: '🇨🇦', url: 'https://www.global-rates.com/en/interest-rates/central-banks/bank-of-canada/' },
    { code: 'NZD', name: 'New Zealand Dollar', bank: 'Reserve Bank of New Zealand (RBNZ)', flag: '🇳🇿', url: 'https://www.global-rates.com/en/interest-rates/central-banks/reserve-bank-of-new-zealand/' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Central Bank Policy Rates Management (IPDA Yield Differential)"
      subtitle="Source of truth for the IPDA interest rate ratio engine (Base Rate / Quote Rate)"
      maxWidth="3xl"
      icon={<Building2 className="w-5 h-5 text-blue-600" />}
    >
      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Top Info Banner & Sync Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">
              Official Central Bank Interest Rates
            </span>
            <span className="text-slate-500 font-medium">
              Benchmark rates from <a href="https://www.global-rates.com/en/interest-rates/central-banks/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">global-rates.com <ExternalLink className="w-2.5 h-2.5" /></a>.
            </span>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-all shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from Global-Rates'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Central Banks Rates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {banksList.map((item) => (
            <div 
              key={item.code}
              className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{item.flag}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {item.code}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({item.name})
                    </span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:text-blue-800 truncate max-w-[170px] block hover:underline font-medium"
                  >
                    {item.bank}
                  </a>
                </div>
              </div>

              {/* Rate Input */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.0"
                  max="30.0"
                  value={localRates[item.code] ?? 0}
                  onChange={(e) => handleRateChange(item.code, e.target.value)}
                  className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-blue-500 shadow-xs"
                />
                <span className="font-mono text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Special Note on Gold & Zero-Rate rule */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-slate-800 space-y-1">
          <span className="font-bold text-amber-900 block text-xs">IPDA Strategy Rules Handled Automatically:</span>
          <div>• <strong>Gold (XAUUSD) Rule:</strong> Mapped to Swiss Franc rate (CHF {localRates['CHF'] ?? 0.5}% / USD {localRates['USD'] ?? 4.5}%).</div>
          <div>• <strong>Zero-Rate Clamping:</strong> Zero denominators are clamped to 0.01% to prevent division errors.</div>
        </div>

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
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving Rates...' : 'Apply & Recalculate IPDA Matrix'}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
}
