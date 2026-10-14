'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthPin } from '@/types';
import { 
  X, 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Dices, 
  ShieldCheck, 
  User, 
  Crown, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles
} from 'lucide-react';

interface PinManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPin: string;
}

export function PinManagerModal({ isOpen, onClose, currentPin }: PinManagerModalProps) {
  const [pins, setPins] = useState<AuthPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN'>('USER');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/pins', {
        headers: { 'x-auth-pin': currentPin }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pins)) {
          setPins(data.pins);
          return;
        }
      }
    } catch {
      // Fallback to localStorage
    }

    try {
      const stored = localStorage.getItem('auth_custom_pins');
      const customList = stored ? JSON.parse(stored) : [];
      const masterPin: AuthPin = {
        pin: '9398',
        role: 'ADMIN',
        label: 'Master Admin (Owner)',
        is_active: 1,
        created_at: '2026-10-01T00:00:00.000Z'
      };
      setPins([masterPin, ...customList.filter((p: AuthPin) => p.pin !== '9398')]);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [currentPin]);

  useEffect(() => {
    if (isOpen) {
      fetchPins();
      setFeedback(null);
    }
  }, [isOpen, fetchPins]);

  const handleGenerateRandom = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(random);
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.trim().length < 3) {
      setFeedback({ type: 'error', message: 'PIN must be at least 3 digits/characters.' });
      return;
    }

    const pinVal = newPin.trim();
    const labelVal = newLabel.trim() || 'Authorized User';

    try {
      setFeedback(null);
      const res = await fetch('/api/auth/pins', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-pin': currentPin
        },
        body: JSON.stringify({
          pin: pinVal,
          label: labelVal,
          role: newRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedback({ type: 'success', message: data.message });
          setNewPin('');
          setNewLabel('');
          setNewRole('USER');
          if (data.pins) setPins(data.pins);
          return;
        }
      }
    } catch {
      // API offline, fallback to localStorage
    }

    // Static fallback: save to localStorage
    try {
      const stored = localStorage.getItem('auth_custom_pins');
      const customList = stored ? JSON.parse(stored) : [];
      if (pinVal === '9398' || customList.some((p: any) => p.pin === pinVal)) {
        setFeedback({ type: 'error', message: `PIN "${pinVal}" already exists.` });
        return;
      }
      const newEntry: AuthPin = {
        pin: pinVal,
        label: labelVal,
        role: newRole,
        is_active: 1,
        created_at: new Date().toISOString()
      };
      const updated = [...customList, newEntry];
      localStorage.setItem('auth_custom_pins', JSON.stringify(updated));

      const masterPin: AuthPin = {
        pin: '9398',
        role: 'ADMIN',
        label: 'Master Admin (Owner)',
        is_active: 1,
        created_at: '2026-10-01T00:00:00.000Z'
      };
      setPins([masterPin, ...updated]);
      setFeedback({ type: 'success', message: `PIN ${pinVal} created successfully for ${labelVal}!` });
      setNewPin('');
      setNewLabel('');
      setNewRole('USER');
    } catch {
      setFeedback({ type: 'error', message: 'Failed to create PIN' });
    }
  };

  const handleToggleStatus = async (pin: string, currentStatus: number) => {
    if (pin === '9398') return;
    try {
      const nextStatus = currentStatus === 1 ? false : true;
      const res = await fetch('/api/auth/pins', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-pin': currentPin
        },
        body: JSON.stringify({ pin, is_active: nextStatus })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pins) {
          setPins(data.pins);
          return;
        }
      }
    } catch {}

    // Static fallback
    try {
      const stored = localStorage.getItem('auth_custom_pins');
      const customList = stored ? JSON.parse(stored) : [];
      const updated = customList.map((p: any) => 
        p.pin === pin ? { ...p, is_active: currentStatus === 1 ? 0 : 1 } : p
      );
      localStorage.setItem('auth_custom_pins', JSON.stringify(updated));
      const masterPin: AuthPin = {
        pin: '9398',
        role: 'ADMIN',
        label: 'Master Admin (Owner)',
        is_active: 1,
        created_at: '2026-10-01T00:00:00.000Z'
      };
      setPins([masterPin, ...updated]);
    } catch (e) {
      console.error('Failed to toggle PIN status', e);
    }
  };

  const handleDeletePin = async (pin: string, label: string) => {
    if (pin === '9398') return;
    if (!confirm(`Are you sure you want to permanently revoke & delete the access PIN for "${label}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/pins?pin=${encodeURIComponent(pin)}`, {
        method: 'DELETE',
        headers: { 'x-auth-pin': currentPin }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedback({ type: 'success', message: `PIN deleted for ${label}.` });
          if (data.pins) setPins(data.pins);
          return;
        }
      }
    } catch {}

    // Static fallback
    try {
      const stored = localStorage.getItem('auth_custom_pins');
      const customList = stored ? JSON.parse(stored) : [];
      const updated = customList.filter((p: any) => p.pin !== pin);
      localStorage.setItem('auth_custom_pins', JSON.stringify(updated));
      const masterPin: AuthPin = {
        pin: '9398',
        role: 'ADMIN',
        label: 'Master Admin (Owner)',
        is_active: 1,
        created_at: '2026-10-01T00:00:00.000Z'
      };
      setPins([masterPin, ...updated]);
      setFeedback({ type: 'success', message: `PIN deleted for ${label}.` });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete PIN' });
    }
  };

  const toggleRevealPin = (pin: string) => {
    setRevealedPins(prev => ({ ...prev, [pin]: !prev[pin] }));
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>PIN Access Control &amp; User Permissions</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  Owner Admin
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Create and manage authorized login PINs for yourself, clients, and traders.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Feedback Banner */}
          {feedback && (
            <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Create New User PIN Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Create New Authorized User PIN</span>
              </h3>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Random PIN</span>
              </button>
            </div>

            <form onSubmit={handleCreatePin} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* PIN Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Access PIN Code:
                  </label>
                  <input
                    type="text"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="e.g. 5421"
                    maxLength={8}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* User Label / Client Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    User / Client Name:
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Trader Alex"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Role / Permissions */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Permission Role:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'USER' | 'ADMIN')}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="USER">👤 User (Standard Trader)</option>
                    <option value="ADMIN">👑 Admin (Full Control)</option>
                  </select>
                </div>

              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save &amp; Authorize PIN</span>
              </button>
            </form>
          </div>

          {/* Existing PINs List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Authorized PINs ({pins.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Master PIN 9398 has permanent root owner access
              </span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {pins.map((p) => {
                const isMaster = p.pin === '9398';
                const isRevealed = revealedPins[p.pin] || false;
                const isCopied = copiedPin === p.pin;

                return (
                  <div key={p.pin} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    
                    {/* Left: PIN details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        
                        {/* PIN Code Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-black shadow-xs">
                          <span>{isRevealed ? p.pin : '••••'}</span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPin(p.pin)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPin(p.pin)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Copy PIN"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Role Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          p.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {p.role === 'ADMIN' ? <Crown className="w-3 h-3 text-amber-600" /> : <User className="w-3 h-3 text-blue-600" />}
                          {p.role}
                        </span>

                        {/* Label / Name */}
                        <span className="font-bold text-xs text-slate-900">
                          {p.label}
                        </span>

                        {isMaster && (
                          <span className="px-2 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-extrabold border border-purple-200">
                            Root Owner
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-3">
                        <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                        {p.last_used_at && (
                          <span>• Last used: {new Date(p.last_used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions (Toggle Active & Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      
                      {/* Active Toggle */}
                      {!isMaster ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.pin, p.is_active)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            p.is_active === 1
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                          title={p.is_active === 1 ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {p.is_active === 1 ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          <span>{p.is_active === 1 ? 'Active' : 'Disabled'}</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          Permanent Active
                        </span>
                      )}

                      {/* Delete Button */}
                      {!isMaster && (
                        <button
                          type="button"
                          onClick={() => handleDeletePin(p.pin, p.label)}
                          className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all"
                          title="Revoke & Delete PIN"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Any user with an active PIN can sign in to view the dashboard.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
