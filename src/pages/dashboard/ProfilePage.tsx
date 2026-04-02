import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth';
import { useUsage } from '../../hooks/useUsage';
import { COUNTRIES } from '../../components/ui/CountryDropdown';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';

const cardStyle: React.CSSProperties = {
  background: 'rgba(12,17,45,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '24px',
};

const InfoRow: React.FC<{ icon: string; label: string; value: string; color?: string }> = ({ icon, label, value, color = '#F5C842' }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
      <Icon icon={icon} width={18} color={color} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: '14px', color: '#FFFFFF', margin: 0, fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</p>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { usage } = useUsage();
  const { isMobile } = useBreakpoint();
  const { t, lang } = useLanguage();

  // Ensure createdAt and latest profile data are always fresh
  useEffect(() => { refreshUser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const firstName   = user.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'User';
  const initial     = firstName.charAt(0).toUpperCase();
  const countryName = COUNTRIES.find(c => c.code === user.country)?.name || user.country || '—';

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const addrUsed  = usage?.addressNormalizerCount ?? 0;
  const addrLimit = usage?.addressNormalizerLimit  ?? 10;
  const routeUsed  = usage?.routeOptimizerCount ?? 0;
  const routeLimit = usage?.routeOptimizerLimit  ?? 5;

  const UsageBar: React.FC<{ label: string; icon: string; used: number; limit: number; color: string }> = ({ label, icon, used, limit, color }) => {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon icon={icon} width={14} color={color} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color }}>{used} / {limit}</span>
        </div>
        <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Hero card */}
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, rgba(245,200,66,0.06) 0%, rgba(12,17,45,0.9) 60%)',
          border: '1px solid rgba(245,200,66,0.2)',
          marginBottom: '20px',
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', gap: '24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,200,66,0.05)', pointerEvents: 'none' }} />

          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: isMobile ? 72 : 88, height: isMobile ? 72 : 88, borderRadius: '50%', background: 'linear-gradient(135deg, #F5C842, #D4A017)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: isMobile ? 28 : 36, color: '#0A0E27', boxShadow: '0 0 30px rgba(245,200,66,0.3)' }}>
              {initial}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#10B981', border: '2px solid #0A0E27' }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.fullName || user.name}
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 10px' }}>{user.email}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)', color: '#F5C842', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                <Icon icon="solar:buildings-bold-duotone" width={12} />{user.companyName}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
                <Icon icon="solar:shield-user-bold-duotone" width={12} />{user.role}
              </span>
              {user.country && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                  <Icon icon="solar:global-bold-duotone" width={12} />{countryName}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <Link to="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '10px', color: '#F5C842', fontSize: '13px', fontWeight: 700, textDecoration: 'none', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,200,66,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,200,66,0.1)'; }}>
            <Icon icon="solar:pen-bold" width={14} />{t('profile.editProfile')}
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>

          {/* Account details */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <Icon icon="solar:user-id-bold-duotone" width={18} color="#F5C842" />
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{t('profile.accountDetails')}</h3>
              </div>
              <InfoRow icon="solar:user-bold-duotone"        label={t('profile.fullName')} value={user.fullName || user.name} color="#F5C842" />
              <InfoRow icon="solar:letter-bold-duotone"      label={t('profile.email')}    value={user.email}  color="#3B82F6" />
              <InfoRow icon="solar:buildings-bold-duotone"   label={t('profile.company')}  value={user.companyName} color="#10B981" />
              <InfoRow icon="solar:global-bold-duotone"      label={t('profile.country')}  value={countryName} color="#A855F7" />
              <div style={{ paddingTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <Icon icon="solar:calendar-bold-duotone" width={18} color="#F5C842" />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{t('profile.memberSince')}</p>
                    <p style={{ fontSize: '14px', color: '#FFFFFF', margin: 0, fontWeight: 500 }}>{joinDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Usage */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Icon icon="solar:graph-up-bold-duotone" width={18} color="#10B981" />
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{t('profile.apiUsage')}</h3>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{t('profile.thisMonth')}</span>
              </div>
              <UsageBar
                label={t('profile.addrNormalizer')}
                icon="solar:map-point-wave-bold-duotone"
                used={addrUsed} limit={addrLimit}
                color={addrUsed >= addrLimit ? '#EF4444' : addrUsed / addrLimit >= 0.8 ? '#F59E0B' : '#10B981'}
              />
              <UsageBar
                label={t('profile.routeOptimizer')}
                icon="solar:routing-2-bold-duotone"
                used={routeUsed} limit={routeLimit}
                color={routeUsed >= routeLimit ? '#EF4444' : routeUsed / routeLimit >= 0.8 ? '#F59E0B' : '#3B82F6'}
              />
              <div style={{ background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.1)', borderRadius: '10px', padding: '12px 14px', marginTop: '8px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                  {t('profile.usageResets')}
                </p>
              </div>
            </div>

            {/* Security */}
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Icon icon="solar:shield-check-bold-duotone" width={18} color="#A855F7" />
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{t('profile.security')}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                <Icon icon="solar:lock-password-bold-duotone" width={16} color="rgba(255,255,255,0.4)" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500 }}>{t('profile.password')}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{t('profile.lastChanged')}</p>
                </div>
                <Link to="/dashboard/settings#security" style={{ fontSize: '12px', color: '#F5C842', textDecoration: 'none', fontWeight: 600 }}>{t('profile.change')}</Link>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};
