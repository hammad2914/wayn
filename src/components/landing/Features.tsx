import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';

const FEATURE_ICONS = [
  'solar:earth-bold-duotone',
  'solar:map-point-wave-bold-duotone',
  'solar:routing-2-bold-duotone',
  'solar:server-square-bold-duotone',
  'solar:shield-keyhole-bold-duotone',
  'solar:chart-square-bold-duotone',
];

const cardVariant = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export const Features: React.FC = () => {
  const { isMobile, isMd } = useBreakpoint();
  const { t } = useLanguage();
  const sectionPad = isMobile ? '64px 20px' : isMd ? '72px 24px' : '100px 24px';

  const FEATURES = [
    { icon: FEATURE_ICONS[0], title: t('feat.f1Title'), desc: t('feat.f1Desc') },
    { icon: FEATURE_ICONS[1], title: t('feat.f2Title'), desc: t('feat.f2Desc') },
    { icon: FEATURE_ICONS[2], title: t('feat.f3Title'), desc: t('feat.f3Desc') },
    { icon: FEATURE_ICONS[3], title: t('feat.f4Title'), desc: t('feat.f4Desc') },
    { icon: FEATURE_ICONS[4], title: t('feat.f5Title'), desc: t('feat.f5Desc') },
    { icon: FEATURE_ICONS[5], title: t('feat.f6Title'), desc: t('feat.f6Desc') },
  ];

  return (
    <section style={{ background: '#0D1232', padding: sectionPad }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 64 }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{
              display: 'inline-block', padding: '6px 18px', borderRadius: 9999,
              background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)',
              color: '#F5C842', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
            }}>
              {t('feat.sectionLabel')}
            </div>
            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: isMobile ? 28 : isMd ? 34 : 42,
              fontWeight: 800, color: '#FFFFFF', margin: '0 0 16px',
              lineHeight: 1.2,
            }}>
              {t('feat.h2Part1')}{' '}
              <span style={{ color: '#F5C842' }}>{t('feat.h2Part2')}</span>
            </h2>
            <p style={{
              fontSize: isMobile ? 15 : 18,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 580, margin: '0 auto', lineHeight: 1.6,
            }}>
              {t('feat.subheading')}
            </p>
          </motion.div>
        </div>

        {/* ── Grid — uses CSS classes for responsive columns ── */}
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="lp-grid-3"
        >
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} isMobile={isMobile} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

type FeatureItem = { icon: string; title: string; desc: string };

const FeatureCard: React.FC<{
  feature: FeatureItem;
  isMobile: boolean;
}> = ({ feature, isMobile }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      variants={cardVariant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#12183A',
        border: `1px solid ${hovered ? 'rgba(245,200,66,0.45)' : 'rgba(245,200,66,0.1)'}`,
        borderRadius: 16,
        padding: isMobile ? '22px 18px' : '28px 26px',
        cursor: 'default',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        boxShadow: hovered ? '0 0 24px rgba(245,200,66,0.13)' : '0 4px 16px rgba(0,0,0,0.25)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: hovered
          ? 'linear-gradient(135deg, rgba(245,200,66,0.25) 0%, rgba(245,200,66,0.1) 100%)'
          : 'rgba(245,200,66,0.1)',
        border: '1px solid rgba(245,200,66,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, transition: 'background 0.25s',
      }}>
        <Icon icon={feature.icon} width={24} style={{ color: '#F5C842' }} />
      </div>
      <h3 style={{
        fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
        color: '#FFFFFF', margin: '0 0 9px',
      }}>
        {feature.title}
      </h3>
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.58)',
        lineHeight: 1.65, margin: 0,
      }}>
        {feature.desc}
      </p>
    </motion.div>
  );
};
