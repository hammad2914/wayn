import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Order, Van, Depot } from '../../services/dispatch';
import { TILES, esc, vanColor } from './shared';

const TRUCK = '<svg viewBox="0 0 24 24" fill="#0A0E27"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';
const icon = (html: string, size: number) => L.divIcon({ className: '', html, iconSize: [size, size] });

interface Props { orders: Order[]; vans: Van[]; depot: Depot | null; focus: number | null }

/**
 * The day on the map: each van's road line with its stops (ticked once delivered) and the van
 * itself at its last delivered stop; orders not on a van yet show as small pins by how sure the match is.
 */
export const LiveMap: React.FC<Props> = ({ orders, vans, depot, focus }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef('');
  const bounds = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, zoomSnap: 0.25 });
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }).addTo(m);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19, opacity: 0.5 }).addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    m.setView([24.71, 46.68], 10);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // the panel can appear before it has a size (page fade-in, sidebar toggle): fit again once it does
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      if (bounds.current) m.fitBounds(bounds.current, { padding: [30, 30], maxZoom: 14 });
    });
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const points: L.LatLngExpression[] = [];

    vans.forEach(v => {
      const dim = focus !== null && focus !== v.index;
      const color = vanColor(v.index);
      L.polyline(v.line, { color, weight: 4, opacity: dim ? 0.2 : 0.9 }).addTo(g);
      points.push(...v.line);
      const stops = orders.filter(o => o.vanId === v.id).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      stops.forEach(o => {
        if (o.lat == null || o.lng == null) return;
        const done = !!o.deliveredAt;
        L.marker([o.lat, o.lng], { icon: icon(
          `<span class="dp-st" style="background:${done ? color : '#0A0E27'};color:${done ? '#0A0E27' : color};border-color:${color};opacity:${dim ? 0.3 : 1}">${done ? '✓' : o.seq}</span>`, 20) })
          .bindTooltip(`${o.seq}. ${esc(o.customer)}`, { direction: 'top' }).addTo(g);
      });
      // no GPS: the van is drawn where its driver last ticked a stop, or at the depot
      const last = stops.filter(o => o.deliveredAt).sort((a, b) => a.deliveredAt!.localeCompare(b.deliveredAt!)).pop();
      const at: L.LatLngExpression | null = last?.lat != null ? [last.lat, last.lng!] : depot ? [depot.lat, depot.lng] : null;
      if (at) L.marker(at, { zIndexOffset: 1000, icon: icon(`<div class="dp-truck" style="background:${color};opacity:${dim ? 0.4 : 1}">${TRUCK}</div>`, 30) }).addTo(g);
    });

    orders.filter(o => !o.vanId && o.lat != null && o.state !== 'pin' && o.state !== 'cleaning').forEach(o => {
      L.marker([o.lat!, o.lng!], { icon: icon(`<div class="dp-pin" style="background:${o.state === 'check' ? '#F0A54A' : '#6FD3A0'}"></div>`, 12) })
        .bindTooltip(esc(o.customer), { direction: 'top' }).addTo(g);
      points.push([o.lat!, o.lng!]);
    });
    if (depot) {
      L.marker([depot.lat, depot.lng], { icon: icon('<div class="dp-depot"></div>', 16) }).bindTooltip(esc(depot.address), { direction: 'top' }).addTo(g);
      points.push([depot.lat, depot.lng]);
    }

    // fit once per new set of places, so a refresh doesn't undo the dispatcher's zoom
    const key = `${vans.map(v => v.id).join()}|${points.length}`;
    if (points.length && key !== fitted.current) {
      fitted.current = key;
      bounds.current = L.latLngBounds(points);
      m.fitBounds(bounds.current, { padding: [30, 30], maxZoom: 14 });
    }
  }, [orders, vans, depot, focus]);

  return <div className="dp-map" ref={el} />;
};
