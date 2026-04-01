import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';

const STEP_ICONS = [
  'solar:document-text-bold-duotone',
  'solar:cpu-bolt-bold-duotone',
  'solar:routing-2-bold-duotone',
];

const cardVariant = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

export const HowItWorks: React.FC = () => {
  const { isMobile, isMd } = useBreakpoint();
  const { t } = useLanguage();

  const STEPS = [
    { icon: STEP_ICONS[0], title: t('hiw.step1Title'), desc: t('hiw.step1Desc') },
    { icon: STEP_ICONS[1], title: t('hiw.step2Title'), desc: t('hiw.step2Desc') },
    { icon: STEP_ICONS[2], title: t('hiw.step3Title'), desc: t('hiw.step3Desc') },
  ];
  const ref     = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView    = useInView(ref,     { once: true, margin: '-60px' });
  const lineInView  = useInView(lineRef, { once: true, margin: '-40px' });

  const sectionPad = isMobile ? '64px 20px' : isMd ? '72px 24px' : '100px 24px';

  return (
    <section id="how-it-works" style={{ background: '#0A0E27', padding: sectionPad }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}>
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
              {t('hiw.sectionLabel')}
            </div>
            <h2 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: isMobile ? 28 : isMd ? 34 : 42,
              fontWeight: 800, color: '#F5C842', margin: '0 0 16px',
            }}>
              {t('hiw.heading')}
            </h2>
            <p style={{
              fontSize: isMobile ? 15 : 18,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 560, margin: '0 auto', lineHeight: 1.65,
            }}>
              {t('hiw.subheading')}
            </p>
          </motion.div>
        </div>

        {/* ── Steps ── */}
        <div ref={ref} style={{ position: 'relative' }}>

          {/* Horizontal connecting line — desktop only */}
          {!isMd && (
            <div
              ref={lineRef}
              style={{
                position: 'absolute', top: 56,
                left: 'calc(16.67% + 20px)',
                right: 'calc(16.67% + 20px)',
                height: 2, overflow: 'hidden', zIndex: 0,
              }}
            >
              <motion.div
                style={{ height: '100%', borderTop: '2px dashed rgba(245,200,66,0.4)', transformOrigin: 'left center' }}
                initial={{ scaleX: 0 }}
                animate={lineInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
              />
            </div>
          )}

          {/* Mobile vertical spine */}
          {isMd && (
            <div style={{
              position: 'absolute', left: 27, top: 0, bottom: 0, width: 2,
              background: 'linear-gradient(to bottom, rgba(245,200,66,0.35), rgba(245,200,66,0.05))',
              zIndex: 0,
            }} />
          )}

          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.16 } } }}
            initial="hidden"
            animate={isInView ? 'show' : 'hidden'}
            style={{
              display: 'grid',
              gridTemplateColumns: isMd ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? 16 : 24,
              position: 'relative', zIndex: 1,
            }}
          >
            {STEPS.map((step, i) => (
              <StepCard key={i} step={step} index={i} isMobile={isMobile} isMd={isMd} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

type StepItem = { icon: string; title: string; desc: string };

const StepCard: React.FC<{
  step: StepItem;
  index: number;
  isMobile: boolean;
  isMd: boolean;
}> = ({ step, index, isMobile, isMd }) => {
  const [hovered, setHovered] = React.useState(false);

  if (isMd) {
    // Horizontal layout for mobile: icon left, text right
    return (
      <motion.div
        variants={cardVariant}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', gap: 20, alignItems: 'flex-start',
          background: '#12183A',
          border: `1px solid ${hovered ? 'rgba(245,200,66,0.5)' : 'rgba(245,200,66,0.1)'}`,
          borderRadius: 16, padding: '22px 20px',
          transition: 'border-color 0.25s, box-shadow 0.25s',
          boxShadow: hovered ? '0 0 24px rgba(245,200,66,0.1)' : '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {/* Number + icon column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)',
            fontSize: 10, fontWeight: 700, color: '#F5C842',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {index + 1}
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(245,200,66,0.2) 0%, rgba(245,200,66,0.07) 100%)',
            border: '1.5px solid rgba(245,200,66,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon icon={step.icon} width={26} style={{ color: '#F5C842' }} />
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, paddingTop: 2 }}>
          <h3 style={{
            fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 16 : 18, fontWeight: 700,
            color: '#FFFFFF', margin: '0 0 8px',
          }}>
            {step.title}
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0 }}>
            {step.desc}
          </p>
        </div>
      </motion.div>
    );
  }

  // Desktop — centered card layout
  return (
    <motion.div
      variants={cardVariant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#12183A',
        border: `1px solid ${hovered ? 'rgba(245,200,66,0.5)' : 'rgba(245,200,66,0.1)'}`,
        borderRadius: 18, padding: '36px 28px', textAlign: 'center', cursor: 'default',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        boxShadow: hovered ? '0 0 30px rgba(245,200,66,0.12)' : '0 4px 20px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)',
        fontSize: 11, fontWeight: 700, color: '#F5C842', marginBottom: 20,
      }}>
        {index + 1}
      </div>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(245,200,66,0.2) 0%, rgba(245,200,66,0.08) 100%)',
        border: '1.5px solid rgba(245,200,66,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: hovered ? '0 0 20px rgba(245,200,66,0.2)' : 'none',
        transition: 'box-shadow 0.25s',
      }}>
        <Icon icon={step.icon} width={30} style={{ color: '#F5C842' }} />
      </div>
      <h3 style={{
        fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700,
        color: '#FFFFFF', margin: '0 0 12px',
      }}>
        {step.title}
      </h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
        {step.desc}
      </p>
    </motion.div>
  );
};
