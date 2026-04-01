import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, glow = false }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      className={`glass rounded-2xl p-6 ${glow ? 'glow-teal-sm' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};
