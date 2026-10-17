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
import { Sparkles, BarChart3, Zap, Scale, BarChart2, CheckCircle2, AlertTriangle, X, Radio, BookOpen, Clock } from 'lucide-react';
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
  // Strictly enforce strategy categorization & trading day rules:
  const filteredSignals = useMemo(() => {
    const todayNY = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
    const isCbdrTradingDay = todayNY === 'Monday' || todayNY === 'Tuesday' || todayNY === 'Wednesday';

    return signals.filter(s => {
      // 1. Mandatory CBDR Strategy Rule:
      // If s.strategy === 'CBDR':
      // - If pending entry on non-trading day (Thu/Fri/weekend), do not show
      if (s.strategy === 'CBDR' && s.status === 'PENDING' && !isCbdrTradingDay) {
        return false;
      }
      // - If trade has hit TP or SL, do not show in live running feed
      if (s.status === 'TP1_HIT' || s.status === 'TP2_HIT' || s.status === 'CLOSED_PROFIT' || s.status === 'SL_HIT' || s.status === 'CANCELLED') {
        return false;
      }

      // 2. Strict Strategy Categorization Filter:
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

  // Deduplicate by symbol on ALL view so no instrument appears twice ("as i dont need everying double double")
  const displayedSignals = useMemo(() => {
    if (selectedStrategy !== 'ALL') {
      return filteredSignals;
    }
    const seen = new Set<string>();
    const res: Signal[] = [];
    for (const s of filteredSignals) {
      const sym = s.symbol.toUpperCase();
      if (!seen.has(sym)) {
        seen.add(sym);
        res.push(s);
      }
    }
    return res;
  }, [filteredSignals, selectedStrategy]);

  const handleOpenChart = useCallback((symbol: string, signal?: Signal) => {
    setSelectedChartSymbol(symbol);
    if (signal) setSelectedChartSignal(signal);
    setActiveTab('chart');
  }, []);

  const strategyCounts = useMemo(() => {
    const todayNY = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
    const isCbdrTradingDay = todayNY === 'Monday' || todayNY === 'Tuesday' || todayNY === 'Wednesday';

    // Running CBDR trades (IN_TRADE) or valid new entries on Mon-Wed
    const cbdrSignals = signals.filter(s => s.strategy === 'CBDR' && (s.status === 'IN_TRADE' || (s.status === 'PENDING' && isCbdrTradingDay)));
    const stopHuntSignals = signals.filter(s => s.strategy === 'STOP_HUNT' && (s.status === 'IN_TRADE' || s.status === 'PENDING'));
    const newYorkSignals = signals.filter(s => s.strategy === 'NEW_YORK' && (s.status === 'IN_TRADE' || s.status === 'PENDING'));

    // Unique symbols on ALL view to match deduplicated cards
    const uniqueSymbols = new Set<string>();
    for (const s of [...stopHuntSignals, ...cbdrSignals, ...newYorkSignals]) {
      uniqueSymbols.add(s.symbol.toUpperCase());
    }

    return {
      all: uniqueSymbols.size,
      cbdr: cbdrSignals.length,
      stopHunt: stopHuntSignals.length,
      newYork: newYorkSignals.length
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#06080f] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative">
      
      {/* 1. Institutional Top Navbar */}
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

      {/* 2. Institutional Navigation Tabs Bar */}
      <div className="border-b border-white/[0.08] bg-[#080c14]/90 backdrop-blur-xl select-none sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('signals')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'signals'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>⚡ Live Signals</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[9px] font-bold border border-blue-500/20">
                Live Feed
              </span>
            </button>

            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'strategy'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>📖 Strategy</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/20">
                Playbook
              </span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'chart'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>📈 Live Chart</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/20">
                TradingView
              </span>
            </button>

            <button
              onClick={() => setActiveTab('backtest')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'backtest'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span>📊 Backtest Archive</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono text-[9px] font-bold border border-purple-500/20">
                180 Trades
              </span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>🌐 IPDA Matrix</span>
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/20">
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

        {/* Live Signal Stream View - Ultra Minimal Institutional Design */}
        <div className={activeTab === 'signals' ? 'space-y-6 block' : 'hidden'} aria-hidden={activeTab !== 'signals'}>
          
          {/* Minimal Filter and View Controls Bar */}
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

          {/* Real-Time Trade Resolution Alert Toast / Banner (Auto-dismisses in 5s) */}
          {tradeToast && (
            <div className={`relative overflow-hidden p-4 rounded-2xl border backdrop-blur-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              tradeToast.outcome === 'WIN'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  tradeToast.outcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      ⏱️ 5s Auto-Dismiss
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-0.5 text-white">
                    {tradeToast.message}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTradeToast(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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

          {/* Live Signal Feed Stream */}
          {isLoading ? (
            <div className="py-24 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-3" />
              <p className="text-xs font-mono font-bold text-slate-400 tracking-wider">INITIALIZING INSTITUTIONAL FEED...</p>
            </div>
          ) : displayedSignals.length === 0 ? (
            <div className="bg-[#0b101d]/80 border border-white/[0.08] rounded-2xl p-12 text-center backdrop-blur-xl shadow-xl">
              {selectedStrategy === 'CBDR' ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    No Running CBDR Trades
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-medium leading-relaxed">
                    Under ICT CBDR institutional rules, new entries are strictly taken on <strong className="text-slate-200">Monday, Tuesday, and Wednesday</strong> (London Session 03:00 – 11:45 NY). Previous trades that hit TP/SL have been archived to Backtest.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('STOP_HUNT')}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors"
                    >
                      View Live Stop Hunt Trades (Mon–Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('backtest')}
                      className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition-colors"
                    >
                      View CBDR Backtest Archive
                    </button>
                  </div>
                </>
              ) : selectedStrategy === 'NEW_YORK' ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    No Active New York Index Trades
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-medium leading-relaxed">
                    The New York Open Index model operates on NAS100, US30, and SPX500 during the 09:30 AM – 12:00 PM NY session.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('STOP_HUNT')}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors"
                    >
                      View Live Stop Hunt Trades
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">No active signals found</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-medium">
                    There are no signals matching your filter. Check the Backtesting Archive for historical trades.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSimulatorOpen(true)}
                      className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-xs transition-colors"
                    >
                      Launch Webhook Simulator
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('backtest')}
                      className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition-colors"
                    >
                      View Backtest Archive
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedSignals.map((signal) => (
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
              signals={displayedSignals}
              onUpdateStatus={handleUpdateSignalStatus}
              onDeleteSignal={handleDeleteSignal}
              onViewPayload={handleViewPayload}
              onOpenChart={handleOpenChart}
            />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#070b14]/90 backdrop-blur-xl py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-semibold text-slate-200">Apex ICT Institutional Terminal • IPDA Central Bank Direction Filter Active</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 font-medium">
            CBDR 15m • Stop Hunt 5m • NY Indices 1m • Smooth Live Tick Sync Active
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
