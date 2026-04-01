import React from 'react';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading…' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'absolute', inset: 0,
      background: 'rgba(10,14,39,0.8)',
      backdropFilter: 'blur(8px)',
      borderRadius: 'inherit',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '16px', zIndex: 10,
    }}
  >
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(245,200,66,0.2)',
      borderTopColor: '#F5C842',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{message}</p>
  </motion.div>
);
