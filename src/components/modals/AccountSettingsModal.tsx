'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Settings, Shield, Save } from 'lucide-react';
import { RiskSettings } from '@/types';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskSettings: RiskSettings | null;
  onSaveRiskSettings: (updated: Partial<RiskSettings> & { resetStats?: boolean }) => Promise<void>;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  riskSettings,
  onSaveRiskSettings
}: AccountSettingsModalProps) {
  const [baseRisk, setBaseRisk] = useState<number>(riskSettings?.base_risk_percent || 1.0);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(riskSettings?.consecutive_losses || 0);
  const [resetStats, setResetStats] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when riskSettings updates
  React.useEffect(() => {
    if (riskSettings) {
      setBaseRisk(riskSettings.base_risk_percent);
      setConsecutiveLosses(riskSettings.consecutive_losses);
    }
  }, [riskSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveRiskSettings({
        base_risk_percent: Number(baseRisk),
        consecutive_losses: Number(consecutiveLosses),
        resetStats
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Preview tier
  const previewState = consecutiveLosses >= 2 ? 'DEFENSIVE (0.25%)' : consecutiveLosses === 1 ? 'REDUCED (0.50%)' : `NORMAL (${baseRisk}%)`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Defensive Risk Stepping Configuration"
      subtitle="Adjust base risk percentage, consecutive loss stepping ladder, and recovery state"
      maxWidth="lg"
      icon={<Settings className="w-5 h-5 text-blue-600" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Base Risk Percentage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Base Risk Per Trade (%):
            </label>
            <span className="font-mono text-xs font-bold text-emerald-700">{baseRisk}%</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="3.0"
            step="0.25"
            value={baseRisk}
            onChange={(e) => setBaseRisk(parseFloat(e.target.value))}
            className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium">
            <span>0.25% Conservative</span>
            <span>1.0% Standard</span>
            <span>3.0% Aggressive</span>
          </div>
        </div>

        {/* Consecutive Loss Counter Stepping */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
            Simulate / Adjust Consecutive Loss Counter:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setConsecutiveLosses(0)}
              className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                consecutiveLosses === 0 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-2 ring-emerald-300/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              0 Losses (1.0% Normal)
            </button>
            <button
              type="button"
              onClick={() => setConsecutiveLosses(1)}
              className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                consecutiveLosses === 1 
                  ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              1 Loss (0.5% Reduced)
            </button>
            <button
              type="button"
              onClick={() => setConsecutiveLosses(2)}
              className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                consecutiveLosses >= 2 
                  ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs ring-2 ring-rose-300/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              2+ Losses (0.25% Defensive)
            </button>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>Resulting Risk Stepping Tier:</span>
            <strong className="text-slate-900 font-mono font-bold">{previewState}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>Position Sizing Mode:</span>
            <strong className="text-blue-700 font-bold">Dynamic Lot Sizing (Quantity / Units)</strong>
          </div>
        </div>

        {/* Reset Performance Stats Checkbox */}
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1 font-medium">
          <input
            type="checkbox"
            checked={resetStats}
            onChange={(e) => setResetStats(e.target.checked)}
            className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
          />
          <span>Reset trade setup count and win rate metrics</span>
        </label>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
            <span>{isSaving ? 'Saving...' : 'Apply Risk Settings'}</span>
          </button>
        </div>

      </form>
    </Modal>
  );
}
