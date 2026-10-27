import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { WaynNav } from '../components/landing/WaynNav';
import { AddressDemo } from '../components/landing/AddressDemo';
import { RouteDemo } from '../components/landing/RouteDemo';
import '../components/landing/landing.css';

export const LandingPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { isAuthenticated } = useAuth();
  const start = isAuthenticated ? '/dashboard/address-normalizer' : '/signup';

  return (
    <div className="wl" dir={isRTL ? 'rtl' : 'ltr'}>
      <WaynNav />

      <section className="wl-hero">
        <div className="wl-wrap">
          <div>
            <h1>{t('land.h1')}</h1>
            <p className="wl-lead">{t('land.lead')}</p>
            <div className="wl-hero-cta">
              <Link className="wl-btn wl-btn-dark" to={start}>{t('land.ctaTry')}</Link>
              <a className="wl-btn wl-btn-ghost" href="#route">{t('land.ctaRoutes')}</a>
            </div>
            <p className="wl-hero-note">{t('land.note')}</p>
          </div>
          <AddressDemo />
        </div>
      </section>

      <RouteDemo />

      <section className="wl-drivers" id="drivers">
        <div className="wl-wrap">
          {/* the driver's screen stays in Arabic: that's who reads it */}
          <div className="wl-phone" aria-hidden="true">
            <div className="wl-screen" dir="rtl">
              <div className="wl-screen-top"><small>المحطة ٣ من ٨</small><h4>العليا، شارع العليا</h4></div>
              <div className="wl-screen-row"><span>المبنى</span><span>٧٧٢٠</span></div>
              <div className="wl-screen-row"><span>الحي</span><span>العليا</span></div>
              <div className="wl-screen-row"><span>الرمز البريدي</span><span>١٢٢٤٤</span></div>
              <div className="wl-screen-row"><span>الوزن</span><span>٩ كغ</span></div>
              <div className="wl-screen-row"><span>ملاحظة العميل</span><span>مكتب، الدور الثالث</span></div>
              <div className="wl-screen-go">ابدأ الملاحة</div>
            </div>
          </div>
          <div>
            <h2>{t('land.driverH')}</h2>
            <div className="wl-points">
              <p><b>{t('land.d1T')}</b> {t('land.d1')}</p>
              <p><b>{t('land.d2T')}</b> {t('land.d2')}</p>
              <p><b>{t('land.d3T')}</b> {t('land.d3')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wl-close">
        <div className="wl-wrap">
          <div className="wl-close-box">
            <div>
              <h2>{t('land.closeH')}</h2>
              <p>{t('land.closeP')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {isAuthenticated ? (
                <Link className="wl-btn wl-btn-light" to="/dashboard">{t('land.openDashboard')}</Link>
              ) : (
                <>
                  <Link className="wl-btn wl-btn-light" to="/signup">{t('land.createAccount')}</Link>
                  <Link className="wl-btn wl-btn-ghost" to="/login">{t('land.signIn')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="wl-footer">
        <div className="wl-wrap">
          <span>{t('land.copyright')}</span>
          <a href="#demo">{t('land.navCleanup')}</a>
          <a href="#route">{t('land.navRoutes')}</a>
          <Link to="/login">{t('land.signIn')}</Link>
        </div>
      </footer>
    </div>
  );
};
