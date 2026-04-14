import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourStep {
  target: string;
  title: string;
  description: string;
}

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTabTour(storageKey: string) {
  const [run, setRun] = useState(false);

  const startTour = useCallback(() => {
    setRun(true);
  }, []);

  const endTour = useCallback(() => {
    setRun(false);
    try { localStorage.setItem(storageKey, 'seen'); } catch (_) { /* ignore */ }
  }, [storageKey]);

  const hasSeenTour = useCallback(() => {
    try { return !!localStorage.getItem(storageKey); } catch (_) { return false; }
  }, [storageKey]);

  return { run, startTour, endTour, hasSeenTour };
}

// ─── Tour Overlay ─────────────────────────────────────────────────────────────

interface TabTourProps {
  steps: TourStep[];
  run: boolean;
  onClose: () => void;
}

const PAD = 8;

export default function TabTour({ steps, run, onClose }: TabTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const frameRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!run || !steps[index]) return;
    const el = document.querySelector<HTMLElement>(steps[index].target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
  }, [run, index, steps]);

  // Re-measure on every animation frame while tour is open (handles scroll / resize)
  useEffect(() => {
    if (!run) { setIndex(0); setRect(null); return; }
    let alive = true;
    const loop = () => {
      if (!alive) return;
      measure();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(frameRef.current); };
  }, [run, measure]);

  if (!run || !rect) return null;

  const step = steps[index];
  const isFirst = index === 0;
  const isLast  = index === steps.length - 1;

  // Tooltip position: below the spotlight by default, flip above if too close to bottom
  const spotL = rect.left - PAD;
  const spotT = rect.top  - PAD;
  const spotW = rect.width  + PAD * 2;
  const spotH = rect.height + PAD * 2;

  const TOOLTIP_W = 320;
  const TOOLTIP_BELOW = rect.bottom + PAD + 12;
  const TOOLTIP_ABOVE = rect.top - PAD - 12;
  const viewH = window.innerHeight;
  const belowOk = TOOLTIP_BELOW + 220 < viewH;
  const tooltipTop = belowOk ? TOOLTIP_BELOW : TOOLTIP_ABOVE - 220;

  // Horizontally: align left of spotlight, clamped to viewport
  let tooltipLeft = rect.left;
  if (tooltipLeft + TOOLTIP_W > window.innerWidth - 16) tooltipLeft = window.innerWidth - TOOLTIP_W - 16;
  if (tooltipLeft < 16) tooltipLeft = 16;

  const progress = ((index + 1) / steps.length) * 100;

  return createPortal(
    <>
      {/* Full-screen click blocker — swallows clicks without closing */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, cursor: 'default' }}
      />

      {/* Spotlight cutout — huge box-shadow darkens everything outside */}
      <div
        style={{
          position: 'fixed',
          left: spotL,
          top: spotT,
          width: spotW,
          height: spotH,
          borderRadius: 12,
          zIndex: 9001,
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          outline: '2.5px solid rgba(245,200,66,0.55)',
          outlineOffset: '0px',
          transition: 'left 0.25s, top 0.25s, width 0.25s, height 0.25s',
        }}
      />

      {/* Tooltip */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: tooltipLeft,
          top: tooltipTop,
          width: TOOLTIP_W,
          zIndex: 9002,
          background: 'linear-gradient(135deg, #0f1535 0%, #161d3a 100%)',
          border: '1px solid rgba(245,200,66,0.28)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,200,66,0.1)',
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
          animation: 'tourFadeIn 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(245,200,66,0.12)',
            border: '1px solid rgba(245,200,66,0.25)',
            borderRadius: 20, padding: '2px 10px', marginBottom: 8,
          }}>
            <Icon icon="solar:magic-stick-3-bold-duotone" width={11} color="#F5C842" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F5C842', letterSpacing: '0.06em' }}>
              STEP {index + 1} / {steps.length}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            {step.title}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 18px 16px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, margin: 0 }}>
            {step.description}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #F5C842, #f0a500)',
            borderRadius: 2, transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === index ? 14 : 6, height: 6, borderRadius: 3,
                background: i === index ? '#F5C842' : i < index ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isFirst && (
              <button onClick={onClose} style={skipBtn}>Skip</button>
            )}
            {!isFirst && (
              <button onClick={() => setIndex(i => i - 1)} style={backBtn}>Back</button>
            )}
            <button
              onClick={() => isLast ? onClose() : setIndex(i => i + 1)}
              style={nextBtn}
            >
              {isLast ? 'Got it!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`@keyframes tourFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </>,
    document.body,
  );
}

// ─── Button styles ─────────────────────────────────────────────────────────────

const baseBtn: React.CSSProperties = {
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, padding: '7px 14px',
  fontFamily: "'Inter', sans-serif", transition: 'all 0.18s',
};

const skipBtn: React.CSSProperties = {
  ...baseBtn, background: 'transparent',
  color: 'rgba(255,255,255,0.35)', padding: '7px 8px',
};

const backBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.6)',
};

const nextBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'linear-gradient(135deg, #F5C842, #f0a500)',
  color: '#0f1535', boxShadow: '0 4px 12px rgba(245,200,66,0.3)',
};
