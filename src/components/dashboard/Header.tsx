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
  User,
  Radio,
  Clock
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
    <header className="sticky top-0 z-50 w-full bg-[#080c14]/90 backdrop-blur-xl border-b border-white/[0.08] select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* LEFT: Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white font-black shadow-lg shadow-cyan-500/20 shrink-0 border border-white/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-white uppercase font-sans">
                  APEX<span className="text-cyan-400">TERMINAL</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0">
                  ICT v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Interbank Institutional Liquidity Engine
              </p>
            </div>
          </div>

          {/* CENTER: Dual Time Clocks Strictly (NY & IST) */}
          <div className="flex items-center gap-2 sm:gap-2.5 bg-[#0f1422]/90 px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-inner">
            <div className="flex items-center gap-1.5 bg-[#141b2d] px-2.5 py-0.5 rounded-lg border border-white/[0.06]">
              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">NY</span>
              <strong className="text-white font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.nyTime}
              </strong>
            </div>
            
            <span className="text-slate-600 font-bold">•</span>

            <div className="flex items-center gap-1.5 bg-[#141b2d] px-2.5 py-0.5 rounded-lg border border-white/[0.06]">
              <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">IST</span>
              <strong className="text-white font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.istTime}
              </strong>
            </div>
          </div>

          {/* RIGHT: Live Status, Telegram & Audio Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Live Feed Status Dot */}
            <div className="flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold glow-emerald">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="hidden xs:inline tracking-wider text-[11px]">LIVE FEED</span>
              </span>
            </div>

            {/* Telegram Alerts Button */}
            {onOpenTelegram && (
              <button
                type="button"
                onClick={onOpenTelegram}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all shrink-0"
                title="Connect Telegram Bot for Instant Real-Time Signal Push Alerts"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
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
                    ? 'bg-[#121827] border-white/[0.06] text-slate-400 hover:text-white' 
                    : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-xs'
                }`}
                title={isMuted ? 'Unmute Audio Chimes' : 'Audio Settings & Volume'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              </button>

              {/* Audio Controls Popover */}
              {showAudioPopover && (
                <div className="absolute right-0 mt-2 w-52 p-3 bg-[#0f1422] border border-white/[0.1] rounded-2xl shadow-2xl z-50 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-white mb-2 font-medium">
                    <span className="font-bold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      Chime Audio
                    </span>
                    <button
                      type="button"
                      onClick={() => soundEngine.playBuySignalChime()}
                      className="text-[10px] text-cyan-400 font-bold hover:underline"
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
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-300 font-mono font-bold w-7 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Mute Sounds</span>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                        isMuted 
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' 
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isMuted ? 'Muted' : 'Active'}
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
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-black transition-all"
                      title="Master Admin PIN: 9398"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline font-mono">PIN: 9398</span>
                      <span className="sm:hidden font-mono">9398</span>
                    </button>

                    {onOpenPinManager && (
                      <button
                        type="button"
                        onClick={onOpenPinManager}
                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141b2d] hover:bg-[#1a233b] border border-white/[0.08] text-slate-300 text-xs font-bold transition-all"
                        title="Manage user access PINs"
                      >
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>PINs</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141b2d] border border-white/[0.08] text-slate-300 text-xs font-bold">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{authSession.label || 'Trader'}</span>
                  </div>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 sm:p-2 rounded-xl bg-[#121827] hover:bg-rose-950/60 border border-white/[0.06] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all"
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
                className="p-1.5 sm:p-2 rounded-xl bg-[#121827] hover:bg-[#1a2236] border border-white/[0.08] text-slate-300 transition-all"
                title="Options & Configuration"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-52 p-1.5 bg-[#0f1422] border border-white/[0.1] rounded-2xl shadow-2xl z-50 animate-in fade-in flex flex-col gap-0.5 text-xs font-semibold text-slate-300">
                  {authSession?.role === 'ADMIN' && onOpenPinManager && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenPinManager(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors text-white"
                    >
                      <Key className="w-4 h-4 text-cyan-400" />
                      <span>Manage Access PINs</span>
                    </button>
                  )}

                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenSettings(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors text-white"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Risk &amp; Account Sizing</span>
                    </button>
                  )}

                  {onOpenLogs && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenLogs(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-left transition-colors text-white"
                    >
                      <ListFilter className="w-4 h-4 text-purple-400" />
                      <span>Activity &amp; Audit Logs</span>
                    </button>
                  )}

                  {onResetSeedData && (
                    <>
                      <div className="my-1 border-t border-white/[0.08]" />
                      <button
                        type="button"
                        onClick={() => { setShowMoreMenu(false); onResetSeedData(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-950/60 text-rose-300 text-left transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Reset Demo Data</span>
                      </button>
                    </>
                  )}

                  {onLogout && (
                    <>
                      <div className="my-1 border-t border-white/[0.08]" />
                      <button
                        type="button"
                        onClick={() => { setShowMoreMenu(false); onLogout(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-950/60 text-rose-300 text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
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
