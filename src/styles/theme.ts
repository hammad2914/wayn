export const colors = {
  navy:        '#0A0E27',
  navyLight:   '#12183A',
  navyCard:    'rgba(18,24,58,0.9)',
  gold:        '#F5C842',
  goldDim:     'rgba(245,200,66,0.12)',
  goldBorder:  'rgba(245,200,66,0.2)',
  blue:        '#3B82F6',
  green:       '#10B981',
  red:         '#EF4444',
  amber:       '#F59E0B',
  textPrimary: '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.6)',
  textFaint:   'rgba(255,255,255,0.3)',
};

export const glassmorphism = {
  background:     'rgba(12,17,45,0.88)',
  backdropFilter: 'blur(16px)',
  border:         '1px solid rgba(245,200,66,0.18)',
  borderRadius:   '16px',
  boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
};

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8 },
};

export const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 12px 40px rgba(245,200,66,0.15)' },
  transition:  { duration: 0.2 },
};
