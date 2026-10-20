'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  ExternalLink, 
  ShieldCheck, 
  Info, 
  Check, 
  Bell, 
  Radio
} from 'lucide-react';
import { TelegramSettings } from '@/types';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramSettingsModal({ isOpen, onClose }: TelegramSettingsModalProps) {
  const [settings, setSettings] = useState<TelegramSettings>({
    bot_token: '',
    chat_id: '',
    enabled: false,
    notify_new_signals: true,
    notify_trade_resolutions: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Fetch settings on open
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setTestResult(null);
    setSaveSuccess(false);

    fetch('/api/telegram')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(err => console.error('Failed to load Telegram settings:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.bot_token.trim() || !settings.chat_id.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both Bot Token and Chat ID before sending a test notification.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: settings.bot_token.trim(),
          chat_id: settings.chat_id.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Test notification delivered successfully to your Telegram!'
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to deliver test message to Telegram.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error testing Telegram connection.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = Boolean(settings.bot_token && settings.chat_id && settings.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-inner">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Telegram Signal Alerts
                </h2>
                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                  isConfigured 
                    ? 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40' 
                    : 'bg-amber-500/20 text-amber-100 border-amber-300/40'
                }`}>
                  {isConfigured ? '● ACTIVE & READY' : '○ SETUP NEEDED'}
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium">
                Instant push notifications to your personal chat, group, or channel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
          
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-mono">Loading Telegram Configuration...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Status & Test Alert Banner */}
              {testResult && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200 ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <span className="font-black block text-[13px]">
                      {testResult.success ? 'Telegram Delivery Success!' : 'Telegram Error'}
                    </span>
                    <span className="font-medium mt-0.5 block">{testResult.message}</span>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Telegram alert settings saved and active!</span>
                </div>
              )}

              {/* Master Enabled Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    settings.enabled 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      Enable Real-Time Telegram Broadcasts
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Turn on/off all automatic Telegram signal and resolution dispatches
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings(p => ({ ...p, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Telegram Bot Token Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Telegram Bot Token</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span>Get from @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={settings.bot_token}
                  onChange={(e) => setSettings(p => ({ ...p, bot_token: e.target.value }))}
                  placeholder="e.g. 7123456789:AAHKz_xxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Create a bot with <strong>@BotFather</strong> on Telegram using <code>/newbot</code> command and paste the API token here.
                </p>
              </div>

              {/* Telegram Chat ID Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Telegram Chat ID / Channel ID</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span>Find ID via @userinfobot</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={settings.chat_id}
                  onChange={(e) => setSettings(p => ({ ...p, chat_id: e.target.value }))}
                  placeholder="e.g. 123456789 (Personal) or -100123456789 (Channel/Group)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  For your personal chat, message <strong>@userinfobot</strong> to get your ID. For channels/groups, add your bot as an admin and provide the Channel ID or <code>@channel_username</code>.
                </p>
              </div>

              {/* Notification Filter Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                  Notification Dispatch Mode
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* New Signals */}
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-500 bg-blue-50/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.notify_new_signals}
                      onChange={(e) => setSettings(p => ({ ...p, notify_new_signals: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <span>New Trade Signals</span>
                        <span className="text-[9px] uppercase tracking-wider bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded">Active</span>
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">
                        Instant Entry, SL, TP &amp; 1:3 RR Matrix
                      </span>
                    </div>
                  </label>

                  {/* Trade Outcomes - Disabled per user request */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="rounded border-slate-300 text-slate-400 w-4 h-4 cursor-not-allowed"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                        <span>TP / SL Resolution Hits</span>
                        <span className="text-[9px] uppercase tracking-wider bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">Muted</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        TP/SL notifications muted (Clean Signal Alerts only)
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Step-by-Step Setup Guide Accordion */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>How to set up your Telegram Bot in 30 seconds</span>
                  </span>
                  <span className="text-blue-600 font-mono text-[11px]">
                    {showGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}
                  </span>
                </button>

                {showGuide && (
                  <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
                    <div className="space-y-1">
                      <strong className="text-slate-900 font-bold block">Step 1: Create your bot</strong>
                      <p>Open Telegram, search for <strong>@BotFather</strong>, start the chat and send <code>/newbot</code>. Follow the prompts to name your bot and copy the HTTP API Token.</p>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-slate-900 font-bold block">Step 2: Start the bot &amp; find your Chat ID</strong>
                      <p>Open your newly created bot on Telegram and press <strong>START</strong>. Then open <strong>@userinfobot</strong> to copy your numeric <code>Id</code>.</p>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-slate-900 font-bold block">Step 3: Test and save</strong>
                      <p>Paste the Bot Token and Chat ID above, click <strong>Send Live Test Message</strong>, and click <strong>Save Settings</strong>. You are all set!</p>
                    </div>
                  </div>
                )}
              </div>

            </form>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !settings.bot_token || !settings.chat_id}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-300 font-bold text-xs shadow-2xs transition-all disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-sky-600" />}
            <span>{isTesting ? 'Sending Test...' : 'Send Live Test Message 🚀'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Configuration 💾'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
