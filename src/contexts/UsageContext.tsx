import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Usage } from '../types';
import { BACKEND_API } from '../config/api';
import { useAuth } from '../hooks/useAuth';

export interface DailyPoint {
  date:       string;
  day:        string;
  normalizer: number;
  optimizer:  number;
}

export interface ActivityItem {
  id:        string;
  service:   'address_normalizer' | 'route_optimizer';
  summary:   string | null;
  createdAt: string;
}

interface UsageContextValue {
  usage:               Usage | null;
  isLoading:           boolean;
  canUseNormalizer:    boolean;
  canUseOptimizer:     boolean;
  normalizerRemaining: number;
  optimizerRemaining:  number;
  history:             DailyPoint[];
  activity:            ActivityItem[];
  refresh:             () => Promise<void>;
  increment: (
    service:  'address_normalizer' | 'route_optimizer',
    summary?: string,
  ) => Promise<{ ok: boolean; limitReached: boolean }>;
}

const UsageContext = createContext<UsageContextValue | null>(null);

export const UsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();

  const [usage,     setUsage]    = useState<Usage | null>(null);
  const [history,   setHistory]  = useState<DailyPoint[]>([]);
  const [activity,  setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setLoad]     = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${token}`,
  }), [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoad(true);
    try {
      const [usageRes, historyRes, activityRes] = await Promise.all([
        fetch(`${BACKEND_API}/usage`,          { headers: authHeaders() }),
        fetch(`${BACKEND_API}/usage/history`,  { headers: authHeaders() }),
        fetch(`${BACKEND_API}/usage/activity`, { headers: authHeaders() }),
      ]);
      if (usageRes.ok)    setUsage(   (await usageRes.json()).data    as Usage);
      if (historyRes.ok)  setHistory( (await historyRes.json()).data  as DailyPoint[]);
      if (activityRes.ok) setActivity((await activityRes.json()).data as ActivityItem[]);
    } catch { /* no-op */ }
    finally { setLoad(false); }
  }, [token, authHeaders]);

  const increment = useCallback(async (
    service:  'address_normalizer' | 'route_optimizer',
    summary?: string,
  ) => {
    if (!token) return { ok: false, limitReached: false };
    try {
      const res = await fetch(`${BACKEND_API}/usage/increment`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ service, summary }),
      });
      if (res.status === 403) return { ok: false, limitReached: true };
      if (res.ok) {
        const json = await res.json();
        // Update usage immediately (sidebar updates instantly)
        setUsage(json.data as Usage);
        // Background refresh of history + activity
        Promise.all([
          fetch(`${BACKEND_API}/usage/history`,  { headers: authHeaders() }).then(r => r.ok ? r.json() : null).then(j => j && setHistory(j.data)),
          fetch(`${BACKEND_API}/usage/activity`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).then(j => j && setActivity(j.data)),
        ]);
        return { ok: true, limitReached: false };
      }
    } catch { /* no-op */ }
    return { ok: false, limitReached: false };
  }, [token, authHeaders]);

  // Fetch once on mount / token change
  useEffect(() => { refresh(); }, [refresh]);

  const canUseNormalizer    = !usage || usage.addressNormalizerCount < usage.addressNormalizerLimit;
  const canUseOptimizer     = !usage || usage.routeOptimizerCount    < usage.routeOptimizerLimit;
  const normalizerRemaining = usage ? Math.max(0, usage.addressNormalizerLimit - usage.addressNormalizerCount) : 10;
  const optimizerRemaining  = usage ? Math.max(0, usage.routeOptimizerLimit    - usage.routeOptimizerCount)   : 5;

  return (
    <UsageContext.Provider value={{
      usage, isLoading, canUseNormalizer, canUseOptimizer,
      normalizerRemaining, optimizerRemaining,
      history, activity, refresh, increment,
    }}>
      {children}
    </UsageContext.Provider>
  );
};

export function useUsageContext(): UsageContextValue {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsageContext must be used inside <UsageProvider>');
  return ctx;
}
