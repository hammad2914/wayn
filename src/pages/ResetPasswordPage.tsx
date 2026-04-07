import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';

interface FormValues { newPassword: string; confirmPassword: string; }

const getStrength = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const strengthColors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];

export const ResetPasswordPage: React.FC = () => {
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();
  const [searchParams] = useSearchParams();

  const userId = searchParams.get('userId') || '';
  const token  = searchParams.get('token')  || '';

  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const pwValue  = watch('newPassword', '');
  const strength = getStrength(pwValue);
  const strengthLabels = ['', t('auth.weak'), t('auth.fair'), t('auth.good'), t('auth.strong')];

  const invalidLink = !userId || !token;

  const onSubmit = async (data: FormValues) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({ type: 'error', title: 'Passwords do not match' }); return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ userId, token, newPassword: data.newPassword });
      setDone(true);
      toast({ type: 'success', title: 'Password reset!', message: 'You can now sign in with your new password.' });
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Reset link is invalid or has expired.';
      toast({ type: 'error', title: 'Reset failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '13px 44px 13px 16px', fontSize: '14px', color: '#FFFFFF',
    outline: 'none', height: '52px', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: "'Inter', sans-serif",
    direction: 'ltr',
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
          <h1 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', margin: '14px 0 6px' }}>{t('auth.resetPwTitle')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '13px' : '14px', margin: 0 }}>
            {t('auth.resetPwSubtitle')}
          </p>
        </div>

        <div style={{
          background: 'rgba(12,17,45,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,200,66,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '24px 18px' : '40px',
        }}>
          <AnimatePresence mode="wait">
            {invalidLink ? (
              <motion.div key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Icon icon="solar:danger-bold" width={28} color="#EF4444" />
                </div>
                <h3 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>{t('auth.invalidLink')}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  {t('auth.invalidLinkMsg')}
                </p>
                <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '10px', color: '#F5C842', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                  <Icon icon="solar:restart-bold" width={15} />{t('auth.requestNewLink')}
                </Link>
              </motion.div>
            ) : done ? (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Icon icon="solar:check-circle-bold" width={28} color="#10B981" />
                </div>
                <h3 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>{t('auth.pwResetSuccess')}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>{t('auth.pwResetSuccessMsg')}</p>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(245,200,66,0.2)', borderTopColor: '#F5C842', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '16px auto 0' }} />
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* New password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{t('auth.newPassword')}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        style={{ ...inputStyle, [isRTL ? 'paddingLeft' : 'paddingRight']: '44px', ...(errors.newPassword ? { borderColor: '#EF4444' } : {}) }}
                        placeholder={isRTL ? '٨ أحرف على الأقل' : 'Min 8 characters'}
                        onFocus={e => (e.target.style.borderColor = '#F5C842')}
                        {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                        onBlur={e => (e.target.style.borderColor = errors.newPassword ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                        <Icon icon={showPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                      </button>
                    </div>
                    {errors.newPassword && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.newPassword.message}</p>}
                    {pwValue.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                          ))}
                        </div>
                        <p style={{ fontSize: '11px', color: strengthColors[strength], margin: 0 }}>{strengthLabels[strength]}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{t('auth.confirmNewPassword')}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCPw ? 'text' : 'password'}
                        style={{ ...inputStyle, [isRTL ? 'paddingLeft' : 'paddingRight']: '44px', ...(errors.confirmPassword ? { borderColor: '#EF4444' } : {}) }}
                        placeholder={isRTL ? 'أعد كتابة كلمة المرور' : 'Repeat password'}
                        onFocus={e => (e.target.style.borderColor = '#F5C842')}
                        {...register('confirmPassword', { required: 'Required' })}
                        onBlur={e => (e.target.style.borderColor = errors.confirmPassword ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                      />
                      <button type="button" onClick={() => setShowCPw(!showCPw)}
                        style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                        <Icon icon={showCPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                      </button>
                    </div>
                    {errors.confirmPassword && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.confirmPassword.message}</p>}
                  </div>

                  <GoldButton type="submit" loading={loading} fullWidth size="lg">
                    {loading ? t('auth.resettingPw') : t('auth.resetPwBtn')}
                    {!loading && <Icon icon="solar:lock-password-bold" width={16} />}
                  </GoldButton>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!done && !invalidLink && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                <Icon icon={isRTL ? 'solar:arrow-right-bold' : 'solar:arrow-left-bold'} width={14} />
                {t('auth.backToSignIn')}
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
