import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth';
import { useUsage } from '../../hooks/useUsage';
import { useLanguage } from '../../contexts/LanguageContext';
import { LangToggle } from '../ui/LangToggle';
import { WaynLogo } from '../ui/WaynLogo';

const ANIM = '0.22s cubic-bezier(0.4,0,0.2,1)'; // shared easing

// Text that fades + collapses inline without unmounting (prevents jerk)
const SlideLabel: React.FC<{ children: React.ReactNode; collapsed: boolean; style?: React.CSSProperties }> = ({ children, collapsed, style }) => (
  <span style={{
    opacity:    collapsed ? 0 : 1,
    maxWidth:   collapsed ? 0 : '220px',
    overflow:   'hidden',
    whiteSpace: 'nowrap',
    display:    'inline-block',
    transition: `opacity ${ANIM}, max-width ${ANIM}`,
    ...style,
  }}>
    {children}
  </span>
);

const UsageBar: React.FC<{ label: string; icon: string; used: number; limit: number; collapsed: boolean }> = ({ label, icon, used, limit, collapsed }) => {
  const pct   = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  return (
    <div style={{ marginBottom: collapsed ? 0 : '10px' }} title={collapsed ? `${label}: ${used}/${limit}` : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon icon={icon} width={collapsed ? 18 : 14} color={color} style={{ flexShrink: 0, transition: `width ${ANIM}` }} />
          <SlideLabel collapsed={collapsed} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            {label}
          </SlideLabel>
        </div>
        <SlideLabel collapsed={collapsed} style={{ fontSize: '11px', color, fontWeight: 700, marginLeft: '4px' }}>
          {used}/{limit}
        </SlideLabel>
      </div>
      <div style={{
        height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden',
        maxHeight: collapsed ? 0 : '4px', transition: `max-height ${ANIM}`,
      }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { user, logout }  = useAuth();
  const { usage }         = useUsage();
  const { t, isRTL }      = useLanguage();
  const navigate          = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };
  const firstName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User';

  const navItems = [
    { to: '/dashboard',                    icon: 'solar:chart-square-bold-duotone',   label: t('dash.dashboard'),        end: true },
    { to: '/dashboard/address-normalizer', icon: 'solar:map-point-wave-bold-duotone', label: t('dash.addressNormalizer') },
    { to: '/dashboard/route-optimizer',    icon: 'solar:routing-2-bold-duotone',       label: t('dash.routeOptimizer') },
  ];

  const bottomNavItems = [
    { to: '/dashboard/profile',  icon: 'solar:user-bold-duotone',     label: t('dash.myProfile') },
    { to: '/dashboard/settings', icon: 'solar:settings-bold-duotone', label: t('dash.settings') },
  ];

  // the active item is marked by its tint, not an edge bar
  const activeAccent = {};
  const inactiveAccent = {};

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: 'rgba(10,14,39,0.97)',
        borderRight: isRTL ? 'none' : '1px solid rgba(245,200,66,0.1)',
        borderLeft:  isRTL ? '1px solid rgba(245,200,66,0.1)' : 'none',
        display: 'flex', flexDirection: 'column', height: '100vh',
        overflow: 'hidden', flexShrink: 0,
        backdropFilter: 'blur(20px)',
        position: 'relative',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', height: '60px',
        padding: '0 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, overflow: 'hidden',
       
      }}>
        {collapsed ? (
          <WaynLogo size={26} markOnly />
        ) : (
          <span style={{ display: 'block', flexShrink: 0, marginLeft: isRTL ? 0 : '6px', marginRight: isRTL ? '6px' : 0 }}>
            <WaynLogo size={22} />
          </span>
        )}

        {/* Pushes collapse button to the far end */}
        <div style={{ flex: 1 }} />

        <button
          onClick={() => onCollapse(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: '4px', display: 'flex',
            borderRadius: '6px', flexShrink: 0,
            opacity:    collapsed ? 0 : 1,
            maxWidth:   collapsed ? 0 : '32px',
            overflow:   'hidden',
            pointerEvents: collapsed ? 'none' : 'auto',
            transition: `opacity ${ANIM}, max-width ${ANIM}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F5C842')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <Icon icon="solar:sidebar-minimalistic-bold" width={18} />
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map(({ to, icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            title={collapsed ? label : undefined}
            style={{ textDecoration: 'none', display: 'block', marginBottom: '2px' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 12px',
                borderRadius: '10px',
                background: isActive ? 'rgba(245,200,66,0.1)' : 'transparent',
                ...(isActive ? activeAccent : inactiveAccent),
                transition: `background 0.15s, border-color 0.15s`,
                cursor: 'pointer', overflow: 'hidden',
               
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon icon={icon} width={20} color={isActive ? '#F5C842' : 'rgba(255,255,255,0.45)'} style={{ flexShrink: 0 }} />
                <SlideLabel collapsed={collapsed} style={{ fontSize: '13.5px', fontWeight: isActive ? 700 : 500, color: isActive ? '#F5C842' : 'rgba(255,255,255,0.6)', marginLeft: isRTL ? 0 : '10px', marginRight: isRTL ? '10px' : 0 }}>
                  {label}
                </SlideLabel>
              </div>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />

        {/* Profile + Settings */}
        {bottomNavItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            title={collapsed ? label : undefined}
            style={{ textDecoration: 'none', display: 'block', marginBottom: '2px' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 12px',
                borderRadius: '10px',
                background: isActive ? 'rgba(245,200,66,0.1)' : 'transparent',
                ...(isActive ? activeAccent : inactiveAccent),
                transition: `background 0.15s, border-color 0.15s`,
                cursor: 'pointer', overflow: 'hidden',
               
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon icon={icon} width={20} color={isActive ? '#F5C842' : 'rgba(255,255,255,0.45)'} style={{ flexShrink: 0 }} />
                <SlideLabel collapsed={collapsed} style={{ fontSize: '13.5px', fontWeight: isActive ? 700 : 500, color: isActive ? '#F5C842' : 'rgba(255,255,255,0.6)', marginLeft: isRTL ? 0 : '10px', marginRight: isRTL ? '10px' : 0 }}>
                  {label}
                </SlideLabel>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Usage ───────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, opacity: collapsed ? 0 : 1, maxHeight: collapsed ? 0 : '200px', overflow: 'hidden', transition: `opacity ${ANIM}, max-height ${ANIM}`, paddingTop: collapsed ? 0 : '12px', paddingBottom: collapsed ? 0 : '12px', borderTopWidth: collapsed ? 0 : '1px', borderBottomWidth: collapsed ? 0 : '1px' }}>
        <div style={{
          opacity: collapsed ? 0 : 1, maxHeight: collapsed ? 0 : '20px', overflow: 'hidden',
          transition: `opacity ${ANIM}, max-height ${ANIM}`,
          marginBottom: collapsed ? 0 : '10px',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{t('dash.usage')}</p>
        </div>
        {usage && (
          <>
            <UsageBar label={t('dash.addressNormalizer')} icon="solar:map-point-wave-bold-duotone"
              used={usage.addressNormalizerCount} limit={usage.addressNormalizerLimit} collapsed={collapsed} />
            <UsageBar label={t('dash.routeOptimizer')} icon="solar:routing-2-bold-duotone"
              used={usage.routeOptimizerCount} limit={usage.routeOptimizerLimit} collapsed={collapsed} />
          </>
        )}
      </div>

      {/* ── Lang Toggle ─────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        display: 'flex', justifyContent: 'center',
        opacity: collapsed ? 0 : 1,
        maxHeight: collapsed ? 0 : '52px',
        overflow: 'hidden',
        transition: `opacity ${ANIM}, max-height ${ANIM}`,
        paddingTop: collapsed ? 0 : '8px',
        paddingBottom: collapsed ? 0 : '8px',
        borderBottomWidth: collapsed ? 0 : '1px',
      }}>
        <LangToggle variant="pill" />
      </div>

      {/* ── User + Logout ────────────────────────────────────────────── */}
      <div style={{ padding: '10px 8px', flexShrink: 0 }}>
        <NavLink to="/dashboard/profile" style={{ textDecoration: 'none', display: 'block', marginBottom: '4px' }} title={collapsed ? t('dash.myProfile') : undefined}>
          {({ isActive }) => (
            <div style={{
              display: 'flex', alignItems: 'center', padding: '10px 8px',
              borderRadius: '10px',
              background: isActive ? 'rgba(245,200,66,0.1)' : collapsed ? 'transparent' : 'rgba(255,255,255,0.04)',
              transition: `background ${ANIM}`,
              overflow: 'hidden', cursor: 'pointer',
             
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(245,200,66,0.1)' : collapsed ? 'transparent' : 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #F5C842, #D4A017)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0A0E27', fontFamily: 'Sora', flexShrink: 0 }}>
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div style={{
                minWidth: 0, marginLeft: isRTL ? 0 : '10px', marginRight: isRTL ? '10px' : 0,
                opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : '160px', overflow: 'hidden',
                transition: `opacity ${ANIM}, max-width ${ANIM}`,
              }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#F5C842' : '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.companyName || user?.email}</p>
              </div>
            </div>
          )}
        </NavLink>

        {/* Logout */}
        <button onClick={handleLogout}
          title={collapsed ? t('dash.signOut') : undefined}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            padding: '10px 8px',
            justifyContent: 'flex-start',
            background: 'none', border: 'none', cursor: 'pointer', borderRadius: '10px',
            color: 'rgba(255,255,255,0.4)', transition: `all 0.2s`,
            overflow: 'hidden',
           
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none'; }}
        >
          <Icon icon="solar:logout-line-duotone" width={24} style={{ flexShrink: 0 }} />
          <SlideLabel collapsed={collapsed} style={{ fontSize: '13px', fontWeight: 500, marginLeft: isRTL ? 0 : '10px', marginRight: isRTL ? '10px' : 0 }}>
            {t('dash.signOut')}
          </SlideLabel>
        </button>
      </div>
    </motion.aside>
  );
};
