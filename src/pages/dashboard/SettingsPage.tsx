import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { GoldButton } from '../../components/ui/GoldButton';
import { CountryDropdown } from '../../components/ui/CountryDropdown';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// ── Shared styles ──────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'rgba(12,17,45,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', padding: '28px',
  marginBottom: '20px',
};

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
const strengthColors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// ── Profile form ───────────────────────────────────────────────────────────────
interface ProfileForm {
  fullName:    string;
  companyName: string;
  phone:       string;
  country:     string;
}

// ── Password form ──────────────────────────────────────────────────────────────
interface PasswordForm {
  currentPassword:  string;
  newPassword:      string;
  confirmPassword:  string;
}

// ── Section header ─────────────────────────────────────────────────────────────
const SectionHead: React.FC<{ icon: string; title: string; subtitle: string; color: string }> = ({ icon, title, subtitle, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
    <div style={{ width: 40, height: 40, borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon icon={icon} width={20} color={color} />
    </div>
    <div>
      <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{title}</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{subtitle}</p>
    </div>
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────
export const SettingsPage: React.FC = () => {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();

  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading,      setPwLoading]      = useState(false);
  const [showCurr,       setShowCurr]       = useState(false);
  const [showNew,        setShowNew]        = useState(false);
  const [showConf,       setShowConf]       = useState(false);

  // Profile form
  const { register: regP, handleSubmit: hsP, control: ctrlP, reset: resetP, formState: { errors: errsP } } = useForm<ProfileForm>();

  // Password form
  const { register: regPw, handleSubmit: hsPw, watch: watchPw, reset: resetPw, formState: { errors: errsPw } } = useForm<PasswordForm>();
  const newPwValue = watchPw('newPassword', '');
  const strength   = getStrength(newPwValue);

  // Pre-fill profile form from user
  useEffect(() => {
    if (user) {
      resetP({
        fullName:    user.fullName || user.name || '',
        companyName: user.companyName || '',
        phone:       '',
        country:     user.country || 'AE',
      });
    }
  }, [user, resetP]);

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!token) return;
    setProfileLoading(true);
    try {
      await authAPI.updateProfile({
        fullName:    data.fullName,
        companyName: data.companyName,
        phone:       data.phone || undefined,
        country:     data.country,
      }, token);
      await refreshUser();
      toast({ type: 'success', title: 'Profile updated', message: 'Your profile information has been saved.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed.';
      toast({ type: 'error', title: 'Update failed', message: msg });
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (!token) return;
    if (data.newPassword !== data.confirmPassword) {
      toast({ type: 'error', title: 'Passwords do not match' }); return;
    }
    setPwLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      }, token);
      resetPw();
      toast({ type: 'success', title: 'Password changed', message: 'Your password has been updated successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Password change failed.';
      toast({ type: 'error', title: 'Failed', message: msg });
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  const twoCol = isMobile ? '1fr' : '1fr 1fr';

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{msg}</p> : null;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* ── Profile settings ── */}
        <div id="profile" style={cardStyle}>
          <SectionHead
            icon="solar:user-bold-duotone"
            title="Profile Information"
            subtitle="Update your name, company and regional settings"
            color="#F5C842"
          />

          <form onSubmit={hsP(onProfileSubmit)}>
            {/* Full name + Company */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  style={{ ...inputStyle, ...(errsP.fullName ? { borderColor: '#EF4444' } : {}) }}
                  placeholder="John Smith"
                  onFocus={e => (e.target.style.borderColor = '#F5C842')}
                  {...regP('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                  onBlur={e => (e.target.style.borderColor = errsP.fullName ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                />
                <FieldError msg={errsP.fullName?.message} />
              </div>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input
                  style={{ ...inputStyle, ...(errsP.companyName ? { borderColor: '#EF4444' } : {}) }}
                  placeholder="Acme Logistics"
                  onFocus={e => (e.target.style.borderColor = '#F5C842')}
                  {...regP('companyName', { required: 'Company name is required' })}
                  onBlur={e => (e.target.style.borderColor = errsP.companyName ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                />
                <FieldError msg={errsP.companyName?.message} />
              </div>
            </div>

            {/* Phone + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Phone <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="+971 50 000 0000"
                  onFocus={e => (e.target.style.borderColor = '#F5C842')}
                  {...regP('phone')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>
              <div>
                <Controller
                  name="country"
                  control={ctrlP}
                  render={({ field }) => (
                    <CountryDropdown label="Country" value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            {/* Email — read only */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Email Address <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(cannot be changed)</span></label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                  <Icon icon="solar:lock-bold" width={16} color="rgba(255,255,255,0.2)" />
                </div>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  style={{ ...inputStyle, paddingLeft: '42px', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <GoldButton type="submit" loading={profileLoading} size="md">
                {!profileLoading && <Icon icon="solar:check-bold" width={16} />}
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </GoldButton>
            </div>
          </form>
        </div>

        {/* ── Password settings ── */}
        <div id="security" style={cardStyle}>
          <SectionHead
            icon="solar:lock-password-bold-duotone"
            title="Change Password"
            subtitle="Enter your current password to set a new one"
            color="#A855F7"
          />

          <form onSubmit={hsPw(onPasswordSubmit)}>
            {/* Current password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurr ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: '44px', ...(errsPw.currentPassword ? { borderColor: '#EF4444' } : {}) }}
                  placeholder="Your current password"
                  onFocus={e => (e.target.style.borderColor = '#A855F7')}
                  {...regPw('currentPassword', { required: 'Current password is required' })}
                  onBlur={e => (e.target.style.borderColor = errsPw.currentPassword ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                />
                <button type="button" onClick={() => setShowCurr(!showCurr)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                  <Icon icon={showCurr ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                </button>
              </div>
              <FieldError msg={errsPw.currentPassword?.message} />
              <div style={{ textAlign: 'right', marginTop: '5px' }}>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'rgba(245,200,66,0.6)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,200,66,0.6)')}>
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* New + Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: twoCol, gap: '16px', marginBottom: '8px' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px', ...(errsPw.newPassword ? { borderColor: '#EF4444' } : {}) }}
                    placeholder="Min 8 characters"
                    onFocus={e => (e.target.style.borderColor = '#A855F7')}
                    {...regPw('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                    onBlur={e => (e.target.style.borderColor = errsPw.newPassword ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    <Icon icon={showNew ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                  </button>
                </div>
                <FieldError msg={errsPw.newPassword?.message} />
                {newPwValue.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: strengthColors[strength], margin: 0 }}>{strengthLabels[strength]}</p>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConf ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '44px', ...(errsPw.confirmPassword ? { borderColor: '#EF4444' } : {}) }}
                    placeholder="Repeat new password"
                    onFocus={e => (e.target.style.borderColor = '#A855F7')}
                    {...regPw('confirmPassword', { required: 'Required' })}
                    onBlur={e => (e.target.style.borderColor = errsPw.confirmPassword ? '#EF4444' : 'rgba(255,255,255,0.12)')}
                  />
                  <button type="button" onClick={() => setShowConf(!showConf)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    <Icon icon={showConf ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                  </button>
                </div>
                <FieldError msg={errsPw.confirmPassword?.message} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <GoldButton type="submit" loading={pwLoading} size="md">
                {!pwLoading && <Icon icon="solar:lock-password-bold" width={16} />}
                {pwLoading ? 'Changing…' : 'Change Password'}
              </GoldButton>
            </div>
          </form>
        </div>

        {/* ── Danger zone ── */}
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.15)' }}>
          <SectionHead
            icon="solar:danger-bold-duotone"
            title="Account"
            subtitle="Email address and account status"
            color="#EF4444"
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 2px', fontWeight: 500 }}>Email address</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{user.email} · <span style={{ color: '#10B981' }}>Verified</span></p>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Email changes require support</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
