import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = false, style, onClick }) => {
  const base: React.CSSProperties = {
    background:     'rgba(12,17,45,0.88)',
    backdropFilter: 'blur(16px)',
    border:         '1px solid rgba(245,200,66,0.18)',
    borderRadius:   '16px',
    boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
    ...style,
  };

  if (hover) {
    return (
      <motion.div
        style={base}
        className={className}
        whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(245,200,66,0.15)' }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div style={base} className={className} onClick={onClick}>
      {children}
    </div>
  );
};
