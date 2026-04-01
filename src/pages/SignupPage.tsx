import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { authAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { GoldButton } from '../components/ui/GoldButton';
import { CountryDropdown } from '../components/ui/CountryDropdown';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface FormValues {
  fullName:        string;
  companyName:     string;
  email:           string;
  phone:           string;
  country:         string;
  password:        string;
  confirmPassword: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
  padding: '13px 16px', fontSize: '14px', color: '#FFFFFF',
  outline: 'none', height: '52px', boxSizing: 'border-box',
  transition: 'border-color 0.2s', fontFamily: "'Inter', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'rgba(255,255,255,0.7)', marginBottom: '6px',
};

const getStrength = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { country: 'AE' },
  });

  const pwValue  = watch('password', '');
  const strength = getStrength(pwValue);
  const strengthColors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

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

  const twoCol = isMobile ? '1fr' : '1fr 1fr';
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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: isMobile ? '100%' : '520px' }}
      >
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '28px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: '50%', background: 'linear-gradient(135deg, #F5C842, #D4A017)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora', fontWeight: 800, fontSize: isMobile ? 15 : 18, color: '#0A0E27' }}>A</div>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#FFFFFF', fontSize: isMobile ? 17 : 20, letterSpacing: '-0.3px' }}>WAYN</span>
          </Link>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: '#FFFFFF', margin: '14px 0 6px' }}>Create your account</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '13px' : '14px', margin: 0 }}>Start optimizing your logistics today</p>
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
              <label style={labelStyle}>Full Name</label>
              <input
                className="auth-input"
                style={{ ...inputStyle, ...(errors.fullName ? { borderColor: '#EF4444' } : {}) }}
                placeholder="John Smith"
                {...register('fullName', { required: 'Required' })}
              />
              {fieldErr(errors.fullName?.message)}
            </div>

            {/* Row 2: Company */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Company Name</label>
              <input
                className="auth-input"
                style={{ ...inputStyle, ...(errors.companyName ? { borderColor: '#EF4444' } : {}) }}
                placeholder="Acme Logistics LLC"
                {...register('companyName', { required: 'Required' })}
              />
              {fieldErr(errors.companyName?.message)}
            </div>

            {/* Row 3: Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email Address</label>
              <input
                className="auth-input"
                type="email"
                style={{ ...inputStyle, ...(errors.email ? { borderColor: '#EF4444' } : {}) }}
                placeholder="you@company.com"
                {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
              />
              {fieldErr(errors.email?.message)}
            </div>

            {/* Row 4: Phone + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Phone <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optional)</span></label>
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

            {/* Row 5: Password + Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '12px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showPw ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px', ...(errors.password ? { borderColor: '#EF4444' } : {}) }}
                    placeholder="Min 8 characters"
                    {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    <Icon icon={showPw ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                  </button>
                </div>
                {fieldErr(errors.password?.message)}
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="auth-input"
                    type={showCPw ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px', ...(errors.confirmPassword ? { borderColor: '#EF4444' } : {}) }}
                    placeholder="Repeat password"
                    {...register('confirmPassword', { required: 'Required' })}
                  />
                  <button type="button" onClick={() => setShowCPw(!showCPw)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
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
              {loading ? 'Creating Account…' : 'Create Account'}
              {!loading && <Icon icon="solar:arrow-right-bold" width={16} />}
            </GoldButton>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '18px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#F5C842', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
          Secured with JWT authentication · Wayn 2026
        </p>
      </motion.div>
    </div>
  );
};
