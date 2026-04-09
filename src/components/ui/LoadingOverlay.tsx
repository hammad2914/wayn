import React from 'react';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  message?: string;
}

/** Absolute overlay — use inside a position:relative container */
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
    <Spinner size={40} />
    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{message}</p>
  </motion.div>
);

/** Small reusable spinner */
export const Spinner: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div style={{
    width: size, height: size,
    border: `${size <= 24 ? 2 : 3}px solid rgba(245,200,66,0.2)`,
    borderTopColor: '#F5C842',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  }} />
);

/** Full-page centered loader — use as a page-level loading state */
export const PageLoader: React.FC<{ message?: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '18px', minHeight: '60vh', width: '100%',
    }}
  >
    {/* Outer ring */}
    <div style={{ position: 'relative', width: 56, height: 56 }}>
      <div style={{
        position: 'absolute', inset: 0,
        border: '3px solid rgba(245,200,66,0.12)',
        borderTopColor: '#F5C842',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 8,
        border: '2px solid rgba(245,200,66,0.06)',
        borderTopColor: 'rgba(245,200,66,0.5)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite reverse',
      }} />
    </div>
    {message && (
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>{message}</p>
    )}
  </motion.div>
);
