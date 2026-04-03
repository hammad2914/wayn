import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

const TOOLTIP_MAX_W = 220;
const MARGIN = 10;

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [visible,    setVisible]    = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({});
  const [arrowLeft,  setArrowLeft]  = useState<string>('50%');
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;

    const rect  = triggerRef.current.getBoundingClientRect();
    const vpW   = window.innerWidth;
    const halfW = TOOLTIP_MAX_W / 2;

    // Ideal bubble centre = trigger centre
    const idealLeft = rect.left + window.scrollX + rect.width / 2;

    // Clamp bubble so it doesn't overflow viewport
    let clampedLeft = idealLeft;
    if (clampedLeft - halfW < MARGIN)       clampedLeft = halfW + MARGIN;
    if (clampedLeft + halfW > vpW - MARGIN) clampedLeft = vpW - halfW - MARGIN;

    // Arrow should point at the trigger centre, so offset relative to bubble
    const arrowPx = idealLeft - clampedLeft + halfW; // px from bubble left
    const arrowPct = Math.min(Math.max((arrowPx / TOOLTIP_MAX_W) * 100, 10), 90); // clamp 10-90%

    const top = position === 'top'
      ? rect.top  + window.scrollY - 8
      : rect.bottom + window.scrollY + 8;

    setBubbleStyle({
      position:   'absolute',
      top,
      left:       clampedLeft,
      transform:  position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      maxWidth:   TOOLTIP_MAX_W,
      whiteSpace: 'normal',
      wordBreak:  'break-word',
      textAlign:  'center',
    });

    setArrowLeft(`${arrowPct}%`);
  }, [visible, position]);

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </span>

      {visible && createPortal(
        <span style={{
          ...bubbleStyle,
          background:    'rgba(10,14,39,0.97)',
          border:        '1px solid rgba(245,200,66,0.3)',
          borderRadius:  '8px',
          padding:       '7px 11px',
          fontSize:      '11px',
          fontWeight:    500,
          color:         'rgba(255,255,255,0.85)',
          zIndex:        99999,
          pointerEvents: 'none',
          boxShadow:     '0 6px 20px rgba(0,0,0,0.55)',
          fontFamily:    "'Inter', sans-serif",
          letterSpacing: '0.01em',
          lineHeight:    1.5,
        }}>
          {text}

          {/* Arrow — horizontally tracks the trigger even when bubble is clamped */}
          <span style={{
            position:   'absolute',
            left:       arrowLeft,
            transform:  'translateX(-50%) rotate(45deg)',
            width:      8,
            height:     8,
            background: 'rgba(10,14,39,0.97)',
            ...(position === 'top' ? {
              bottom:      -4,
              borderRight: '1px solid rgba(245,200,66,0.3)',
              borderBottom:'1px solid rgba(245,200,66,0.3)',
            } : {
              top:         -4,
              borderLeft:  '1px solid rgba(245,200,66,0.3)',
              borderTop:   '1px solid rgba(245,200,66,0.3)',
            }),
          }} />
        </span>,
        document.body,
      )}
    </>
  );
};
