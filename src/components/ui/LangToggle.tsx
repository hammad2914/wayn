import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

interface LangToggleProps {
  /** 'pill' (default) = outlined pill button; 'minimal' = compact text-only for tight spaces */
  variant?: 'pill' | 'minimal';
}

export const LangToggle: React.FC<LangToggleProps> = ({ variant = 'pill' }) => {
  const { lang, setLang } = useLanguage();
  const toAr = lang === 'en';

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setLang(toAr ? 'ar' : 'en')}
        title={toAr ? 'Switch to Arabic' : 'Switch to English'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: 5,
          color: 'rgba(255,255,255,0.5)',
          transition: 'color 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
      >
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Sora, sans-serif', color: lang === 'en' ? '#F5C842' : undefined, transition: 'color 0.25s' }}>EN</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>|</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', color: lang === 'ar' ? '#F5C842' : undefined, transition: 'color 0.25s' }}>عربي</span>
      </button>
    );
  }

  return (
    <motion.button
      onClick={() => setLang(toAr ? 'ar' : 'en')}
      whileTap={{ scale: 0.95 }}
      title={toAr ? 'Switch to Arabic' : 'Switch to English'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(245,200,66,0.08)',
        border: '1px solid rgba(245,200,66,0.3)',
        borderRadius: 20, padding: '5px 12px',
        cursor: 'pointer', userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
          color: lang === 'en' ? '#F5C842' : 'rgba(255,255,255,0.45)',
          transition: 'color 0.25s',
          fontFamily: 'Sora, sans-serif',
        }}>
          EN
        </span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>|</span>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: lang === 'ar' ? '#F5C842' : 'rgba(255,255,255,0.45)',
          transition: 'color 0.25s',
          fontFamily: 'Cairo, sans-serif',
        }}>
          عربي
        </span>
      </div>
    </motion.button>
  );
};
