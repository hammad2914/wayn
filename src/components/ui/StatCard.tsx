import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon?: string;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: string;
  trendUp?: boolean;
  progressRing?: { value: number; max: number };
  color?: string;
}

const CountUp: React.FC<{ target: number; duration?: number }> = ({ target, duration = 1200 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setVal(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val}</>;
};

export const StatCard: React.FC<StatCardProps> = ({
  value, label, sublabel, trend, trendUp, progressRing, color = '#0B7A5C',
}) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(14,26,23,0.1)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', color: 'rgba(14,26,23,0.74)', fontWeight: 500 }}>{label}</div>
        {progressRing && (
          <svg width={40} height={40} viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={24} cy={24} r={18} fill="none" stroke="rgba(14,26,23,0.13)" strokeWidth={4} />
            <circle
              cx={24} cy={24} r={18} fill="none" stroke={color} strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - Math.min(progressRing.value / progressRing.max, 1))}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
        )}

        {trend && (
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: trendUp ? '#10B981' : '#EF4444',
            background: trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            padding: '2px 8px', borderRadius: '20px',
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>

      <div style={{ fontSize: '32px', fontWeight: 700, color: '#0E1A17', lineHeight: 1 }}>
        {isNumeric && typeof value === 'number' ? (
          <CountUp target={value} />
        ) : (
          value
        )}
      </div>
      {sublabel && <div style={{ fontSize: '12px', color: 'rgba(14,26,23,0.53)', marginTop: '3px' }}>{sublabel}</div>}
    </motion.div>
  );
};
