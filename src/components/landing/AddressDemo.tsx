import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import { SAMPLES, type Precision } from './samples';

// satellite here on purpose: the point is seeing the pin land on real streets and roofs
const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// zoom in only as far as the match deserves: a district pin is not a door
const ZOOM: Record<Precision, number> = { district: 14, street: 16, place: 17 };
const PRECISION_KEY = { district: 'land.matchDistrict', street: 'land.matchStreet', place: 'land.matchPlace' } as const;

const pin = L.divIcon({ className: '', html: '<div class="wl-pin"></div>', iconSize: [20, 20], iconAnchor: [10, 20] });

const FlyTo: React.FC<{ lat: number; lng: number; zoom: number; active: boolean }> = ({ lat, lng, zoom, active }) => {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!active) return;
    // the first sample is already "cleaned" on load: show it without a fly-in
    if (first.current) { first.current = false; map.setView([lat, lng], zoom); return; }
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [map, lat, lng, zoom, active]);
  return null;
};

export const AddressDemo: React.FC = () => {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [cleaned, setCleaned] = useState(true);
  const s = SAMPLES[index];
  const f = lang === 'ar' ? s.ar : s.en;
  const unsure = s.confidence < 0.8;

  const pick = (i: number) => { setIndex(i); setCleaned(false); };

  const rows: [string, string | null][] = [
    [t('land.fPlace'), f.place],
    [t('land.fBuilding'), f.building],
    [t('land.fStreet'), f.street],
    [t('land.fDistrict'), f.district],
    [t('land.fCity'), f.city],
    [t('land.fPostal'), f.postal],
  ];

  return (
    <div className="wl-demo" id="demo" style={{ scrollMarginTop: 90 }}>
      <div className="wl-demo-top">
        <div className="wl-demo-label">
          <span>{t('land.demoTyped')}</span>
          <div className="wl-samples">
            {SAMPLES.map((x, i) => (
              <button key={x.labelKey} aria-pressed={i === index} onClick={() => pick(i)}>{t(x.labelKey)}</button>
            ))}
          </div>
        </div>
        <div className="wl-raw">
          <div className="wl-raw-text" dir={s.rtl ? 'rtl' : 'ltr'}>{s.raw}</div>
          <button className="wl-btn wl-btn-dark" style={{ height: 'auto' }} onClick={() => setCleaned(true)}>{t('land.demoClean')}</button>
        </div>
      </div>

      <div className={`wl-demo-body${cleaned ? '' : ' wl-pending'}`}>
        <div className="wl-fields">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div className="wl-field" key={k}><span>{k}</span><span>{v}</span></div>
          ))}
          <div className="wl-field">
            <span>{t('land.fNotes')}</span>
            <span className="wl-notes">{s.notes.map(n => <i key={n} dir="auto">{n}</i>)}</span>
          </div>
          <div className="wl-conf">
            {t('land.confidence')} {Math.round(s.confidence * 100)}%{unsure && cleaned ? ` · ${t('land.checkFirst')}` : ''}
            <div className="wl-bar">
              <i style={{ width: cleaned ? `${s.confidence * 100}%` : 0, background: unsure ? 'var(--amber)' : 'var(--green)' }} />
            </div>
          </div>
        </div>

        <div className="wl-demo-map">
          <MapContainer center={[24.72, 46.72]} zoom={11} zoomControl={false} attributionControl={false} scrollWheelZoom={false}>
            <TileLayer url={SATELLITE} maxNativeZoom={18} maxZoom={19} />
            {cleaned && <Marker position={[s.lat, s.lng]} icon={pin} />}
            <FlyTo lat={s.lat} lng={s.lng} zoom={ZOOM[s.precision]} active={cleaned} />
          </MapContainer>
          {cleaned && <span className="wl-precision">{t(PRECISION_KEY[s.precision])}</span>}
        </div>
      </div>
      <p className="wl-source">{t('land.demoSource')}</p>
    </div>
  );
};
