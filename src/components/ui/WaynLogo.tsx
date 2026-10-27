import React from 'react';

interface Props {
  /** cap height of the wordmark in px; the mark scales with it */
  size?:  number;
  /** 'dark' for dark backgrounds (dashboard, auth pages), 'light' for the landing page */
  tone?:  'dark' | 'light';
  /** mark only, for the collapsed sidebar and small headers */
  markOnly?: boolean;
}

const GREEN_ON_LIGHT = '#0B7A5C';
const GREEN_ON_DARK  = '#34D399';

/** A map pin turned on its side: a drop whose point sits at the bottom left */
export const WaynMark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M12 2a8 8 0 0 1 8 8c0 4.4-3.6 8-8 8H4v-8a8 8 0 0 1 8-8Z" fill={color} />
    <circle cx="12" cy="10" r="3.2" fill="#fff" />
  </svg>
);

export const WaynLogo: React.FC<Props> = ({ size = 22, tone = 'dark', markOnly = false }) => {
  const green = tone === 'light' ? GREEN_ON_LIGHT : GREEN_ON_DARK;
  const ink   = tone === 'light' ? '#0E1A17' : '#FFFFFF';

  if (markOnly) return <WaynMark size={size * 1.3} color={green} />;

  return (
    <span
      aria-label="Wayn"
      dir="ltr"
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32, lineHeight: 1 }}
    >
      <WaynMark size={size * 1.1} color={green} />
      <span style={{ fontFamily: "'Readex Pro', 'Sora', sans-serif", fontWeight: 700, fontSize: size, letterSpacing: '-0.03em', color: ink }}>
        wayn
      </span>
      <span style={{ fontFamily: "'Readex Pro', 'Cairo', sans-serif", fontWeight: 500, fontSize: size * 0.82, color: green }}>
        وين
      </span>
    </span>
  );
};
