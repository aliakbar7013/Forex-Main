'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Signal, 
  RiskSettings, 
  IPDABiasRecord, 
  SignalStatus, 
  BiasDirection,
  CentralBankRate,
  IPDAPairBias,
  IPDAOverrideMode,
  AuthSession
} from '@/types';
import { getCurrentMarketClocks, getTradingSessions, SessionClocks } from '@/lib/sessionTracker';
import { soundEngine } from '@/lib/soundEngine';
import { Header } from '@/components/dashboard/Header';
import { SessionRibbon } from '@/components/dashboard/SessionRibbon';
import { StrategyControlCards } from '@/components/dashboard/StrategyControlCards';
import { IpdaDirectionMatrix } from '@/components/dashboard/IpdaDirectionMatrix';
import { FilterAndControlsBar } from '@/components/dashboard/FilterAndControlsBar';
import { SignalCard } from '@/components/dashboard/SignalCard';
import { SignalsTable } from '@/components/dashboard/SignalsTable';
import { WebhookSimulatorModal } from '@/components/modals/WebhookSimulatorModal';
import { WebhookDocsModal } from '@/components/modals/WebhookDocsModal';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';
import { CentralBankRatesModal } from '@/components/modals/CentralBankRatesModal';
import { ActivityLogsDrawer } from '@/components/modals/ActivityLogsDrawer';
import { PayloadViewerModal } from '@/components/modals/PayloadViewerModal';
import { CreateSignalModal } from '@/components/modals/CreateSignalModal';
import { CbdrStrategyRulesModal } from '@/components/modals/CbdrStrategyRulesModal';
import { TelegramSettingsModal } from '@/components/modals/TelegramSettingsModal';
import { PinLoginScreen } from '@/components/auth/PinLoginScreen';
import { PinManagerModal } from '@/components/modals/PinManagerModal';
import { BacktestStudio } from '@/components/dashboard/BacktestStudio';
import { TradingViewRealtimeChart } from '@/components/dashboard/TradingViewRealtimeChart';
import { StrategyStudio } from '@/components/dashboard/StrategyStudio';
import { getSignalTradingDay } from '@/lib/strategyValidator';
import { Sparkles, BarChart3, Zap, Scale, BarChart2, CheckCircle2, AlertTriangle, X, Radio, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  STATIC_INITIAL_SIGNALS, 
  STATIC_DEFAULT_RISK, 
  STATIC_CENTRAL_BANK_RATES,
  STATIC_IPDA_BIASES 
} from '@/lib/staticSeedData';

/**
 * Smooth In-Place Signal Reconciler
 * Prevents unnecessary re-renders, layout jumping, and screen flashes during live tick polling.
 */
function mergeSignalsSmoothly(prevSignals: Signal[], nextSignals: Signal[]): Signal[] {
  if (!prevSignals || prevSignals.length === 0) return nextSignals;
  if (!nextSignals || nextSignals.length === 0) return prevSignals;

  const nextMap = new Map<string, Signal>(nextSignals.map(s => [s.id, s]));
  let hasChanges = false;

  const reconciled = prevSignals.map(prev => {
    const next = nextMap.get(prev.id);
    if (!next) {
      hasChanges = true;
      return null;
    }
    nextMap.delete(prev.id);

    // Deep compare mutable live feed fields (avoid thrashing on unchanged ticks)
    const isPriceChanged = prev.raw_payload?.currentPrice !== next.raw_payload?.currentPrice;
    const isFloatingPipsChanged = prev.raw_payload?.floatingPips !== next.raw_payload?.floatingPips;
    const isStatusChanged = prev.status !== next.status || prev.outcome !== next.outcome;
    const isNotesChanged = prev.notes !== next.notes;
    const isPnlChanged = prev.realized_pnl_usd !== next.realized_pnl_usd || prev.exit_price !== next.exit_price;
    const isValidationChanged = prev.validation?.overallStatus !== next.validation?.overallStatus;

    if (isPriceChanged || isFloatingPipsChanged || isStatusChanged || isNotesChanged || isPnlChanged || isValidationChanged) {
      hasChanges = true;
      return next;
    }
    return prev;
  }).filter(Boolean) as Signal[];

  if (nextMap.size > 0) {
    hasChanges = true;
    const newSignals = Array.from(nextMap.values());
    return [...newSignals, ...reconciled];
  }

  return hasChanges ? reconciled : prevSignals;
}

export default function TradingDashboard() {
  // PIN Authentication & Session State
  const [authSession, setAuthSession] = useState<AuthSession>({ authenticated: false });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPinManagerOpen, setIsPinManagerOpen] = useState(false);

  // Check auth session on mount
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const storedPin = typeof window !== 'undefined' ? localStorage.getItem('auth_pin_code') : null;
        if (!storedPin) {
          if (isMounted) {
            setAuthSession({ authenticated: false });
            setIsAuthLoading(false);
          }
          return;
        }

        const headers: Record<string, string> = { 'x-auth-pin': storedPin };
        try {
          const res = await fetch('/api/auth/me', { headers });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.authenticated) {
              setAuthSession({
                authenticated: true,
                role: data.role,
                label: data.label,
                pin: data.pin || storedPin
              });
              setIsAuthLoading(false);
              return;
            }
          }
        } catch {
          // API not available, proceed to client validation
        }

        // Static host fallback
        if (storedPin === '9398') {
          if (isMounted) {
            setAuthSession({
              authenticated: true,
              role: 'ADMIN',
              label: 'Master Admin (Owner)',
              pin: '9398'
            });
            setIsAuthLoading(false);
          }
          return;
        }

        try {
          const storedCustomPins = localStorage.getItem('auth_custom_pins');
          if (storedCustomPins) {
            const list = JSON.parse(storedCustomPins);
            const found = list.find((p: any) => p.pin === storedPin && p.is_active);
            if (found && isMounted) {
              setAuthSession({
                authenticated: true,
                role: found.role || 'USER',
                label: found.label || 'Authorized Trader',
                pin: storedPin
              });
              setIsAuthLoading(false);
              return;
            }
          }
        } catch {}

        if (isMounted) {
          setAuthSession({ authenticated: false });
        }
      } catch {
        if (isMounted) {
          setAuthSession({ authenticated: false });
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = useCallback((session: { role: 'ADMIN' | 'USER'; label: string; pin: string }) => {
    setAuthSession({
      authenticated: true,
      role: session.role,
      label: session.label,
      pin: session.pin
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('auth_pin_code');
      localStorage.removeItem('auth_pin_role');
      localStorage.removeItem('auth_pin_label');
    } catch {}
    setAuthSession({ authenticated: false });
  }, []);

  // Main Data States
  const [signals, setSignals] = useState<Signal[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [ipdaBiases, setIpdaBiases] = useState<IPDABiasRecord[]>(STATIC_IPDA_BIASES);
  const [ipdaMatrix, setIpdaMatrix] = useState<IPDAPairBias[]>([]);
  const [centralBankRates, setCentralBankRates] = useState<CentralBankRate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  // 5-Second Real-Time Auto-Tick & Trade Evaluation States
  const [autoSync5s, setAutoSync5s] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(5);
  const [tradeToast, setTradeToast] = useState<{ id: string; symbol: string; outcome: 'WIN' | 'LOSS'; message: string; pnl: number } | null>(null);

  // Active Main View Tab
  const [activeTab, setActiveTab] = useState<'signals' | 'strategy' | 'chart' | 'backtest' | 'matrix'>('signals');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string>('GBPNZD');
  const [selectedChartSignal, setSelectedChartSignal] = useState<Signal | null>(null);

  // Time & Session Clocks State
  const [clocks, setClocks] = useState<SessionClocks>(() => getCurrentMarketClocks());
  const [sessions, setSessions] = useState(() => getTradingSessions());

  // Filter & View States
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCbdrRulesOpen, setIsCbdrRulesOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [viewingSignalPayload, setViewingSignalPayload] = useState<Signal | null>(null);

  // 1. Initial Data Fetch & Background Sync
  const fetchAllData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && signals.length === 0) {
        setIsLoading(true);
      } else {
        setIsBackgroundSyncing(true);
      }

      let fetchedSignals: Signal[] | null = null;
      let fetchedRisk: RiskSettings | null = null;
      let fetchedRates: CentralBankRate[] | null = null;
      let fetchedBiases: IPDABiasRecord[] | null = null;
      let fetchedMatrix: IPDAPairBias[] | null = null;

      try {
        const [signalsRes, riskRes, ratesRes, ipdaRes, matrixRes] = await Promise.all([
          fetch('/api/signals'),
          fetch('/api/risk'),
          fetch('/api/ipda/rates'),
          fetch('/api/ipda'),
          fetch('/api/ipda/matrix')
        ]);

        if (signalsRes.ok) {
          const sData = await signalsRes.json();
          if (sData?.signals && Array.isArray(sData.signals)) {
            fetchedSignals = sData.signals;
          }
        }
        if (riskRes.ok) {
          const rData = await riskRes.json();
          if (rData?.settings) fetchedRisk = rData.settings;
        }
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          if (ratesData?.rates) fetchedRates = ratesData.rates;
        }
        if (ipdaRes.ok) {
          const ipdaData = await ipdaRes.json();
          if (ipdaData?.biases && Array.isArray(ipdaData.biases)) {
            fetchedBiases = ipdaData.biases;
          }
        }
        if (matrixRes.ok) {
          const matrixData = await matrixRes.json();
          if (matrixData?.matrix && Array.isArray(matrixData.matrix)) {
            fetchedMatrix = matrixData.matrix;
          }
        }
      } catch {
        // Static hosting mode
      }

      // If backend not reachable (static host on Hostinger), load static seed signals & live prices
      if (!fetchedSignals || fetchedSignals.length === 0) {
        fetchedSignals = STATIC_INITIAL_SIGNALS;
      }
      if (!fetchedRisk) {
        fetchedRisk = STATIC_DEFAULT_RISK;
      }
      if (!fetchedRates) {
        fetchedRates = STATIC_CENTRAL_BANK_RATES;
      }
      if (!fetchedBiases || fetchedBiases.length === 0) {
        fetchedBiases = STATIC_IPDA_BIASES;
      }

      setSignals(prev => mergeSignalsSmoothly(prev, fetchedSignals!));
      setRiskSettings(fetchedRisk);
      setCentralBankRates(fetchedRates);
      setIpdaBiases(fetchedBiases);
      if (fetchedMatrix && fetchedMatrix.length > 0) {
        setIpdaMatrix(fetchedMatrix);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setSignals(prev => prev.length > 0 ? prev : STATIC_INITIAL_SIGNALS);
      setRiskSettings(prev => prev || STATIC_DEFAULT_RISK);
      setCentralBankRates(prev => prev.length > 0 ? prev : STATIC_CENTRAL_BANK_RATES);
      setIpdaBiases(prev => prev.length > 0 ? prev : STATIC_IPDA_BIASES);
    } finally {
      if (isInitial) setIsLoading(false);
      setIsBackgroundSyncing(false);
    }
  }, [signals.length]);

  useEffect(() => {
    if (authSession.authenticated) {
      fetchAllData(true);
    }
  }, [authSession.authenticated, fetchAllData]);

  // 2. Market Clocks Ticker (Every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClocks(getCurrentMarketClocks(now));
      setSessions(getTradingSessions(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Real-Time Server-Sent Events (SSE) Live Stream
  useEffect(() => {
    if (!authSession.authenticated) return;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/signals/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('NEW_SIGNAL', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const newSignal: Signal = parsed.data;
          
          setSignals(prev => [newSignal, ...prev.filter(s => s.id !== newSignal.id)]);

          // Trigger Sound Alert Chime
          if (newSignal.action === 'SELL') {
            soundEngine.playSellSignalChime();
          } else {
            soundEngine.playBuySignalChime();
          }
        } catch (err) {
          console.error('Error handling NEW_SIGNAL SSE event', err);
        }
      });

      eventSource.addEventListener('SIGNAL_UPDATED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const updated: Signal = parsed.data;
          setSignals(prev => prev.map(s => s.id === updated.id ? updated : s));
        } catch (err) {
          console.error('Error handling SIGNAL_UPDATED SSE event', err);
        }
      });

      eventSource.addEventListener('TRADE_RESOLVED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const { id, symbol, outcome, exitPrice } = parsed.data;
          if (outcome === 'WIN') {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            soundEngine.playWinSound();
            setTradeToast({
              id: `${id}_${Date.now()}`,
              symbol,
              outcome: 'WIN',
              message: `🎉 TARGET HIT (1:3 TP at ${exitPrice})! Achieved +3.0R • Moved to Backtest Archive`,
              pnl: 0
            });
          } else {
            soundEngine.playLossSound();
            setTradeToast({
              id: `${id}_${Date.now()}`,
              symbol,
              outcome: 'LOSS',
              message: `⚠️ STOP LOSS HIT (at ${exitPrice})! -1.0R • Moved to Backtest Archive`,
              pnl: 0
            });
          }
        } catch (err) {
          console.error('Error handling TRADE_RESOLVED SSE event', err);
        }
      });

      eventSource.addEventListener('SIGNAL_DELETED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const { id } = parsed.data;
          setSignals(prev => prev.filter(s => s.id !== id));
        } catch (err) {
          console.error('Error handling SIGNAL_DELETED SSE event', err);
        }
      });

      eventSource.addEventListener('RISK_UPDATED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setRiskSettings(parsed.data);
        } catch (err) {
          console.error('Error handling RISK_UPDATED SSE event', err);
        }
      });

      eventSource.addEventListener('IPDA_UPDATED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.data?.matrix) {
            setIpdaMatrix(parsed.data.matrix);
          }
          if (parsed.data?.rates) {
            setCentralBankRates(parsed.data.rates);
          }
        } catch (err) {
          console.error('Error handling IPDA_UPDATED SSE event', err);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [authSession.authenticated]);

  // 4. 5-Second Automated Live Price & Trade Monitoring Ticker (Smooth background polling)
  useEffect(() => {
    if (!authSession.authenticated || !autoSync5s) return;

    let isBusy = false;
    const interval = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (!isBusy) {
            isBusy = true;
            setIsBackgroundSyncing(true);
            fetch('/api/signals/live-sync', { method: 'POST' })
              .then(res => res.json())
              .then(data => {
                if (data.signals) {
                  setSignals(prevSignals => mergeSignalsSmoothly(prevSignals, data.signals));
                }
              })
              .catch(() => {
                // Static micro-tick simulation for active trades
                setSignals(prevSignals => prevSignals.map(sig => {
                  if (sig.status !== 'IN_TRADE') return sig;
                  const delta = (Math.random() - 0.48) * 0.00015;
                  const basePrice = typeof sig.raw_payload?.currentPrice === 'number' ? sig.raw_payload.currentPrice : sig.entry;
                  const currentP = Math.max(0.0001, basePrice + delta);
                  const pips = sig.action === 'BUY'
                    ? (currentP - sig.entry) * 10000
                    : (sig.entry - currentP) * 10000;
                  return {
                    ...sig,
                    raw_payload: {
                      ...sig.raw_payload,
                      currentPrice: Math.round(currentP * 100000) / 100000,
                      floatingPips: Math.round(pips * 10) / 10
                    }
                  };
                }));
              })
              .finally(() => {
                isBusy = false;
                setTimeout(() => setIsBackgroundSyncing(false), 800);
              });
          }
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [authSession.authenticated, autoSync5s]);

  // 5. Auto-Dismiss Trade Resolution Alerts (Stop Loss / Take Profit) after exactly 5 Seconds
  useEffect(() => {
    if (!tradeToast) return;
    const timer = setTimeout(() => {
      setTradeToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [tradeToast]);

  // 6. Signal Action Handlers
  const handleUpdateSignalStatus = useCallback(async (
    id: string, 
    status: SignalStatus, 
    outcome?: 'WIN' | 'LOSS' | 'BE', 
    pnlUsd?: number
  ) => {
    try {
      const res = await fetch(`/api/signals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, outcome, pnlUsd })
      });
      const data = await res.json();
      if (data.archived || status === 'SL_HIT' || status === 'CLOSED_PROFIT' || status === 'TP1_HIT' || outcome === 'WIN' || outcome === 'LOSS' || outcome === 'BE') {
        setSignals(prev => prev.filter(s => s.id !== id));
      } else if (data.signal) {
        setSignals(prev => prev.map(s => s.id === id ? data.signal : s));
      }
      if (data.riskSettings) {
        setRiskSettings(data.riskSettings);
      }
    } catch (err) {
      console.error('Failed to update signal status', err);
    }
  }, []);

  const handleDeleteSignal = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/signals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSignals(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete signal', err);
    }
  }, []);

  const handleToggleIpdaBias = useCallback(async (asset: string, currentBias: BiasDirection) => {
    const nextBias: BiasDirection = currentBias === 'BULLISH' ? 'BEARISH' : 'BULLISH';
    try {
      const res = await fetch('/api/ipda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, bias: nextBias })
      });
      const data = await res.json();
      if (data.bias) {
        setIpdaBiases(prev => prev.map(b => b.asset === asset ? data.bias : b));
      }
    } catch (err) {
      console.error('Failed to toggle IPDA bias', err);
    }
  }, []);

  const handleSetPairOverride = useCallback(async (symbol: string, mode: IPDAOverrideMode) => {
    try {
      const res = await fetch('/api/ipda/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, override_mode: mode })
      });
      const data = await res.json();
      if (data.matrix) {
        setIpdaMatrix(data.matrix);
      }
    } catch (err) {
      console.error('Failed to set pair override', err);
    }
  }, []);

  const handleSyncLiveRates = useCallback(async () => {
    try {
      const res = await fetch('/api/ipda/sync', { method: 'POST' });
      const data = await res.json();
      if (data.matrix) setIpdaMatrix(data.matrix);
      if (data.rates) setCentralBankRates(data.rates);
    } catch (err) {
      console.error('Failed to sync live rates', err);
    }
  }, []);

  const handleSaveCentralBankRates = useCallback(async (updatedRates: Partial<CentralBankRate>[]) => {
    try {
      const res = await fetch('/api/ipda/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: updatedRates })
      });
      const data = await res.json();
      if (data.matrix) setIpdaMatrix(data.matrix);
      if (data.rates) setCentralBankRates(data.rates);
    } catch (err) {
      console.error('Failed to save central bank rates', err);
    }
  }, []);

  const handleSaveRiskSettings = useCallback(async (updated: Partial<RiskSettings> & { resetStats?: boolean }) => {
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.settings) {
        setRiskSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to save risk settings', err);
    }
  }, []);

  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const handleRefreshLiveSignals = useCallback(async () => {
    try {
      setIsRefreshingLive(true);
      setIsBackgroundSyncing(true);
      const res = await fetch('/api/signals/live-sync', { method: 'POST' });
      const data = await res.json();
      if (data.signals) {
        setSignals(prevSignals => mergeSignalsSmoothly(prevSignals, data.signals));
        soundEngine.playBuySignalChime();
      }
    } catch (err) {
      console.error('Failed to refresh live signals from API', err);
    } finally {
      setIsRefreshingLive(false);
      setIsBackgroundSyncing(false);
    }
  }, []);

  const handleResetSeedData = useCallback(async () => {
    if (!confirm('Reset dashboard to fresh demo signals and standard $50,000 risk settings?')) return;
    try {
      await fetch('/api/seed', { method: 'POST' });
      await fetchAllData();
      soundEngine.playBuySignalChime();
    } catch (err) {
      console.error('Failed to reset demo data', err);
    }
  }, [fetchAllData]);

  const handleViewPayload = useCallback((s: Signal) => {
    setViewingSignalPayload(s);
  }, []);

  // 5. Filtered Signals Computation
  // Ensure that live running trades (IN_TRADE) are always visible on the dashboard!
  const filteredSignals = useMemo(() => {
    return signals.filter(s => {
      // For CBDR: If pending entry on a non-trading day, do not display
      if (s.strategy === 'CBDR' && s.status === 'PENDING') {
        const { isCbdrValid } = getSignalTradingDay(s);
        if (!isCbdrValid) {
          return false;
        }
      }

      if (selectedStrategy !== 'ALL' && s.strategy.toUpperCase() !== selectedStrategy.toUpperCase()) {
        return false;
      }
      if (selectedStatus !== 'ALL' && s.status.toUpperCase() !== selectedStatus.toUpperCase()) {
        return false;
      }
      if (selectedDirection !== 'ALL' && s.action.toUpperCase() !== selectedDirection.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        const matchesSymbol = s.symbol.toUpperCase().includes(q);
        const matchesStrategy = s.strategy.toUpperCase().includes(q);
        const matchesNotes = s.notes?.toUpperCase().includes(q);
        if (!matchesSymbol && !matchesStrategy && !matchesNotes) return false;
      }
      return true;
    });
  }, [signals, selectedStrategy, selectedStatus, selectedDirection, searchQuery]);

  const handleOpenChart = useCallback((symbol: string, signal?: Signal) => {
    setSelectedChartSymbol(symbol);
    if (signal) setSelectedChartSignal(signal);
    setActiveTab('chart');
  }, []);

  const strategyCounts = useMemo(() => {
    return {
      all: signals.length,
      cbdr: signals.filter(s => s.strategy === 'CBDR').length,
      stopHunt: signals.filter(s => s.strategy === 'STOP_HUNT').length,
      newYork: signals.filter(s => s.strategy === 'NEW_YORK').length
    };
  }, [signals]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs tracking-widest text-slate-400">VERIFYING PIN AUTHORIZATION...</span>
        </div>
      </div>
    );
  }

  if (!authSession.authenticated) {
    return <PinLoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* 1. Top Navbar */}
      <Header
        clocks={clocks}
        isConnected={isConnected}
        authSession={authSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onResetSeedData={handleResetSeedData}
        onOpenTelegram={() => setIsTelegramOpen(true)}
        onOpenPinManager={() => setIsPinManagerOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Macro Session Timeline Bar */}
      <SessionRibbon sessions={sessions} />

      {/* 3. Primary Dashboard Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('signals')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'signals'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span>⚡ Live Signals</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[9px] sm:text-[10px] font-bold border border-blue-200">
                CBDR Mon–Wed
              </span>
            </button>

            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'strategy'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>📖 Strategy</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] sm:text-[10px] font-bold border border-emerald-200">
                Playbook &amp; Rules
              </span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'chart'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span>📈 Live Chart</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] sm:text-[10px] font-bold border border-emerald-200">
                TradingView
              </span>
            </button>

            <button
              onClick={() => setActiveTab('backtest')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'backtest'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              <span>📊 Backtest Archive</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[9px] sm:text-[10px] font-bold border border-purple-200">
                Active
              </span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>🌐 IPDA Matrix</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] sm:text-[10px] font-bold border border-emerald-200">
                28 Pairs
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Strategy Playbook & Rules Studio View */}
        <div className={activeTab === 'strategy' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'strategy'}>
          <StrategyStudio />
        </div>

        {/* Real-Time Interactive TradingView Live Chart View (Kept mounted to preserve chart state & drawings) */}
        <div className={activeTab === 'chart' ? 'space-y-6 block' : 'hidden'} aria-hidden={activeTab !== 'chart'}>
          <TradingViewRealtimeChart
            selectedSymbol={selectedChartSymbol}
            onSelectSymbol={(sym) => setSelectedChartSymbol(sym)}
            activeSignal={selectedChartSignal}
          />
        </div>

        {/* Backtesting & Trade History Archive Studio View (Kept mounted to preserve filters & scroll position) */}
        <div className={activeTab === 'backtest' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'backtest'}>
          <BacktestStudio />
        </div>

        {/* Full IPDA Central Bank Direction Matrix View */}
        <div className={activeTab === 'matrix' ? 'space-y-6 block' : 'hidden'} aria-hidden={activeTab !== 'matrix'}>
          <IpdaDirectionMatrix
            matrix={ipdaMatrix}
            isLoading={false}
            onOpenRatesModal={() => setIsRatesModalOpen(true)}
            onSetOverride={handleSetPairOverride}
            onSyncRates={handleSyncLiveRates}
          />
        </div>

        {/* Live Signal Stream View */}
        <div className={activeTab === 'signals' ? 'space-y-6 block' : 'hidden'} aria-hidden={activeTab !== 'signals'}>
          {/* Defensive Risk Stepping & Performance Engine */}
          <StrategyControlCards
            ipdaBiases={ipdaBiases}
            ipdaMatrix={ipdaMatrix}
            riskSettings={riskSettings}
            onToggleBias={handleToggleIpdaBias}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Filter and View Controls Bar */}
          <FilterAndControlsBar
            selectedStrategy={selectedStrategy}
            onSelectStrategy={setSelectedStrategy}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
            selectedDirection={selectedDirection}
            onSelectDirection={setSelectedDirection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            counts={strategyCounts}
            onOpenCreateSignal={() => setIsCreateOpen(true)}
            onRefreshLiveSignals={handleRefreshLiveSignals}
            isRefreshingLive={isRefreshingLive}
            isBackgroundSyncing={isBackgroundSyncing}
            autoSync5s={autoSync5s}
            onToggleAutoSync={() => setAutoSync5s(p => !p)}
            countdown={countdown}
          />

          {/* CBDR Non-Trading Day Banner for Thursday / Friday */}
          {(() => {
            const todayNYDay = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
            const isThursdayOrFriday = todayNYDay === 'Thursday' || todayNYDay === 'Friday';
            if (!isThursdayOrFriday || (selectedStrategy !== 'ALL' && selectedStrategy !== 'CBDR')) return null;

            return (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border border-amber-300 text-amber-950 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-slate-900 tracking-tight">
                        ⚠️ TODAY IS {todayNYDay.toUpperCase()} — CBDR NON-TRADING DAY
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-[10px] font-mono border border-amber-300">
                        Rule: Mon–Wed Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      Under ICT CBDR strategy rules, <strong>Thursday and Friday are strict Non-Trading Days</strong> (no new entries taken). Any active CBDR positions you are seeing below are <strong>running carry-over trades entered on previous valid trading sessions (Wednesday, Oct 7, 2026)</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs block text-slate-800">
                    📅 Entry Placed: Wednesday (Oct 7)
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Real-Time Trade Resolution Alert Toast / Banner (Auto-dismisses in 5s) */}
          {tradeToast && (
            <div className={`relative overflow-hidden p-4 rounded-2xl border shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              tradeToast.outcome === 'WIN'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  tradeToast.outcome === 'WIN' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
                }`}>
                  {tradeToast.outcome === 'WIN' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wide uppercase font-mono">
                      {tradeToast.symbol} Trade Resolved: {tradeToast.outcome}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      tradeToast.outcome === 'WIN'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      ⏱️ 5s Auto-Dismiss
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-0.5 text-slate-900">
                    {tradeToast.message}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTradeToast(null)}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Dismiss immediately"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 5-Second Animated Progress Bar */}
              <div 
                className={`absolute bottom-0 left-0 h-1 ${
                  tradeToast.outcome === 'WIN' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{
                  width: '100%',
                  animation: 'shrink 5s linear forwards'
                }}
              />
            </div>
          )}

          {/* Live Signal Feed */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-xs font-mono font-bold">Initializing Real-Time Stream...</p>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 mb-1">No active signals found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 font-medium">
                There are no signals matching your filter. Note that for CBDR, only Monday, Tuesday, and Wednesday trades are displayed. Check the Backtesting Archive for historical trades.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  Launch Webhook Simulator
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('backtest')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                >
                  View Backtest Archive
                </button>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSignals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onUpdateStatus={handleUpdateSignalStatus}
                  onDeleteSignal={handleDeleteSignal}
                  onViewPayload={handleViewPayload}
                  onOpenChart={handleOpenChart}
                />
              ))}
            </div>
          ) : (
            <SignalsTable
              signals={filteredSignals}
              onUpdateStatus={handleUpdateSignalStatus}
              onDeleteSignal={handleDeleteSignal}
              onViewPayload={handleViewPayload}
              onOpenChart={handleOpenChart}
            />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-900">Apex ICT Quantitative Trading Signals Engine • IPDA Central Bank Direction Filter Active</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 font-medium">
            CBDR 15m • Stop Hunt 5m • NY Indices 1m • Smooth Background Live Sync Active
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CentralBankRatesModal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        rates={centralBankRates}
        onSaveRates={handleSaveCentralBankRates}
        onSyncLiveRates={handleSyncLiveRates}
      />

      <WebhookSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSignalCreated={fetchAllData}
      />

      <WebhookDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        riskSettings={riskSettings}
        onSaveRiskSettings={handleSaveRiskSettings}
      />

      <ActivityLogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      <CreateSignalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSignalCreated={fetchAllData}
      />

      <PayloadViewerModal
        isOpen={!!viewingSignalPayload}
        onClose={() => setViewingSignalPayload(null)}
        signal={viewingSignalPayload}
      />

      <CbdrStrategyRulesModal
        isOpen={isCbdrRulesOpen}
        onClose={() => setIsCbdrRulesOpen(false)}
      />

      <TelegramSettingsModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />

      <PinManagerModal
        isOpen={isPinManagerOpen}
        onClose={() => setIsPinManagerOpen(false)}
        currentPin={authSession.pin || '9398'}
      />

    </div>
  );
}
