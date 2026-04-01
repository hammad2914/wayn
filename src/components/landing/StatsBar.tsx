import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';

const CountUp: React.FC<{ to: number; suffix: string; start: boolean }> = ({ to, suffix, start }) => {
  const [val, setVal] = useState(0);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!start || ranRef.current) return;
    ranRef.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 2000, 1);
      setVal(Math.round((1 - (1 - t) ** 3) * to));
      if (t < 1) requestAnimationFrame(tick);
      else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [to, start]);

  return <>{val}{suffix}</>;
};

export const StatsBar: React.FC = () => {
  const { isMobile, isMd } = useBreakpoint();
  const { t } = useLanguage();
  const ref      = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const STATS = [
    { to: 50,  suffix: 'M+', label: t('stats.stat1Label') },
    { to: 99,  suffix: '%',  label: t('stats.stat2Label') },
    { to: 48,  suffix: '%',  label: t('stats.stat3Label') },
    { to: 150, suffix: '+',  label: t('stats.stat4Label') },
  ];

  return (
    <section style={{
      background: 'linear-gradient(135deg, #F5C842 0%, #D4A017 100%)',
      padding: isMobile ? '48px 20px' : '64px 24px',
    }}>
      <div
        ref={ref}
        className="lp-grid-4"
        style={{ maxWidth: 1100, margin: '0 auto' }}
      >
        {STATS.map(({ to, suffix, label }) => (
          <div
            key={label}
            style={{
              padding: isMobile ? '12px 8px' : '0 16px',
              borderRight: '1px solid rgba(10,14,39,0.1)',
              // Remove right border on last item handled via CSS below
            }}
          >
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: isMobile ? 36 : isMd ? 42 : 52,
              fontWeight: 800, color: '#0A0E27',
              lineHeight: 1, marginBottom: 8,
            }}>
              <CountUp to={to} suffix={suffix} start={isInView} />
            </div>
            <div style={{
              fontSize: isMobile ? 13 : 15, fontWeight: 600,
              color: 'rgba(10,14,39,0.68)', letterSpacing: '0.01em',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
