'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  ListFilter,
  Key,
  LogOut,
  Crown,
  User
} from 'lucide-react';
import { SessionClocks } from '@/lib/sessionTracker';
import { soundEngine } from '@/lib/soundEngine';

interface HeaderProps {
  clocks: SessionClocks;
  isConnected: boolean;
  authSession?: { authenticated: boolean; role?: 'ADMIN' | 'USER'; label?: string; pin?: string };
  onOpenSettings?: () => void;
  onOpenLogs?: () => void;
  onResetSeedData?: () => void;
  onOpenTelegram?: () => void;
  onOpenPinManager?: () => void;
  onLogout?: () => void;
}

export function HeaderComponent({
  clocks,
  isConnected,
  authSession,
  onOpenSettings,
  onOpenLogs,
  onResetSeedData,
  onOpenTelegram,
  onOpenPinManager,
  onLogout
}: HeaderProps) {
  const [isMuted, setIsMuted] = useState(() => soundEngine.getMuted());
  const [volume, setVolume] = useState(() => soundEngine.getVolume());
  const [showAudioPopover, setShowAudioPopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const audioMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(event.target as Node)) {
        setShowAudioPopover(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
    if (!next) {
      soundEngine.playBuySignalChime();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* LEFT: Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white font-black shadow-sm shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                  Apex<span className="text-blue-600">Signal</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  ICT Quant
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Forex &amp; Indices IPDA Direction Engine
              </p>
            </div>
          </div>

          {/* CENTER: Dual Time Clocks Strictly (NY & IST) */}
          <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">NY</span>
              <strong className="text-slate-900 font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.nyTime}
              </strong>
            </div>
            
            <span className="text-slate-300 font-bold">•</span>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">IST</span>
              <strong className="text-slate-900 font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.istTime}
              </strong>
            </div>
          </div>

          {/* RIGHT: Live Status, Telegram & Audio Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Live Feed Status Dot */}
            <div className="flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden xs:inline">LIVE FEED</span>
              </span>
            </div>

            {/* Telegram Alerts Button */}
            {onOpenTelegram && (
              <button
                type="button"
                onClick={onOpenTelegram}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold shadow-2xs transition-all shrink-0"
                title="Connect Telegram Bot for Instant Real-Time Signal Push Alerts"
              >
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Telegram</span>
              </button>
            )}

            {/* Audio Toggle & Popover */}
            <div className="relative shrink-0" ref={audioMenuRef}>
              <button
                type="button"
                onClick={() => setShowAudioPopover(!showAudioPopover)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
                  isMuted 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900' 
                    : 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                }`}
                title={isMuted ? 'Unmute Audio Chimes' : 'Audio Settings & Volume'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Audio Controls Popover */}
              {showAudioPopover && (
                <div className="absolute right-0 mt-2 w-52 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-slate-800 mb-2 font-medium">
                    <span className="font-bold flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      Chime Audio
                    </span>
                    <button
                      type="button"
                      onClick={() => soundEngine.playBuySignalChime()}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Test Chime
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-700 font-mono font-bold w-7 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">Mute Sounds</span>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                        isMuted 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isMuted ? 'Muted' : 'Unmuted'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Auth Session Badge & PIN Manager */}
            {authSession && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {authSession.role === 'ADMIN' ? (
                  <>
                    <button
                      type="button"
                      onClick={onOpenPinManager}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black transition-all shadow-2xs"
                      title="Manage User Access PINs"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Owner PIN: 9398</span>
                      <span className="sm:hidden font-mono">9398</span>
                    </button>

                    {onOpenPinManager && (
                      <button
                        type="button"
                        onClick={onOpenPinManager}
                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-all shadow-2xs"
                        title="Manage user access PINs"
                      >
                        <Key className="w-3.5 h-3.5 text-blue-600" />
                        <span>Manage PINs</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{authSession.label || 'Trader'}</span>
                  </div>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition-all shadow-2xs"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Quick Tools Menu (Settings, Activity Logs, Reset) */}
            <div className="relative shrink-0" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-2xs"
                title="Options & Configuration"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-52 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in flex flex-col gap-0.5 text-xs font-semibold text-slate-700">
                  {authSession?.role === 'ADMIN' && onOpenPinManager && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenPinManager(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition-colors text-slate-800"
                    >
                      <Key className="w-4 h-4 text-blue-600" />
                      <span>Manage Access PINs</span>
                    </button>
                  )}

                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenSettings(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition-colors text-slate-800"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Risk &amp; Account Sizing</span>
                    </button>
                  )}

                  {onOpenLogs && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenLogs(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition-colors text-slate-800"
                    >
                      <ListFilter className="w-4 h-4 text-purple-600" />
                      <span>Activity &amp; Audit Logs</span>
                    </button>
                  )}

                  {onResetSeedData && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => { setShowMoreMenu(false); onResetSeedData(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 text-left transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>Reset Demo Data</span>
                      </button>
                    </>
                  )}

                  {onLogout && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => { setShowMoreMenu(false); onLogout(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </header>
  );
}

export const Header = React.memo(HeaderComponent);
