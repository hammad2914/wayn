import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

const TOOLTIP_MAX_W = 240;
const MARGIN = 10; // min gap from viewport edge

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [style,   setStyle]   = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;

    const rect   = triggerRef.current.getBoundingClientRect();
    const vpW    = window.innerWidth;

    // Ideal horizontal centre aligned with trigger
    let left = rect.left + window.scrollX + rect.width / 2;

    // Clamp so tooltip doesn't overflow left or right of viewport
    const halfW = TOOLTIP_MAX_W / 2;
    if (left - halfW < MARGIN)        left = halfW + MARGIN;
    if (left + halfW > vpW - MARGIN)  left = vpW - halfW - MARGIN;

    const top = position === 'top'
      ? rect.top  + window.scrollY - 8
      : rect.bottom + window.scrollY + 8;

    setStyle({
      position:   'absolute',
      top,
      left,
      transform:  position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      maxWidth:   TOOLTIP_MAX_W,
      whiteSpace: 'normal',
      wordBreak:  'break-word',
      textAlign:  'center',
    });
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
          ...style,
          background:   'rgba(10,14,39,0.97)',
          border:       '1px solid rgba(245,200,66,0.25)',
          borderRadius: '7px',
          padding:      '6px 10px',
          fontSize:     '11px',
          fontWeight:   500,
          color:        'rgba(255,255,255,0.85)',
          zIndex:       99999,
          pointerEvents:'none',
          boxShadow:    '0 4px 16px rgba(0,0,0,0.5)',
          fontFamily:   "'Inter', sans-serif",
          letterSpacing:'0.01em',
          lineHeight:   1.5,
        }}>
          {text}
          <span style={{
            position:   'absolute',
            [position === 'top' ? 'bottom' : 'top']: -4,
            left:       '50%',
            transform:  'translateX(-50%) rotate(45deg)',
            width: 7, height: 7,
            background:   'rgba(10,14,39,0.97)',
            border:       '1px solid rgba(245,200,66,0.25)',
            borderTop:    position === 'top'    ? 'none' : undefined,
            borderLeft:   position === 'top'    ? 'none' : undefined,
            borderBottom: position === 'bottom' ? 'none' : undefined,
            borderRight:  position === 'bottom' ? 'none' : undefined,
          }} />
        </span>,
        document.body,
      )}
    </>
  );
};
