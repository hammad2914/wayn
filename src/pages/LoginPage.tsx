import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import type { User } from '../types';

interface LoginForm { email: string; password: string; }

export const LoginPage: React.FC = () => {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { toast }    = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '13px 16px', fontSize: '14px', color: '#FFFFFF',
    outline: 'none', height: '52px', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif",
    direction: 'ltr',
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email: data.email, password: data.password });
      const { token, user } = res.data.data as { token: string; user: User };
      login(token, user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; needsVerification?: boolean; userId?: string } } };
      if (e?.response?.data?.needsVerification) {
        navigate(`/verify-otp?userId=${e.response!.data!.userId}&email=${encodeURIComponent(data.email)}&source=login`);
      } else {
        toast({ type: 'error', title: 'Login failed', message: e?.response?.data?.message || 'Invalid email or password.' });
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E27',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 12px' : '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(245,200,66,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(59,130,246,0.05)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Lang toggle — top right */}
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
          <h1 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', margin: '14px 0 6px' }}>{t('auth.welcomeBack')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '13px' : '14px', margin: 0 }}>{t('auth.signInSubtitle')}</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(12,17,45,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,200,66,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '24px 18px' : '40px',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{t('auth.emailAddress')}</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Icon icon="solar:letter-bold" width={18} color="rgba(255,255,255,0.3)" />
                </div>
                <input
                  type="email"
                  style={{ ...inputStyle, [isRTL ? 'paddingRight' : 'paddingLeft']: '44px', ...(errors.email ? { borderColor: '#EF4444' } : {}) }}
                  placeholder="you@company.com"
                  onFocus={e => (e.target.style.borderColor = '#F5C842')}
                  {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
                  onBlur={e => (e.target.style.borderColor = errors.email ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                />
              </div>
              {errors.email && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Icon icon="solar:lock-password-bold" width={18} color="rgba(255,255,255,0.3)" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  style={{ ...inputStyle, [isRTL ? 'paddingRight' : 'paddingLeft']: '44px', [isRTL ? 'paddingLeft' : 'paddingRight']: '44px', ...(errors.password ? { borderColor: '#EF4444' } : {}) }}
                  placeholder="••••••••"
                  onFocus={e => (e.target.style.borderColor = '#F5C842')}
                  {...register('password', { required: 'Password is required' })}
                  onBlur={e => (e.target.style.borderColor = errors.password ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                  <Icon icon={showPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                </button>
              </div>
              {errors.password && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.password.message}</p>}
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: isRTL ? 'left' : 'right', marginTop: '-6px' }}>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: 'rgba(245,200,66,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,200,66,0.6)')}>
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <GoldButton type="submit" loading={loading} fullWidth size="lg">
              {loading ? t('auth.signingIn') : t('auth.signIn')}
              {!loading && <Icon icon={isRTL ? 'solar:arrow-left-bold' : 'solar:arrow-right-bold'} width={16} />}
            </GoldButton>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{t('auth.or')}</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {t('auth.noAccount')}{' '}
            <Link to="/signup" style={{ color: '#F5C842', fontWeight: 600, textDecoration: 'none' }}>{t('auth.createFree')}</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
          {t('auth.secured')}
        </p>
      </motion.div>
    </div>
  );
};
