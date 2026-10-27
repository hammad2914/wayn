export const colors = {
  navy:        '#F7F8F6',
  navyLight:   '#FFFFFF',
  navyCard:    '#FFFFFF',
  gold:        '#0B7A5C',
  goldDim:     'rgba(11,122,92,0.12)',
  goldBorder:  'rgba(11,122,92,0.2)',
  blue:        '#3B82F6',
  green:       '#10B981',
  red:         '#EF4444',
  amber:       '#F59E0B',
  textPrimary: '#0E1A17',
  textMuted:   'rgba(14,26,23,0.67)',
  textFaint:   'rgba(14,26,23,0.46)',
};

export const glassmorphism = {
  background:     '#FFFFFF',
  backdropFilter: 'blur(16px)',
  border:         '1px solid rgba(11,122,92,0.18)',
  borderRadius:   '16px',
  boxShadow:      '0 8px 32px rgba(14,26,23,0.12)',
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
  whileHover: { y: -4, boxShadow: '0 12px 40px rgba(11,122,92,0.15)' },
  transition:  { duration: 0.2 },
};
