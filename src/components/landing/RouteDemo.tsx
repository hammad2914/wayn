import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEPOT, STOPS, planOrder, tourKm } from './samples';

const BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

const numIcon = (label: string, depot = false) =>
  L.divIcon({ className: '', html: `<div class="wl-num${depot ? ' wl-num-depot' : ''}">${label}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });

const bounds = L.latLngBounds([DEPOT, ...STOPS].map(p => [p.lat, p.lng] as [number, number])).pad(0.12);

export const RouteDemo: React.FC = () => {
  const { t, lang } = useLanguage();
  const [planned, setPlanned] = useState(false);

  const plannedOrder = useMemo(() => planOrder(DEPOT, STOPS), []);
  const order = planned ? plannedOrder : STOPS;
  const kmGiven = tourKm([DEPOT, ...STOPS, DEPOT]);
  const kmNow = tourKm([DEPOT, ...order, DEPOT]);
  const line = [DEPOT, ...order, DEPOT].map(p => [p.lat, p.lng] as [number, number]);

  return (
    <section className="wl-route" id="route">
      <div className="wl-wrap">
        <div className="wl-route-copy">
          <h2>{t('land.routeH')}</h2>
          <p>{t('land.routeP')}</p>
          <div className="wl-toggle">
            <button aria-pressed={!planned} onClick={() => setPlanned(false)}>{t('land.routeIn')}</button>
            <button aria-pressed={planned} onClick={() => setPlanned(true)}>{t('land.routeOpt')}</button>
          </div>
          <div className="wl-km">
            <div><b>{kmNow.toFixed(1)}</b>{t('land.routeKm')}</div>
            <div className="wl-save"><b>{planned ? `${(kmGiven - kmNow).toFixed(1)}` : '—'}</b>{planned ? `km ${t('land.routeSaved')}` : t('land.routeSaved')}</div>
          </div>
          <ol className="wl-stops">
            {order.map((s, i) => (
              <li key={s.id}><span>{i + 1}. {lang === 'ar' ? s.nameAr : s.name}</span><span>{s.kg} {t('land.kg')}</span></li>
            ))}
          </ol>
        </div>
        <div>
          <div className="wl-route-map">
            <MapContainer bounds={bounds} scrollWheelZoom={false} attributionControl={false}>
              <TileLayer url={BASE} maxNativeZoom={16} maxZoom={19} />
              <TileLayer url={LABELS} maxNativeZoom={16} maxZoom={19} />
              <Polyline
                key={planned ? 'planned' : 'given'}
                positions={line}
                pathOptions={{ color: planned ? '#0B7A5C' : '#C77D12', weight: 3.5, opacity: 0.9, dashArray: planned ? undefined : '6 8' }}
              />
              <Marker position={[DEPOT.lat, DEPOT.lng]} icon={numIcon(lang === 'ar' ? 'م' : 'D', true)} />
              {order.map((s, i) => <Marker key={s.id} position={[s.lat, s.lng]} icon={numIcon(String(i + 1))} />)}
            </MapContainer>
          </div>
          <p className="wl-fine">{t('land.routeFine')}</p>
        </div>
      </div>
    </section>
  );
};
