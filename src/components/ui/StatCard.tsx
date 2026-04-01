import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface StatCardProps {
  icon: string;
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
  icon, value, label, sublabel, trend, trendUp, progressRing, color = '#F5C842',
}) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(245,200,66,0.12)' }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(12,17,45,0.88)',
        border: '1px solid rgba(245,200,66,0.18)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gold accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '10px',
          background: `${color}1A`, border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon icon={icon} width={20} color={color} />
        </div>

        {progressRing && (
          <svg width={48} height={48} viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={24} cy={24} r={18} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
            <circle
              cx={24} cy={24} r={18} fill="none" stroke={color} strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - Math.min(progressRing.value / progressRing.max, 1))}
              style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color}80)` }}
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

      <div style={{ fontSize: '32px', fontFamily: "'Sora', sans-serif", fontWeight: 800, color, lineHeight: 1 }}>
        {isNumeric && typeof value === 'number' ? (
          <CountUp target={value} />
        ) : (
          value
        )}
      </div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '6px', fontWeight: 500 }}>{label}</div>
      {sublabel && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{sublabel}</div>}
    </motion.div>
  );
};
