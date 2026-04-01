import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

export interface Toast {
  id:      string;
  type:    'success' | 'error' | 'warning' | 'info';
  title:   string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast:  (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [], toast: () => {}, dismiss: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id: string) =>
    setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const icons = {
  success: 'solar:check-circle-bold-duotone',
  error:   'solar:close-circle-bold-duotone',
  warning: 'solar:danger-triangle-bold-duotone',
  info:    'solar:info-circle-bold-duotone',
};

const tColors = {
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',
};

const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.92 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'rgba(12,17,45,0.97)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${tColors[t.type]}40`,
              borderLeft: `3px solid ${tColors[t.type]}`,
              borderRadius: '12px',
              padding: '12px 16px',
              minWidth: '300px',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
            }}
          >
            <Icon icon={icons[t.type]} width={22} color={tColors[t.type]} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>{t.title}</p>
              {t.message && <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{t.message}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
              <Icon icon="solar:close-bold" width={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
