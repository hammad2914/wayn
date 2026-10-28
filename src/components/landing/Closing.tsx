import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { WaynLogo } from '../ui/WaynLogo';
import { VANS } from './howRun';
import './closing.css';

// The last screen: one line, the way in, and the real run's two roads drawn faintly beside it.
const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#F5C842', '#8FB4FF'];

export const Closing: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
  const end = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current!, W = 1400, H = 640;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const all = VANS.flatMap(v => v.line), kx = Math.cos(24.72 * Math.PI / 180);
    const xs = all.map(p => p[1] * kx), ys = all.map(p => -p[0]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // the roads keep to the far side of the headline (the left in Arabic)
    const s = Math.min((H - 80) / (y1 - y0), (W * 0.42) / (x1 - x0)), w = (x1 - x0) * s;
    const ox = lang === 'ar' ? 80 : W - w - 80, oy = (H - (y1 - y0) * s) / 2;
    const paths = VANS.map((v, vi) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + v.line.map(([a, b]) => `${(ox + (b * kx - x0) * s).toFixed(1)},${(oy + (-a - y0) * s).toFixed(1)}`).join('L'));
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', COLORS[vi]); p.setAttribute('stroke-width', '2.5');
      p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('opacity', '0.6');
      svg.append(p);
      return p;
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    paths.forEach(p => { const len = p.getTotalLength(); p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });
    // drawn slowly, once, when the section comes on screen
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect();
      paths.forEach((p, vi) => {
        const len = p.getTotalLength();
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 4000, delay: vi * 600, easing: 'ease-in-out', fill: 'forwards' });
      });
    }, { threshold: 0.3 });
    io.observe(end.current!);
    return () => io.disconnect();
  }, [lang]);

  return (
    <div className="wz">
      <section className="wz-end" ref={end}>
        <svg ref={svgRef} aria-hidden="true" preserveAspectRatio="xMidYMid slice" />
        <div className="wz-end-in">
          <h2>{t('wz.h2')}</h2>
          <p>{t('wz.lead')}</p>
          <div className="wz-btns">
            <Link className="wz-go" to="/signup">{t('wz.go')}</Link>
            <Link className="wz-in" to="/login">{t('wz.signIn')}</Link>
          </div>
          <p className="wz-free">{t('wz.free')}</p>
        </div>
        <div className="wz-key">
          {VANS.map((v, vi) => (
            <span key={vi}><i style={{ background: COLORS[vi] }} />{t('wz.van')} {vi + 1} · <span dir="ltr">{v.km.toFixed(1)} km</span></span>
          ))}
        </div>
      </section>

      <footer className="wz-foot">
        <div className="wz-cols">
          <div>
            <WaynLogo size={20} />
            <p>{t('wz.tag')}</p>
          </div>
          <nav aria-label={t('wz.cProduct')}>
            <h3>{t('wz.cProduct')}</h3>
            <ul>
              <li><a href="#how-it-works">{t('wz.lHow')}</a></li>
              <li><a href="#features">{t('wz.lWhat')}</a></li>
              <li><a href="#try">{t('wz.lTry')}</a></li>
              <li><a href="#cities">{t('wz.lCities')}</a></li>
              <li><a href="#faq">{t('wz.lFaq')}</a></li>
            </ul>
          </nav>
          <nav aria-label={t('wz.cAccount')}>
            <h3>{t('wz.cAccount')}</h3>
            <ul>
              <li><Link to="/login">{t('wz.signIn')}</Link></li>
              <li><Link to="/signup">{t('wz.lCreate')}</Link></li>
            </ul>
          </nav>
          <div>
            <h3>{t('wz.cData')}</h3>
            <ul className="wz-credit">
              <li>{t('wz.d1')}</li><li>{t('wz.d2')}</li><li>{t('wz.d3')}</li>
            </ul>
          </div>
        </div>
        <div className="wz-base">
          <span>{t('wz.copy')}</span>
          <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'English' : 'العربية'}</button>
        </div>
      </footer>
    </div>
  );
};
