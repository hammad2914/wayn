import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Sidebar } from '../../components/layout/Sidebar';
import { LangToggle } from '../../components/ui/LangToggle';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useLanguage } from '../../contexts/LanguageContext';
import { UsageProvider } from '../../contexts/UsageContext';

export const DashboardLayout: React.FC = () => {
  const location               = useLocation();
  const navigate               = useNavigate();
  const { user, logout }       = useAuth();
  const { isMd }               = useBreakpoint();
  const { t, isRTL }           = useLanguage();
  const [dropOpen, setDropOpen]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    '/dashboard':                        { title: t('dash.dashboard'),        subtitle: t('dash.overview') },
    '/dashboard/address-normalizer':     { title: t('dash.addressNormalizer'), subtitle: t('dash.addressNormalizerSub') },
    '/dashboard/route-optimizer':        { title: t('dash.routeOptimizer'),    subtitle: t('dash.routeOptimizerSub') },
    '/dashboard/profile':                { title: t('dash.myProfile'),         subtitle: t('dash.myProfileSub') },
    '/dashboard/settings':               { title: t('dash.settings'),          subtitle: t('dash.settingsSub') },
  };

  const mobileNavItems = [
    { to: '/dashboard',                    icon: 'solar:chart-square-bold-duotone',   label: t('dash.home'),      end: true },
    { to: '/dashboard/address-normalizer', icon: 'solar:map-point-wave-bold-duotone', label: t('dash.normalize') },
    { to: '/dashboard/route-optimizer',    icon: 'solar:routing-2-bold-duotone',       label: t('dash.routes') },
    { to: '/dashboard/profile',            icon: 'solar:user-bold-duotone',            label: t('dash.profile') },
  ];

  const pageInfo = pageTitles[location.pathname] || { title: t('dash.dashboard'), subtitle: '' };
  const firstName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User';

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <UsageProvider>
    <div style={{ display: 'flex', height: '100vh', background: '#0A0E27', overflow: 'hidden', position: 'relative', flexDirection: isRTL ? 'row-reverse' : 'row' }}>

      {/* ── Sidebar (desktop only) + expand button ─────────────────────── */}
      {!isMd && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

          <AnimatePresence>
            {collapsed && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => setCollapsed(false)}
                style={{
                  position: 'absolute',
                  [isRTL ? 'left' : 'right']: isRTL ? '55px' : '-12px',
                  top: '20px',
                  transform: 'translateY(-50%)',
                  width: 24, height: 24,
                  borderRadius: '50%',
                  background: '#F5C842',
                  border: '2px solid rgba(10,14,39,0.9)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  zIndex: 50,
                }}
              >
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  width={12}
                  color="#0A0E27"
                  // style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
                />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Main column ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          background: 'rgba(10,14,39,0.97)',
          borderBottom: '1px solid rgba(245,200,66,0.08)',
          padding: isMd ? '0 16px' : '0 24px',
          height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, backdropFilter: 'blur(16px)',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {/* Mobile: show logo */}
            {isMd && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: isRTL ? 0 : '8px', marginLeft: isRTL ? '8px' : 0, flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #F5C842, #D4A017)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#0A0E27', fontFamily: 'Sora' }}>A</div>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#FFFFFF', fontSize: isMd ? '15px' : '17px', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pageInfo.title}
              </h1>
              {!isMd && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>{pageInfo.subtitle}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {/* Lang toggle — visible on desktop in topbar */}
            {!isMd && <LangToggle variant="minimal" />}

            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
              <Icon icon="solar:bell-bold-duotone" width={18} />
            </button>

            {/* User dropdown */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropOpen(!dropOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F5C842, #D4A017)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#0A0E27', fontFamily: 'Sora', flexShrink: 0 }}>
                  {firstName.charAt(0).toUpperCase()}
                </div>
                {!isMd && (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{firstName}</span>
                    <Icon icon="solar:alt-arrow-down-bold" width={14} color="rgba(255,255,255,0.4)" />
                  </>
                )}
              </button>

              <AnimatePresence>
                {dropOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', [isRTL ? 'left' : 'right']: 0, top: 'calc(100% + 8px)', background: 'rgba(12,17,45,0.98)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '12px', padding: '6px', minWidth: '160px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200 }}
                    onMouseLeave={() => setDropOpen(false)}
                  >
                    {[
                      { icon: 'solar:user-bold-duotone',     label: t('dash.myProfile'),  to: '/dashboard/profile' },
                      { icon: 'solar:settings-bold-duotone', label: t('dash.settings'), to: '/dashboard/settings' },
                    ].map(item => (
                      <button key={item.label} onClick={() => { setDropOpen(false); navigate(item.to); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', textAlign: isRTL ? 'right' : 'left', flexDirection: isRTL ? 'row-reverse' : 'row' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <Icon icon={item.icon} width={16} color="#F5C842" />{item.label}
                      </button>
                    ))}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#EF4444', fontSize: '13px', textAlign: isRTL ? 'right' : 'left', flexDirection: isRTL ? 'row-reverse' : 'row' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Icon icon="solar:logout-line-duotone" width={16} />{t('dash.signOut')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main ref={mainRef} style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: isMd ? '20px 14px' : '24px',
          paddingBottom: isMd ? '96px' : '24px',
        }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>

        {/* ── Bottom Nav (mobile only) ────────────────────────────────── */}
        {isMd && (
          <nav style={{
            display: 'flex',
            background: 'rgba(10,14,39,0.97)',
            borderTop: '1px solid rgba(245,200,66,0.1)',
            padding: '6px 0',
            flexShrink: 0,
            paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
          }}>
            {mobileNavItems.map(({ to, icon, label, end }) => (
              <NavLink key={to} to={to} end={end} style={{ flex: 1, textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 4px' }}>
                    <motion.div animate={{ scale: isActive ? 1.15 : 1 }} transition={{ duration: 0.15 }}>
                      <Icon icon={icon} width={22} color={isActive ? '#F5C842' : 'rgba(255,255,255,0.35)'} />
                    </motion.div>
                    <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? '#F5C842' : 'rgba(255,255,255,0.35)' }}>{label}</span>
                    {isActive && (
                      <motion.div layoutId="bottomNavDot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#F5C842', marginTop: '1px' }} />
                    )}
                  </div>
                )}
              </NavLink>
            ))}
            {/* Mobile lang toggle pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
              <LangToggle variant="minimal" />
            </div>
          </nav>
        )}
      </div>
    </div>
    </UsageProvider>
  );
};
