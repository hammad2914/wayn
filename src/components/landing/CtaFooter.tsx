import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';

export const CtaFooter: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isMd } = useBreakpoint();
  const { t } = useLanguage();

  const FOOTER_LINKS = [
    t('footer.product'), t('footer.pricing'), t('footer.docs'),
    t('footer.blog'), t('footer.careers'), t('footer.contact'),
  ];
  const TRUST_ITEMS = [t('cta.trust1'), t('cta.trust2'), t('cta.trust3')];

  return (
    <>
      {/* ── CTA SECTION ── */}
      <section style={{
        background: '#0A0E27',
        padding: isMobile ? '72px 20px' : isMd ? '88px 32px' : '120px 24px',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div style={{
              display: 'inline-block', padding: '6px 18px', borderRadius: 9999,
              background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)',
              color: '#F5C842', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28,
            }}>
              {t('cta.sectionLabel')}
            </div>

            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: isMobile ? 28 : isMd ? 36 : 44,
              fontWeight: 800, color: '#FFFFFF',
              margin: '0 0 20px', lineHeight: 1.15,
            }}>
              {t('cta.h2Part1')}{' '}
              <span style={{ color: '#F5C842' }}>{t('cta.h2Part2')}</span>
            </h2>

            <p style={{
              fontSize: isMobile ? 15 : 18,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.65,
              margin: '0 0 40px',
            }}>
              {t('cta.subtext')}
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex', gap: 14, justifyContent: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
            }}>
              <motion.button
                onClick={() => navigate('/signup')}
                whileHover={{ scale: 1.04, boxShadow: '0 0 36px rgba(245,200,66,0.45)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: '#F5C842', color: '#0A0E27', border: 'none',
                  borderRadius: 10, padding: isMobile ? '14px 24px' : '15px 36px',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                {t('cta.btn1')}
              </motion.button>
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ background: 'rgba(245,200,66,0.12)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'transparent', color: '#F5C842',
                  border: '1.5px solid rgba(245,200,66,0.65)',
                  borderRadius: 10, padding: isMobile ? '14px 24px' : '15px 36px',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                {t('cta.btn2')}
              </motion.button>
            </div>
          </motion.div>

          {/* Trust bar */}
          <div style={{
            marginTop: isMobile ? 40 : 60,
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? 16 : 40,
            flexWrap: 'wrap',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 13,
          }}>
            {TRUST_ITEMS.map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon icon="solar:check-circle-bold" width={15} style={{ color: '#10B981', flexShrink: 0 }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#080C1E',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: isMobile ? '32px 20px' : '28px 36px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? 24 : 16,
          textAlign: isMobile ? 'center' : 'left',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5C842 0%, #D4A017 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#0A0E27',
            }}>A</div>
            <span style={{
              fontFamily: 'Sora, sans-serif', fontWeight: 700,
              fontSize: 16, color: '#FFFFFF',
            }}>Wayn</span>
          </div>

          {/* Nav links */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: isMobile ? 16 : 28,
            justifyContent: 'center',
          }}>
            {FOOTER_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.45)', fontSize: 13,
                  textDecoration: 'none', transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F5C842')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </>
  );
};
