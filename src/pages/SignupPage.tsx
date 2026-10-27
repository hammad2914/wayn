import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { CountryDropdown } from '../components/ui/CountryDropdown';
import { LangToggle } from '../components/ui/LangToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { WaynLogo } from '../components/ui/WaynLogo';

interface FormValues {
  fullName:        string;
  companyName:     string;
  email:           string;
  phone:           string;
  country:         string;
  password:        string;
  confirmPassword: string;
}

const getStrength = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

export const SignupPage: React.FC = () => {
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const { isMobile } = useBreakpoint();
  const { t, isRTL } = useLanguage();
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { country: 'AE' },
  });

  const pwValue  = watch('password', '');
  const strength = getStrength(pwValue);
  const strengthColors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
  const strengthLabels = ['', t('auth.weak'), t('auth.fair'), t('auth.good'), t('auth.strong')];

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '13px 16px', fontSize: '14px', color: '#FFFFFF',
    outline: 'none', height: '52px', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif",
    direction: 'ltr',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: 'rgba(255,255,255,0.7)', marginBottom: '6px',
  };

  const onSubmit = async (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      toast({ type: 'error', title: 'Passwords do not match' }); return;
    }
    setLoading(true);
    try {
      const res = await authAPI.signup({
        email:       data.email,
        companyName: data.companyName,
        fullName:    data.fullName,
        password:    data.password,
        phone:       data.phone || undefined,
        country:     data.country || undefined,
      });
      const { userId, emailSent } = res.data?.data as { userId: string; emailSent: boolean };

      if (emailSent) {
        toast({ type: 'success', title: 'Verification email sent!', message: `We sent a 6-digit code to ${data.email}` });
      } else {
        toast({ type: 'warning', title: 'Email delivery failed', message: "Account created but we couldn't send the email. Try resend." });
      }

      navigate(`/verify-otp?userId=${userId}&email=${encodeURIComponent(data.email)}&emailSent=${emailSent}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Signup failed. Please try again.';
      toast({ type: 'error', title: 'Signup failed', message: msg });
    } finally { setLoading(false); }
  };

  const fieldErr = (msg?: string) =>
    msg ? <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{msg}</p> : null;

  const twoCol  = isMobile ? '1fr' : '1fr 1fr';
  const cardPad = isMobile ? '24px 18px' : '40px';

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0E27',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: isMobile ? '24px 12px 32px' : '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'fixed', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(245,200,66,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-15%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Lang toggle — top right */}
      <div style={{ position: 'fixed', top: 16, right: isRTL ? 'auto' : 16, left: isRTL ? 16 : 'auto', zIndex: 100 }}>
        <LangToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: isMobile ? '100%' : '520px' }}
      >
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '28px' }}>
          <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <WaynLogo size={isMobile ? 26 : 30} />
          </Link>
          <h1 style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Sora', sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', margin: '14px 0 6px' }}>{t('auth.createAccount')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '13px' : '14px', margin: 0 }}>{t('auth.createAccountSubtitle')}</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(12,17,45,0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,200,66,0.2)', borderRadius: isMobile ? '16px' : '20px',
          padding: cardPad,
        }}>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Full Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{t('auth.fullName')}</label>
              <input
                className="auth-input"
                style={{ ...inputStyle, ...(errors.fullName ? { borderColor: '#EF4444' } : {}) }}
                placeholder={isRTL ? 'محمد علي' : 'John Smith'}
                {...register('fullName', { required: 'Required' })}
              />
              {fieldErr(errors.fullName?.message)}
            </div>

            {/* Company */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{t('auth.companyName')}</label>
              <input
                className="auth-input"
                style={{ ...inputStyle, ...(errors.companyName ? { borderColor: '#EF4444' } : {}) }}
                placeholder={isRTL ? 'شركة أكمي للوجستيات' : 'Acme Logistics LLC'}
                {...register('companyName', { required: 'Required' })}
              />
              {fieldErr(errors.companyName?.message)}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{t('auth.emailAddress')}</label>
              <input
                className="auth-input"
                type="email"
                style={{ ...inputStyle, ...(errors.email ? { borderColor: '#EF4444' } : {}) }}
                placeholder="you@company.com"
                {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
              />
              {fieldErr(errors.email?.message)}
            </div>

            {/* Phone + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>{t('auth.phone')} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{t('auth.optional')}</span></label>
                <input
                  className="auth-input"
                  type="tel" style={inputStyle} placeholder="+971 50 000 0000"
                  {...register('phone')}
                />
              </div>
              <div>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <CountryDropdown value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            {/* Password + Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '12px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>{t('auth.password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showPw ? 'text' : 'password'}
                    style={{ ...inputStyle, [isRTL ? 'paddingLeft' : 'paddingRight']: '44px', ...(errors.password ? { borderColor: '#EF4444' } : {}) }}
                    placeholder={isRTL ? '٨ أحرف على الأقل' : 'Min 8 characters'}
                    {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    <Icon icon={showPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                  </button>
                </div>
                {fieldErr(errors.password?.message)}
              </div>
              <div>
                <label style={labelStyle}>{t('auth.confirmPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showCPw ? 'text' : 'password'}
                    style={{ ...inputStyle, [isRTL ? 'paddingLeft' : 'paddingRight']: '44px', ...(errors.confirmPassword ? { borderColor: '#EF4444' } : {}) }}
                    placeholder={isRTL ? 'أعد كتابة كلمة المرور' : 'Repeat password'}
                    {...register('confirmPassword', { required: 'Required' })}
                  />
                  <button type="button" onClick={() => setShowCPw(!showCPw)}
                    style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    <Icon icon={showCPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                  </button>
                </div>
                {fieldErr(errors.confirmPassword?.message)}
              </div>
            </div>

            {/* Password strength */}
            <AnimatePresence>
              {pwValue.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: '18px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '11px', color: strengthColors[strength], margin: 0 }}>{strengthLabels[strength]}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <GoldButton type="submit" loading={loading} fullWidth size="lg">
              {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
              {!loading && <Icon icon={isRTL ? 'solar:arrow-left-bold' : 'solar:arrow-right-bold'} width={16} />}
            </GoldButton>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '18px' }}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: '#F5C842', fontWeight: 600, textDecoration: 'none' }}>{t('auth.signIn')}</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
          {t('auth.secured')}
        </p>
      </motion.div>
    </div>
  );
};
