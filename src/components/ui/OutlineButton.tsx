import React from 'react';
import { motion } from 'framer-motion';

interface OutlineButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OutlineButton: React.FC<OutlineButtonProps> = ({
  children, onClick, type = 'button', disabled = false,
  fullWidth = false, size = 'md', className = '',
}) => {
  const sizes = { sm: '9px 18px', md: '11px 22px', lg: '13px 28px' };
  const font  = { sm: '12px', md: '13px', lg: '14px' };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { borderColor: '#F5C842', color: '#F5C842', backgroundColor: 'rgba(245,200,66,0.08)' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      style={{
        width: fullWidth ? '100%' : undefined,
        padding: sizes[size],
        fontSize: font[size],
        fontFamily: "'Sora', sans-serif",
        fontWeight: 600,
        background: 'transparent',
        color: 'rgba(245,200,66,0.85)',
        border: '1px solid rgba(245,200,66,0.4)',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: disabled ? 0.5 : 1,
      }}
      className={className}
    >
      {children}
    </motion.button>
  );
};
