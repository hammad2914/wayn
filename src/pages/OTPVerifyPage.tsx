import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import type { User } from '../types';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 120;

export const OTPVerifyPage: React.FC = () => {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { login }   = useAuth();
  const { toast }   = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();

  const userId    = params.get('userId')    || '';
  const email     = params.get('email')     || '';
  const emailSent = params.get('emailSent') !== 'false';

  const [digits,    setDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const submit = useCallback(async (otp: string) => {
    if (!userId) { toast({ type: 'error', title: 'Missing userId parameter' }); return; }
    setLoading(true);
    setError(false);
    try {
      const res = await authAPI.verifyOTP({ userId, otp });
      const { token, user } = res.data.data as { token: string; user: User };
      login(token, user);
      toast({ type: 'success', title: 'Email verified!', message: 'Welcome to Wayn.' });
      navigate('/dashboard');
    } catch {
      setError(true);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => {
        setError(false);
        inputRefs.current[0]?.focus();
      }, 800);
    } finally { setLoading(false); }
  }, [userId, login, navigate, toast]);

  useEffect(() => {
    if (digits.every(d => d !== '') && !loading) submit(digits.join(''));
  }, [digits, loading, submit]);

  const handleChange = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = [...digits];
    for (let i = 0; i < OTP_LENGTH; i++) next[i] = text[i] || '';
    setDigits(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleResend = async () => {
    if (!userId || countdown > 0) return;
    setResending(true);
    try {
      await authAPI.resendOTP({ userId });
      setCountdown(RESEND_SECONDS);
      toast({ type: 'success', title: 'New OTP sent!', message: `Check ${email} — also check your spam folder.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send email. Check SMTP config.';
      toast({ type: 'error', title: 'Email delivery failed', message: msg });
    } finally { setResending(false); }
  };

  const boxW = isMobile ? '42px' : '52px';
  const boxH = isMobile ? '50px' : '62px';
  const boxFontSize = isMobile ? '22px' : '28px';

  const boxStyle = (i: number): React.CSSProperties => ({
    width: boxW, height: boxH,
    background: 'rgba(255,255,255,0.05)',
    border: `2px solid ${error ? '#EF4444' : digits[i] ? '#F5C842' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: '12px',
    fontSize: boxFontSize, fontWeight: 800,
    fontFamily: "'Sora', sans-serif",
    color: error ? '#EF4444' : '#F5C842',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: digits[i] && !error ? '0 0 12px rgba(245,200,66,0.25)' : 'none',
    cursor: 'default',
    animation: error ? 'shake 0.4s ease' : 'none',
    flexShrink: 0,
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E27',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 12px' : '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'rgba(245,200,66,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      {/* Lang toggle */}
      <div style={{ position: 'fixed', top: 16, right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto', zIndex: 100 }}>
        <LangToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: isMobile ? '100%' : '440px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '28px' }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <img src="/wayn-full.png" alt="Wayn" style={{ height: isMobile ? 38 : 44, width: 'auto', objectFit: 'contain', display: 'block' }} />
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(12,17,45,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,200,66,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '28px 18px 24px' : '40px 36px',
          textAlign: 'center', position: 'relative',
        }}>
          {/* Loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,39,0.85)', borderRadius: isMobile ? '16px' : '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, zIndex: 10, backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(245,200,66,0.2)', borderTopColor: '#F5C842', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{t('auth.verifyingCode')}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status icon */}
          <div style={{
            width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: '50%',
            background: emailSent ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${emailSent ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Icon
              icon={emailSent ? 'solar:letter-bold-duotone' : 'solar:letter-unread-bold-duotone'}
              width={isMobile ? 26 : 32}
              color={emailSent ? '#10B981' : '#F59E0B'}
            />
          </div>

          <h1 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>
            {emailSent ? t('auth.checkEmail') : t('auth.emailDeliveryIssue')}
          </h1>

          {/* Email status banner */}
          {emailSent ? (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', textAlign: isRTL ? 'right' : 'left',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <Icon icon="solar:check-circle-bold" width={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#10B981', fontSize: '12px', fontWeight: 600, margin: '0 0 2px' }}>{t('auth.emailSentOk')}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
                  Sent to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong>.{' '}
                  Also check <strong style={{ color: 'rgba(255,255,255,0.8)' }}>spam / junk</strong>.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', textAlign: isRTL ? 'right' : 'left',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <Icon icon="solar:danger-triangle-bold" width={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 600, margin: '0 0 2px' }}>{t('auth.emailDeliveryFailed')}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 4px', lineHeight: 1.5 }}>
                  Couldn't send to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong>.{' '}
                  SMTP may not be configured. Try resend once fixed.
                </p>
              </div>
            </motion.div>
          )}

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 20px' }}>
            {t('auth.enterCode')}
          </p>

          {/* OTP Boxes */}
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '7px' : '10px', marginBottom: '24px', direction: 'ltr' }}
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <motion.input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                style={boxStyle(i)}
                animate={error ? { x: [0, -6, 6, -6, 6, 0] } : {}}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>

          {/* Countdown / Resend */}
          <div style={{ marginBottom: '8px' }}>
            {countdown > 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {t('auth.resendIn')} <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{formatTime(countdown)}</strong>
              </p>
            ) : (
              <button onClick={handleResend} disabled={resending}
                style={{ background: 'none', border: 'none', cursor: resending ? 'default' : 'pointer', color: resending ? 'rgba(245,200,66,0.4)' : '#F5C842', fontSize: '13px', fontWeight: 600, padding: 0 }}>
                {resending ? t('auth.resending') : t('auth.resendCode')}
              </button>
            )}
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ color: '#EF4444', fontSize: '12px', marginTop: '10px' }}>
              {t('auth.invalidCode')}
            </motion.p>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '16px' }}>
          {t('auth.wrongEmail')}{' '}
          <Link to="/signup" style={{ color: 'rgba(245,200,66,0.5)', textDecoration: 'none' }}>{t('auth.startOver')}</Link>
        </p>
      </motion.div>
    </div>
  );
};
