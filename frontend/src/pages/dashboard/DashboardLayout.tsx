import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { UsageProvider } from '../../contexts/UsageContext';
import { useUsage } from '../../hooks/useUsage';
import { WaynLogo } from '../../components/ui/WaynLogo';
import { Icon, LangSwitch } from '../../components/app/ui';
import '../../components/app/app.css';

const Meter: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => (
  <div className={`ap-meter${used >= limit ? ' full' : ''}`}>
    <span>{label}</span><span className="num">{used} / {limit}</span>
    <div className="t"><b style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }} /></div>
  </div>
);

const Frame: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { usage } = useUsage();
  const { t } = useLanguage();
  const main = useRef<HTMLElement>(null);

  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname]);

  const nav = [
    { to: '/dashboard', icon: 'today', label: t('ap.today'), end: true },
    { to: '/dashboard/addresses', icon: 'addr', label: t('ap.addresses') },
    { to: '/dashboard/routes', icon: 'route', label: t('ap.routes') },
  ] as const;
  const name = user?.fullName || user?.name || '';

  return (
    <div className="ap">
      <aside className="ap-side">
        <div className="logo"><WaynLogo size={20} /></div>
        <nav className="ap-nav">
          {nav.map(n => <NavLink key={n.to} to={n.to} end={'end' in n}><Icon name={n.icon} />{n.label}</NavLink>)}
        </nav>
        {usage && (
          <div className="ap-use">
            <h4>{t('ap.month')}</h4>
            <Meter label={t('ap.addresses')} used={usage.addressNormalizerCount} limit={usage.addressNormalizerLimit} />
            <Meter label={t('ap.routes')} used={usage.routeOptimizerCount} limit={usage.routeOptimizerLimit} />
          </div>
        )}
        <div className="grow" />
        <NavLink to="/dashboard/account" className="ap-me">
          <div className="ap-av">{(name || '?').charAt(0).toUpperCase()}</div>
          <div><b>{name}</b><span>{user?.companyName}</span></div>
        </NavLink>
        <LangSwitch />
      </aside>

      <main className="ap-main" ref={main}>
        <div className="wrap"><Outlet /></div>
      </main>

      <nav className="ap-bnav">
        {nav.map(n => <NavLink key={n.to} to={n.to} end={'end' in n}><Icon name={n.icon} />{n.label}</NavLink>)}
        <NavLink to="/dashboard/account"><Icon name="user" />{t('ap.account')}</NavLink>
      </nav>
    </div>
  );
};

export const DashboardLayout: React.FC = () => (
  <UsageProvider><Frame /></UsageProvider>
);
