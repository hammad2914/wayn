import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatchAPI, type Today } from '../services/dispatch';

// Drivers mark stops from their phones, so the dashboard keeps itself current:
// every 30 seconds, or every 3 while new orders are still being cleaned.
// It stops asking while the tab is in the background.
export function useToday() {
  const [data, setData] = useState<Today | null>(null);
  const [error, setError] = useState(false);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let timer: number | undefined, gone = false;
    const load = async () => {
      window.clearTimeout(timer);
      try {
        const next = await dispatchAPI.today();
        if (gone) return;
        setData(next);
        setError(false);
        const cleaning = next.orders.some(o => o.state === 'cleaning');
        if (!document.hidden) timer = window.setTimeout(load, cleaning ? 3000 : 30000);
      } catch {
        if (gone) return;
        setError(true);
        timer = window.setTimeout(load, 30000);
      }
    };
    loadRef.current = load;
    void load();
    const wake = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', wake);
    return () => { gone = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', wake); };
  }, []);

  const reload = useCallback(() => loadRef.current(), []);
  return { data, error, reload };
}
