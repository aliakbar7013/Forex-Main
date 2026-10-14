'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, ArrowRight, Delete, AlertCircle, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';

interface PinLoginScreenProps {
  onLoginSuccess: (session: { role: 'ADMIN' | 'USER'; label: string; pin: string }) => void;
}

export function PinLoginScreen({ onLoginSuccess }: PinLoginScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(async (pinToTest: string) => {
    if (!pinToTest || pinToTest.length < 3) {
      setError('Please enter your full PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinToTest })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setIsSuccess(true);
            try {
              localStorage.setItem('auth_pin_code', pinToTest);
              localStorage.setItem('auth_pin_role', data.role);
              localStorage.setItem('auth_pin_label', data.label);
            } catch {}

            setTimeout(() => {
              onLoginSuccess({
                role: data.role,
                label: data.label,
                pin: pinToTest
              });
            }, 500);
            return;
          } else {
            setError(data.error || 'Invalid PIN code. Access denied.');
            setPin('');
            return;
          }
        }
      } catch {
        // Fallback to client-side evaluation for static hosting
      }

      // Static hosting fallback on Hostinger
      if (pinToTest === '9398') {
        setIsSuccess(true);
        try {
          localStorage.setItem('auth_pin_code', '9398');
          localStorage.setItem('auth_pin_role', 'ADMIN');
          localStorage.setItem('auth_pin_label', 'Master Admin (Owner)');
        } catch {}

        setTimeout(() => {
          onLoginSuccess({
            role: 'ADMIN',
            label: 'Master Admin (Owner)',
            pin: '9398'
          });
        }, 500);
        return;
      }

      // Check custom trader PINs in localStorage
      try {
        const storedCustomPins = localStorage.getItem('auth_custom_pins');
        if (storedCustomPins) {
          const list = JSON.parse(storedCustomPins);
          const found = list.find((p: any) => p.pin === pinToTest && p.is_active);
          if (found) {
            setIsSuccess(true);
            try {
              localStorage.setItem('auth_pin_code', pinToTest);
              localStorage.setItem('auth_pin_role', found.role || 'USER');
              localStorage.setItem('auth_pin_label', found.label || 'Authorized Trader');
            } catch {}

            setTimeout(() => {
              onLoginSuccess({
                role: found.role || 'USER',
                label: found.label || 'Authorized Trader',
                pin: pinToTest
              });
            }, 500);
            return;
          }
        }
      } catch {}

      setError('Invalid PIN code. Access denied.');
      setPin('');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onLoginSuccess]);

  const handleDigit = useCallback((digit: string) => {
    if (isLoading || isSuccess) return;
    setError(null);
    setPin(prev => {
      if (prev.length >= 8) return prev;
      const next = prev + digit;
      // Auto-submit on 4 digits if desired
      if (next.length === 4) {
        setTimeout(() => handleSubmit(next), 50);
      }
      return next;
    });
  }, [isLoading, isSuccess, handleSubmit]);

  const handleBackspace = () => {
    if (isLoading || isSuccess) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading || isSuccess) return;
    setError(null);
    setPin('');
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit(pin);
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, handleDigit, handleSubmit]);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20 mb-1">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              {isSuccess ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-in zoom-in" />
              ) : (
                <Shield className="w-7 h-7 text-blue-400" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>ICT Signals Terminal</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                v2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              TradingView Real-Time CBDR &amp; New York Quantitative Telemetry
            </p>
          </div>
        </div>

        {/* PIN Entry Display */}
        <div className="space-y-3 pt-2">
          <div className="text-center">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center justify-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              Enter Access PIN
            </span>
          </div>

          {/* Dots / Digit Indicators */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    isSuccess
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/50'
                      : isFilled
                      ? 'bg-blue-400 border-blue-400 scale-110 shadow-lg shadow-blue-500/50'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Access Granted • Unlocking Terminal...</span>
            </div>
          )}
        </div>

        {/* Virtual Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              disabled={isLoading || isSuccess}
              className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-mono text-xl font-bold border border-slate-700/60 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={isLoading || isSuccess || pin.length === 0}
            className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-800 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
            title="Clear all digits"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isLoading || isSuccess}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-mono text-xl font-bold border border-slate-700/60 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={isLoading || isSuccess || pin.length === 0}
            className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold border border-slate-800 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
            title="Delete last digit"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Unlock Action Button */}
        <button
          type="button"
          onClick={() => handleSubmit(pin)}
          disabled={isLoading || isSuccess || pin.length < 3}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black tracking-wide uppercase transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Unlock Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Security / System Footer Note */}
        <div className="pt-2 text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium">
            <Lock className="w-3 h-3 text-slate-400" />
            Protected by Institutional PIN Access Control
          </p>
        </div>

      </div>

    </div>
  );
}
