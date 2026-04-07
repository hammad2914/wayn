import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';
import { LangToggle } from '../ui/LangToggle';

const NAV_LINK_KEYS = ['nav.features', 'nav.howItWorks', 'nav.pricing', 'nav.docs'] as const;

// Hamburger bar animation variants
const TOP_BAR    = { closed: { rotate: 0,   y: 0,  opacity: 1 }, open: { rotate: 45,  y: 7,  opacity: 1 } };
const MID_BAR    = { closed: { opacity: 1, scaleX: 1 },           open: { opacity: 0, scaleX: 0 } };
const BOTTOM_BAR = { closed: { rotate: 0,   y: 0,  opacity: 1 }, open: { rotate: -45, y: -7, opacity: 1 } };

const MENU_ITEM = {
  hidden: { opacity: 0, x: -28 },
  show:   { opacity: 1, x: 0,  transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isMd } = useBreakpoint();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close menu when resizing to desktop
  useEffect(() => { if (!isMd) setOpen(false); }, [isMd]);

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const solidBg = scrolled || open;

  return (
    <>
      {/* ── NAVBAR BAR ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 200,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: isMd ? 20 : 36,
          paddingRight: isMd ? 20 : 36,
          background: solidBg ? 'rgba(10,14,39,0.97)' : 'transparent',
          backdropFilter: solidBg ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: solidBg ? 'blur(20px)' : 'none',
          borderBottom: solidBg ? '1px solid rgba(245,200,66,0.1)' : 'none',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', zIndex: 1 }}>
          <motion.img
            src="/wayn-full.png"
            alt="Wayn"
            whileHover={{ scale: 1.04 }}
            style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Desktop nav links */}
        {!isMd && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {NAV_LINK_KEYS.map((key) => (
              <a
                key={key}
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F5C842')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                {t(key)}
              </a>
            ))}
          </div>
        )}

        {/* Desktop right: lang toggle + CTA */}
        {!isMd && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LangToggle />
            <motion.button
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(245,200,66,0.4)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: '#F5C842', color: '#0A0E27', border: 'none',
                borderRadius: 8, padding: '9px 22px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif',
              }}
            >
              {t('nav.getStarted')}
            </motion.button>
          </div>
        )}

        {/* Mobile: lang toggle + hamburger */}
        {isMd && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LangToggle />
        
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '10px 6px', display: 'flex', flexDirection: 'column',
              gap: 5, alignItems: 'center', justifyContent: 'center', zIndex: 1,
            }}
          >
            <motion.span
              variants={TOP_BAR} animate={open ? 'open' : 'closed'}
              transition={{ duration: 0.3 }}
              style={{ display: 'block', width: 24, height: 2.5, background: '#F5C842', borderRadius: 2, transformOrigin: 'center' }}
            />
            <motion.span
              variants={MID_BAR} animate={open ? 'open' : 'closed'}
              transition={{ duration: 0.2 }}
              style={{ display: 'block', width: 24, height: 2.5, background: '#F5C842', borderRadius: 2 }}
            />
            <motion.span
              variants={BOTTOM_BAR} animate={open ? 'open' : 'closed'}
              transition={{ duration: 0.3 }}
              style={{ display: 'block', width: 24, height: 2.5, background: '#F5C842', borderRadius: 2, transformOrigin: 'center' }}
            />
          </button>
          </div>
        )}
      </motion.nav>

      {/* ── MOBILE MENU PANEL ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 198,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />

            {/* Sliding panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,   scale: 1 }}
              exit={{  opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              style={{
                position: 'fixed',
                top: 64, left: 0, right: 0,
                zIndex: 199,
                background: 'rgba(10,14,39,0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(245,200,66,0.18)',
                padding: '16px 24px 32px',
              }}
            >
              {/* Nav items with stagger */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              >
              {NAV_LINK_KEYS.map((key, i) => (
                <motion.div key={key} variants={MENU_ITEM}>
                  <a
                    href="#"
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 0',
                      borderBottom: i < NAV_LINK_KEYS.length - 1
                        ? '1px solid rgba(255,255,255,0.07)'
                        : 'none',
                      color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 600,
                      textDecoration: 'none',
                      letterSpacing: isRTL ? '0' : '-0.2px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = '#F5C842';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)';
                    }}
                  >
                    {t(key)}
                    <Icon
                      icon={isRTL ? 'solar:arrow-left-bold' : 'solar:arrow-right-bold'}
                      width={16}
                      style={{ color: 'rgba(245,200,66,0.5)', flexShrink: 0 }}
                    />
                  </a>
                </motion.div>
              ))}

                {/* CTA button */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } } }}
                  style={{ marginTop: 28 }}
                >
                  <motion.button
                    onClick={() => { setOpen(false); navigate('/signup'); }}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ boxShadow: '0 0 28px rgba(245,200,66,0.45)' }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #F5C842 0%, #D4A017 100%)',
                      color: '#0A0E27', border: 'none', borderRadius: 12,
                      padding: '15px', fontSize: 16, fontWeight: 700,
                      cursor: 'pointer',
                      letterSpacing: isRTL ? '0' : '-0.2px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {t('nav.getStartedFree')}
                      <Icon icon={isRTL ? 'solar:arrow-left-bold' : 'solar:arrow-right-bold'} width={16} />
                    </span>
                  </motion.button>
                </motion.div>

                {/* Social proof */}
                <motion.div
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.2 } } }}
                  style={{
                    marginTop: 20, textAlign: 'center',
                    fontSize: 12, color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {t('nav.trustedBy')}
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
