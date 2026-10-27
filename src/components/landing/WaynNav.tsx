import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { WaynLogo } from '../ui/WaynLogo';

export const WaynNav: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <header className="wl-nav">
      <div className="wl-wrap">
        <Link to="/" aria-label="Wayn"><WaynLogo size={22} tone="light" /></Link>
        <nav className="wl-nav-links">
          <a href="#demo">{t('land.navCleanup')}</a>
          <a href="#route">{t('land.navRoutes')}</a>
          <a href="#drivers">{t('land.navDrivers')}</a>
        </nav>
        <div className="wl-nav-right">
          <button className="wl-lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
          {isAuthenticated ? (
            <Link className="wl-btn wl-btn-dark" to="/dashboard">{t('land.openDashboard')}</Link>
          ) : (
            <>
              <Link className="wl-btn wl-btn-ghost wl-nav-signin" to="/login">{t('land.signIn')}</Link>
              <Link className="wl-btn wl-btn-dark" to="/signup">{t('land.createAccount')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
