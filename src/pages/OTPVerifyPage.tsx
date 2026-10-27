import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import type { User } from '../types';
import { WaynLogo } from '../components/ui/WaynLogo';

const OTP_LENGTH     = 6;
const RESEND_SECONDS = 120;

export const OTPVerifyPage: React.FC = () => {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { login }    = useAuth();
  const { toast }    = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();

  const userId  = params.get('userId')  || '';
  const email   = params.get('email')   || '';
  // source=login  → arrived from login with an unverified account, OTP not sent yet
  // source=signup → arrived from signup, OTP was already sent during registration
  const source  = params.get('source')  || 'signup';

  // When coming from login, we haven't sent an OTP yet → show "request code" screen first
  const [notYetSent, setNotYetSent] = useState(source === 'login');
  const [sending,    setSending]    = useState(false); // loading for the initial "send code" button

  const [digits,    setDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(false);
  // Countdown only starts after OTP has been sent (0 when notYetSent=true keeps resend available)
  const [countdown, setCountdown] = useState(source === 'login' ? 0 : RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Tick the countdown only when an OTP has actually been sent
  useEffect(() => {
    if (notYetSent) return;
    const interval = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [notYetSent]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Called when user taps "Send Verification Code" from the login-redirect state
  const handleSendInitial = async () => {
    if (!userId) { toast({ type: 'error', title: 'Missing userId parameter' }); return; }
    setSending(true);
    try {
      await authAPI.resendOTP({ userId });
      setNotYetSent(false);
      setCountdown(RESEND_SECONDS);
      toast({ type: 'success', title: 'Code sent!', message: `Check ${email} — also check your spam folder.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to send email. Please try again.';
      toast({ type: 'error', title: 'Send failed', message: msg });
    } finally { setSending(false); }
  };

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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to send email. Check SMTP config.';
      toast({ type: 'error', title: 'Email delivery failed', message: msg });
    } finally { setResending(false); }
  };

  const boxW        = isMobile ? '42px' : '52px';
  const boxH        = isMobile ? '50px' : '62px';
  const boxFontSize = isMobile ? '22px' : '28px';

  const boxStyle = (i: number): React.CSSProperties => ({
    width: boxW, height: boxH,
    background: '#FFFFFF',
    border: `2px solid ${error ? '#EF4444' : digits[i] ? '#0B7A5C' : 'rgba(14,26,23,0.2)'}`,
    borderRadius: '12px',
    fontSize: boxFontSize, fontWeight: 800,
    fontFamily: "'Readex Pro', sans-serif",
    color: error ? '#EF4444' : '#0B7A5C',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: digits[i] && !error ? '0 0 12px rgba(11,122,92,0.25)' : 'none',
    cursor: 'default',
    animation: error ? 'shake 0.4s ease' : 'none',
    flexShrink: 0,
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F8F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 12px' : '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'rgba(11,122,92,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />

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
            <WaynLogo size={isMobile ? 24 : 28} />
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(11,122,92,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '28px 18px 24px' : '40px 36px',
          textAlign: 'center', position: 'relative',
        }}>
          {/* Verifying overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: '#FFFFFF', borderRadius: isMobile ? '16px' : '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, zIndex: 10, backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(11,122,92,0.2)', borderTopColor: '#0B7A5C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'rgba(14,26,23,0.74)', fontSize: '14px' }}>{t('auth.verifyingCode')}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── "Not yet sent" screen (login redirect) ── */}
            {notYetSent ? (
              <motion.div key="not-sent"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div style={{
                  width: isMobile ? 56 : 68, height: isMobile ? 56 : 68, borderRadius: '50%',
                  background: 'rgba(11,122,92,0.1)', border: '1px solid rgba(11,122,92,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
                }}>
                  <Icon icon="solar:shield-keyhole-bold-duotone" width={isMobile ? 28 : 34} color="#0B7A5C" />
                </div>

                <h1 style={{ fontFamily: isRTL ? "'Readex Pro', sans-serif" : "'Readex Pro', sans-serif", fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0E1A17', margin: '0 0 10px' }}>
                  Verify Your Account
                </h1>
                <p style={{ color: 'rgba(14,26,23,0.565)', fontSize: '13px', margin: '0 0 8px', lineHeight: 1.6 }}>
                  Your account is not yet verified.
                </p>
                <p style={{ color: 'rgba(14,26,23,0.495)', fontSize: '12px', margin: '0 0 28px', lineHeight: 1.6 }}>
                  We'll send a 6-digit code to{' '}
                  <strong style={{ color: 'rgba(14,26,23,0.74)' }}>{email || 'your email'}</strong>.
                </p>

                <GoldButton fullWidth size="lg" loading={sending} onClick={handleSendInitial}>
                  {!sending && <Icon icon="solar:letter-bold" width={16} />}
                  {sending ? 'Sending…' : 'Send Verification Code'}
                </GoldButton>
              </motion.div>

            ) : (
              /* ── Normal OTP entry screen ── */
              <motion.div key="otp-entry"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Status icon */}
                <div style={{
                  width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <Icon icon="solar:letter-bold-duotone" width={isMobile ? 26 : 32} color="#10B981" />
                </div>

                <h1 style={{ fontFamily: isRTL ? "'Readex Pro', sans-serif" : "'Readex Pro', sans-serif", fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: '#0E1A17', margin: '0 0 12px' }}>
                  {t('auth.checkEmail')}
                </h1>

                {/* Sent banner */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '18px',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  <Icon icon="solar:check-circle-bold" width={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ color: '#10B981', fontSize: '12px', fontWeight: 600, margin: '0 0 2px' }}>{t('auth.emailSentOk')}</p>
                    <p style={{ color: 'rgba(14,26,23,0.6)', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
                      Sent to <strong style={{ color: 'rgba(14,26,23,0.81)' }}>{email}</strong>.{' '}
                      Also check <strong style={{ color: 'rgba(14,26,23,0.81)' }}>spam / junk</strong>.
                    </p>
                  </div>
                </motion.div>

                <p style={{ color: 'rgba(14,26,23,0.495)', fontSize: '12px', margin: '0 0 20px' }}>
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
                    <p style={{ fontSize: '13px', color: 'rgba(14,26,23,0.53)', margin: 0 }}>
                      {t('auth.resendIn')} <strong style={{ color: 'rgba(14,26,23,0.74)' }}>{formatTime(countdown)}</strong>
                    </p>
                  ) : (
                    <button onClick={handleResend} disabled={resending}
                      style={{ background: 'none', border: 'none', cursor: resending ? 'default' : 'pointer', color: resending ? 'rgba(11,122,92,0.4)' : '#0B7A5C', fontSize: '13px', fontWeight: 600, padding: 0 }}>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(14,26,23,0.39)', marginTop: '16px' }}>
          {t('auth.wrongEmail')}{' '}
          <Link to="/signup" style={{ color: 'rgba(11,122,92,0.5)', textDecoration: 'none' }}>{t('auth.startOver')}</Link>
        </p>
      </motion.div>
    </div>
  );
};
