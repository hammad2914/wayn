import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './features.css';

// Results below are real engine output from 27 Oct 2026 (the same runs as the hero).
// The van split is optimize() on the hero's eight Riyadh stops, two vans with 35 kg limits.
const RESULTS = [
  { en: 'Al Nakheel Mall', ar: 'النخيل مول', prec: 'place', conf: 90 },
  { en: 'Al Olaya Street, building 7720', ar: 'شارع العليا، مبنى 7720', prec: 'street', conf: 88 },
  { en: 'Al Naseem District West, villa 14', ar: 'النسيم الغربي، فيلا 14', prec: 'district', conf: 78 },
] as const;

const VANS = [
  { id: 1, km: 95.7, min: 108, load: 30, stops: [['Al Naseem', 'النسيم', 15], ['Al Rawdah', 'الروضة', 4], ['Al Mughrizat', 'المغرزات', 5], ['Al Yasmin', 'الياسمين', 6]] },
  { id: 2, km: 79.4, min: 91, load: 32, stops: [['Al Malqa', 'الملقا', 12], ['Al Nakheel', 'النخيل', 8], ['Al Olaya', 'العليا', 9], ['Al Sulimaniyah', 'السليمانية', 3]] },
] as const;
const CAPACITY = 35;

export const Features: React.FC = () => {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const hm = (min: number) => (ar ? `${Math.floor(min / 60)} س ${min % 60} د` : `${Math.floor(min / 60)} h ${min % 60} min`);

  return (
    <section id="features" className="wf">
      <div className="wf-wrap">
        <header className="wf-head">
          <p className="wf-label">{t('wf.label')}</p>
          <h2>{t('wf.h2')}</h2>
        </header>

        {/* 1 · nothing in the message is thrown away */}
        <div className="wf-row">
          <div className="wf-text">
            <p className="wf-num">01</p>
            <h3>{t('wf.f1T')}</h3>
            <p>{t('wf.f1')}</p>
          </div>
          <div className="wf-vis">
            <p className="wf-msg" dir="rtl">
              <mark className="n">ورا مسجد الراجحي</mark><span>، </span>
              <mark>حي النسيم الغربي</mark><span>، </span>
              <mark>فيلا رقم ١٤</mark> <mark className="n">البوابة السودا</mark><span>، </span>
              <mark>الرياض</mark>
            </p>
            <ul className="wf-map">
              <li><span className="from" dir="rtl">ورا مسجد الراجحي</span><span className="arrow">→</span><span className="to n"><small>{t('wf.toNote')}</small><b dir="rtl">ورا مسجد الراجحي</b></span></li>
              <li><span className="from" dir="rtl">حي النسيم الغربي</span><span className="arrow">→</span><span className="to"><small>{t('wf.toDistrict')}</small><b>{ar ? 'النسيم الغربي' : 'Al Naseem District West'}</b></span></li>
              <li><span className="from" dir="rtl">فيلا رقم ١٤ البوابة السودا</span><span className="arrow">→</span><span className="to"><small>{t('wf.toBuilding')}</small><b>14</b></span></li>
              <li><span className="from" dir="rtl">الرياض</span><span className="arrow">→</span><span className="to"><small>{t('wf.toCity')}</small><b>{ar ? 'الرياض' : 'Riyadh'}</b></span></li>
              <li><span className="from">{t('wf.notTyped')}</span><span className="arrow">→</span><span className="to added"><small>{t('wf.toPostal')}</small><b>14231</b></span></li>
            </ul>
            <div className="wf-key"><span><i />{t('wf.keyField')}</span><span><i className="n" />{t('wf.keyNote')}</span></div>
          </div>
        </div>

        {/* 2 · precision is shown, not hidden */}
        <div className="wf-row flip">
          <div className="wf-text">
            <p className="wf-num">02</p>
            <h3>{t('wf.f2T')}</h3>
            <p>{t('wf.f2')}</p>
          </div>
          <div className="wf-vis">
            <ul className="wf-res">
              {RESULTS.map(r => (
                <li key={r.en} className={r.prec === 'district' ? 'check' : ''}>
                  <div className="top"><b>{ar ? r.ar : r.en}</b><em>{r.conf}%</em></div>
                  <div className="sub">
                    <span>{t(r.prec === 'place' ? 'wf.precPlace' : r.prec === 'street' ? 'wf.precStreet' : 'wf.precDistrict')}</span>
                    {r.prec === 'district' && <span className="wf-flag">{t('wf.checkFirst')}</span>}
                  </div>
                  <div className="bar"><i style={{ width: `${r.conf}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3 · one run, shared between vans by load */}
        <div className="wf-row">
          <div className="wf-text">
            <p className="wf-num">03</p>
            <h3>{t('wf.f3T')}</h3>
            <p>{t('wf.f3')}</p>
          </div>
          <div>
            <div className="wf-vis wf-vans">
              {VANS.map(v => (
                <div className="wf-van" key={v.id}>
                  <div className="vh"><b>{t('wf.van')} {v.id}</b><span><span dir="ltr">{v.km} km</span> · <span dir={ar ? 'rtl' : 'ltr'}>{hm(v.min)}</span></span></div>
                  <div className="wf-load"><span>{t('wf.load')}</span><b dir="ltr">{v.load} / {CAPACITY} kg</b></div>
                  <div className="bar"><i style={{ width: `${(v.load / CAPACITY) * 100}%` }} /></div>
                  <ol>
                    {v.stops.map(([en, arName, kg], i) => (
                      <li key={en}><span className="n">{i + 1}</span><span>{ar ? arName : en}</span><span className="kg" dir="ltr">{kg} kg</span></li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="wf-cap">{t('wf.vansCap')}</p>
          </div>
        </div>

        <div className="wf-facts">
          <p><b>{t('wf.x1T')}</b>{t('wf.x1')}</p>
          <p><b>{t('wf.x2T')}</b>{t('wf.x2')}</p>
          <p><b>{t('wf.x3T')}</b>{t('wf.x3')}</p>
        </div>
      </div>
    </section>
  );
};
