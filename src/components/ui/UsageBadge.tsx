import React from 'react';

interface UsageBadgeProps {
  service: string;
  used: number;
  limit: number;
  compact?: boolean;
}

export const UsageBadge: React.FC<UsageBadgeProps> = ({ service, used, limit, compact = false }) => {
  const pct   = limit > 0 ? (used / limit) * 100 : 0;
  const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  const bg    = pct >= 100 ? 'rgba(239,68,68,0.1)' : pct >= 80 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';
  const border= pct >= 100 ? 'rgba(239,68,68,0.3)' : pct >= 80 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';

  if (pct >= 100) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '20px',
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#EF4444', fontSize: '12px', fontWeight: 600,
      }}>
        <span>⛔</span>
        <span>Limit reached — upgrade to continue</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: '4px',
      padding: compact ? '4px 8px' : '6px 12px',
      background: bg, border: `1px solid ${border}`,
      borderRadius: '10px', minWidth: compact ? 'auto' : '120px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: compact ? '11px' : '12px', color: 'rgba(255,255,255,0.6)' }}>{service}</span>
        <span style={{ fontSize: compact ? '11px' : '12px', fontWeight: 700, color }}>
          {used} / {limit}
        </span>
      </div>
      {!compact && (
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(pct, 100)}%`,
            background: color, borderRadius: '2px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
};
