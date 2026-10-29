import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../contexts/LanguageContext';
import { WaynLogo } from '../ui/WaynLogo';
import { vanColor } from '../dispatch/shared';
import { baseMap } from './shared';
import { LangSwitch } from './ui';
import './app.css';

interface Run { depot: { lat: number; lng: number }; vans: { km: number; line: [number, number][]; stops: { lat: number; lng: number }[] }[] }

/** A real two-van run the engine planned in Riyadh, drawn quietly behind the sign-in forms */
const RunMap: React.FC = () => {
  const { t, lang } = useLanguage();
  const el = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    fetch('/data/sample-run.json').then(r => r.json()).then(setRun).catch(() => {});
  }, []);

  useEffect(() => {
    if (!run) return;
    const m = baseMap(el.current!, { dragging: false, doubleClickZoom: false, touchZoom: false, keyboard: false, boxZoom: false });
    const pts: [number, number][] = [];
    run.vans.forEach((v, i) => {
      L.polyline(v.line, { color: vanColor(i), weight: 4, opacity: 0.9 }).addTo(m);
      pts.push(...v.line);
      v.stops.forEach(s => L.circleMarker([s.lat, s.lng], { radius: 5, color: '#0A0E27', weight: 2, fillColor: vanColor(i), fillOpacity: 1 }).addTo(m));
    });
    L.marker([run.depot.lat, run.depot.lng], { icon: L.divIcon({ className: '', html: '<div class="ap-dep"></div>', iconSize: [16, 16] }) }).addTo(m);
    const fit = () => m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 160] });
    fit();
    const ro = new ResizeObserver(() => { m.invalidateSize(); fit(); });
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); };
  }, [run]);

  return (
    <div className="r">
      <div className="smap" ref={el} />
      {run && (
        <div className="cap">
          <b>{t('ap.s.capT')}</b>{t('ap.s.capP')}
          <div className="vv">
            {run.vans.map((v, i) => (
              <span key={i}><i style={{ background: vanColor(i) }} />{lang === 'ar' ? `سيارة ${i + 1}` : `Van ${i + 1}`} · <span className="num">{v.km} km</span></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ap-auth">
    <div className="l">
      <header>
        <Link to="/" aria-label="Wayn" style={{ display: 'flex' }}><WaynLogo size={20} /></Link>
        <LangSwitch />
      </header>
      {children}
      <div className="foot">© 2026 Wayn</div>
    </div>
    <RunMap />
  </div>
);

/** A password box with a show/hide toggle */
export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = props => {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  return (
    <div className="ap-pw">
      <input {...props} className="ap-in" type={show ? 'text' : 'password'} dir="ltr" />
      <button type="button" onClick={() => setShow(s => !s)}>{show ? t('ap.s.hide') : t('ap.s.show')}</button>
    </div>
  );
};
