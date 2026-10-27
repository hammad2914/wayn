import React from 'react';
import { motion } from 'framer-motion';

interface GoldButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GoldButton: React.FC<GoldButtonProps> = ({
  children, onClick, type = 'button', loading = false, disabled = false,
  fullWidth = false, size = 'md', className = '',
}) => {
  const sizes = { sm: '10px 20px', md: '12px 24px', lg: '14px 32px' };
  const font  = { sm: '13px', md: '14px', lg: '15px' };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, boxShadow: '0 8px 24px rgba(11,122,92,0.35)' } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      style={{
        width: fullWidth ? '100%' : undefined,
        padding: sizes[size],
        fontSize: font[size],
        fontFamily: "'Readex Pro', sans-serif",
        fontWeight: 700,
        background: disabled || loading
          ? 'rgba(11,122,92,0.3)'
          : 'linear-gradient(135deg, #0B7A5C, #086149)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 4px 16px rgba(11,122,92,0.25)',
        transition: 'background 0.2s',
      }}
      className={className}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: 16, height: 16,
            border: '2px solid #F7F8F6',
            borderTopColor: '#F7F8F6',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          {children}
        </span>
      ) : children}
    </motion.button>
  );
};
