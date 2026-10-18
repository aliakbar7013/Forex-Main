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
  Clock,
  ChevronDown,
  Check,
  Layers
} from 'lucide-react';
import { SessionClocks } from '@/lib/sessionTracker';
import { soundEngine } from '@/lib/soundEngine';

interface HeaderProps {
  clocks: SessionClocks;
  isConnected: boolean;
  authSession?: { authenticated: boolean; role?: 'ADMIN' | 'USER'; label?: string; pin?: string };
  currentVersion?: 'v1' | 'v2';
  onSelectVersion?: (version: 'v1' | 'v2') => void;
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
  currentVersion = 'v1',
  onSelectVersion,
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
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  const audioMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const versionMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(event.target as Node)) {
        setShowAudioPopover(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (versionMenuRef.current && !versionMenuRef.current.contains(event.target as Node)) {
        setShowVersionDropdown(false);
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
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* LEFT: Brand Logo & Title (Apple/Stripe Clean Typography) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-white font-bold shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-sans">
                  Apex <span className="text-slate-500 font-normal">Signals</span>
                </span>
                {/* Version Selector Dropdown */}
                <div className="relative" ref={versionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowVersionDropdown(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-slate-800 text-[11px] font-bold font-mono transition-colors shadow-2xs cursor-pointer"
                    title="Switch Dashboard Version"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentVersion === 'v2' ? 'bg-purple-600 animate-pulse' : 'bg-blue-600'}`} />
                    <span>{currentVersion.toUpperCase()}</span>
                    <span className="text-[10px] text-slate-400 font-sans font-medium hidden sm:inline">
                      {currentVersion === 'v1' ? '• v1' : '• v2'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showVersionDropdown && (
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Select Version</span>
                        <Layers className="w-3 h-3 text-slate-400" />
                      </div>

                      <div className="mt-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectVersion?.('v1');
                            setShowVersionDropdown(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            currentVersion === 'v1' ? 'bg-blue-50/80 border border-blue-200/60 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>Version 1 (v1)</span>
                              {currentVersion === 'v1' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-snug">
                              Exact original minimal design with Live Signals, OANDA broker feeds, and Date of Entry.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectVersion?.('v2');
                            setShowVersionDropdown(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            currentVersion === 'v2' ? 'bg-purple-50/80 border border-purple-200/60 text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-purple-600 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                Version 2 (v2)
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-200 text-purple-800">
                                  ACTIVE
                                </span>
                              </span>
                              {currentVersion === 'v2' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-snug">
                              Next-gen workspace. All upcoming changes and modifications apply here.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Interbank Quantitative Execution
              </p>
            </div>
          </div>

          {/* CENTER: Clocks & LuxAlgo Sessions Pill (Crisp Apple Segmented Pill) */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-xs">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 shadow-xs">
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">NY</span>
              <strong className="text-slate-800 font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.nyTime}
              </strong>
            </div>
            
            <span className="text-slate-300 font-bold">•</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 shadow-xs">
              <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">IST</span>
              <strong className="text-slate-800 font-bold tabular-nums text-xs sm:text-sm font-mono">
                {clocks.istTime}
              </strong>
            </div>

            {clocks.utcTime && (
              <>
                <span className="text-slate-300 font-bold hidden md:inline">•</span>
                <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200/60 shadow-xs">
                  <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">UTC</span>
                  <strong className="text-slate-800 font-bold tabular-nums text-xs sm:text-sm font-mono">
                    {clocks.utcTime}
                  </strong>
                </div>
              </>
            )}

            {clocks.activeSessions && clocks.activeSessions.length > 0 && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {clocks.activeSessions[0]}
              </span>
            )}
          </div>

          {/* RIGHT: Live Status, Telegram & Audio Tools */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Live Feed Status Dot */}
            <div className="flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden xs:inline tracking-normal text-[11px] font-medium">Live Connected</span>
              </span>
            </div>

            {/* Telegram Alerts Button */}
            {onOpenTelegram && (
              <button
                type="button"
                onClick={onOpenTelegram}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all shrink-0 shadow-xs"
                title="Configure Telegram Signal Alerts"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
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
                    ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100' 
                    : 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                }`}
                title={isMuted ? 'Unmute Audio Chimes' : 'Audio Settings'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Audio Controls Popover */}
              {showAudioPopover && (
                <div className="absolute right-0 mt-2 w-56 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-slate-800 mb-2.5 font-medium">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      Alert Audio
                    </span>
                    <button
                      type="button"
                      onClick={() => soundEngine.playBuySignalChime()}
                      className="text-[11px] text-blue-600 font-semibold hover:underline"
                    >
                      Test Chime
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 font-mono font-medium w-8 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Mute Sounds</span>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        isMuted 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
              <div className="flex items-center gap-1.5">
                {authSession.role === 'ADMIN' ? (
                  <>
                    <button
                      type="button"
                      onClick={onOpenPinManager}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition-all shadow-xs"
                      title="Master Admin PIN: 9398"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline font-mono">PIN: 9398</span>
                      <span className="sm:hidden font-mono">9398</span>
                    </button>

                    {onOpenPinManager && (
                      <button
                        type="button"
                        onClick={onOpenPinManager}
                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-all shadow-xs"
                        title="Manage user access PINs"
                      >
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>PINs</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{authSession.label || 'Trader'}</span>
                  </div>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-all shadow-xs"
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
                className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-xs"
                title="Options & Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-52 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in flex flex-col gap-0.5 text-xs font-medium text-slate-700">
                  {authSession?.role === 'ADMIN' && onOpenPinManager && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenPinManager(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors text-slate-800"
                    >
                      <Key className="w-4 h-4 text-slate-500" />
                      <span>Manage Access PINs</span>
                    </button>
                  )}

                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenSettings(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors text-slate-800"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Risk &amp; Account Sizing</span>
                    </button>
                  )}

                  {onOpenLogs && (
                    <button
                      type="button"
                      onClick={() => { setShowMoreMenu(false); onOpenLogs(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors text-slate-800"
                    >
                      <ListFilter className="w-4 h-4 text-blue-600" />
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
                        <RotateCcw className="w-4 h-4 text-rose-500" />
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
                        <LogOut className="w-4 h-4 text-rose-500" />
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
