import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';

interface FormValues { email: string; }

export const ForgotPasswordPage: React.FC = () => {
  const { toast }    = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [sentTo,   setSentTo]   = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '13px 16px 13px 44px', fontSize: '14px', color: '#FFFFFF',
    outline: 'none', height: '52px', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: "'Inter', sans-serif",
    direction: 'ltr',
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: data.email });
      setSentTo(data.email);
      setSent(true);
    } catch {
      toast({ type: 'error', title: 'Request failed', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E27',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 12px' : '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(245,200,66,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(59,130,246,0.05)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Lang toggle */}
      <div style={{ position: 'fixed', top: 16, right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto', zIndex: 100 }}>
        <LangToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: isMobile ? '100%' : '440px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '22px' : '32px' }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <img src="/wayn-full.png" alt="Wayn" style={{ height: isMobile ? 40 : 48, width: 'auto', objectFit: 'contain', display: 'block' }} />
          </Link>
          <h1 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', margin: '14px 0 6px' }}>{t('auth.forgotPwTitle')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '13px' : '14px', margin: 0 }}>
            {t('auth.forgotPwSubtitle')}
          </p>
        </div>

        <div style={{
          background: 'rgba(12,17,45,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,200,66,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '24px 18px' : '40px',
        }}>
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                      {t('auth.emailAddress')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <Icon icon="solar:letter-bold" width={18} color="rgba(255,255,255,0.3)" />
                      </div>
                      <input
                        type="email"
                        style={{ ...inputStyle, [isRTL ? 'paddingRight' : 'paddingLeft']: '44px', ...(errors.email ? { borderColor: '#EF4444' } : {}) }}
                        placeholder="you@company.com"
                        onFocus={e => (e.target.style.borderColor = '#F5C842')}
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
                        })}
                        onBlur={e => (e.target.style.borderColor = errors.email ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                      />
                    </div>
                    {errors.email && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.email.message}</p>}
                  </div>

                  <GoldButton type="submit" loading={loading} fullWidth size="lg">
                    {loading ? t('auth.sending') : t('auth.sendResetLink')}
                    {!loading && <Icon icon="solar:letter-bold" width={16} />}
                  </GoldButton>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Icon icon="solar:letter-bold" width={28} color="#10B981" />
                </div>
                <h3 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>{t('auth.checkInbox')}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', lineHeight: 1.6 }}>
                  {t('auth.resetSentTo')}
                </p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#F5C842', margin: '0 0 20px', wordBreak: 'break-all' }}>{sentTo}</p>
                <div style={{ background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
                    {t('auth.linkExpiry')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSent(false); setSentTo(''); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(245,200,66,0.7)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t('auth.differentEmail')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
              <Icon icon={isRTL ? 'solar:arrow-right-bold' : 'solar:arrow-left-bold'} width={14} />
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
          {t('auth.secured')}
        </p>
      </motion.div>
    </div>
  );
};
