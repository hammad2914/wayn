import React from 'react';

interface Props {
  /** cap height of the wordmark in px; the mark scales with it */
  size?:  number;
  /** 'dark' (gold on navy) for the app and landing, 'light' for white backgrounds */
  tone?:  'dark' | 'light';
  /** mark only, for the collapsed sidebar and small headers */
  markOnly?: boolean;
}

const GREEN_ON_LIGHT = '#0B7A5C';
const GOLD_ON_DARK   = '#F5C842';

/** The ن of وين: its bowl, with the letter's dot drawn as a map pin dropping in */
export const WaynMark: React.FC<{ size: number; color: string; hole?: string }> = ({ size, color, hole = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M8 20c0 11 7.2 19 16 19s16-8 16-19" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
    <path d="M24 27c-3.6-4.4-7-7.4-7-11.4a7 7 0 0 1 14 0c0 4-3.4 7-7 11.4Z" fill={color} />
    <circle cx="24" cy="15.6" r="2.6" fill={hole} />
  </svg>
);

export const WaynLogo: React.FC<Props> = ({ size = 22, tone = 'dark', markOnly = false }) => {
  const accent = tone === 'light' ? GREEN_ON_LIGHT : GOLD_ON_DARK;
  const hole   = tone === 'light' ? '#fff' : '#0A0E27';
  const ink   = tone === 'light' ? '#0E1A17' : '#FFFFFF';

  if (markOnly) return <WaynMark size={size * 1.3} color={accent} hole={hole} />;

  return (
    <span
      aria-label="Wayn"
      dir="ltr"
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32, lineHeight: 1 }}
    >
      <WaynMark size={size * 1.1} color={accent} hole={hole} />
      <span style={{ fontFamily: "'Readex Pro', 'Sora', sans-serif", fontWeight: 700, fontSize: size, letterSpacing: '-0.03em', color: ink }}>
        wayn
      </span>
      <span style={{ fontFamily: "'Readex Pro', 'Cairo', sans-serif", fontWeight: 500, fontSize: size * 0.82, color: accent }}>
        وين
      </span>
    </span>
  );
};
