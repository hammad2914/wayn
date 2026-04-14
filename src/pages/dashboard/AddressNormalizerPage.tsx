import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { normalizeAddress } from '../../services/api';
import { useUsage } from '../../hooks/useUsage';
import { CountryDropdown } from '../../components/ui/CountryDropdown';
import { GoldButton } from '../../components/ui/GoldButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { Tooltip } from '../../components/ui/Tooltip';
import type { NormalizeRequest, NormalizeResponse } from '../../types';
import 'leaflet/dist/leaflet.css';
import TabTour, { useTabTour } from '../../components/ui/walktour/Walktour';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  address:           string;
  country:           string;
  use_ai:            boolean;
  include_geocoding: boolean;
  use_cache:         boolean;
}

type MapStyle = 'street' | 'satellite' | 'dark';

const MAP_STYLES: Record<MapStyle, { labelKey: 'addr.street' | 'addr.satellite' | 'addr.dark'; icon: string; url: string; attribution: string }> = {
  street: {
    labelKey: 'addr.street', icon: 'solar:map-bold-duotone',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    labelKey: 'addr.satellite', icon: 'solar:planet-bold-duotone',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar',
  },
  dark: {
    labelKey: 'addr.dark', icon: 'solar:moon-stars-bold-duotone',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
};

// ── Shared style constants ────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(12,17,45,0.88)', backdropFilter: 'blur(20px)',
  border: '1px solid rgba(245,200,66,0.18)', borderRadius: '16px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
  padding: '13px 16px', fontSize: '14px', color: '#FFFFFF',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', fontFamily: "'Inter', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'rgba(255,255,255,0.7)', marginBottom: '6px',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700,
  color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #F5C842', paddingLeft: '10px',
};

// ── Sub-components ────────────────────────────────────────────────────────────



const CopyField: React.FC<{ label: string; value: string; dir?: 'ltr' | 'rtl' | 'auto' }> = ({ label, value, dir = 'ltr' }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 5px' }}>{label}</p>
      <div style={{ position: 'relative' }}>
        <div dir={dir} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '10px 36px 10px 12px',
          fontSize: '13px', color: value ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
          minHeight: '40px', lineHeight: 1.5, wordBreak: 'break-word',
        }}>
          {value || '—'}
        </div>
        {value && (
          <button onClick={doCopy}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10B981' : 'rgba(255,255,255,0.3)', padding: 0, transition: 'color 0.2s' }}
            title="Copy">
            <Icon icon={copied ? 'solar:check-bold' : 'solar:copy-bold'} width={15} />
          </button>
        )}
      </div>
    </div>
  );
};

const Pill: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = 'rgba(245,200,66,0.15)', style }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: color, fontSize: '11px', fontWeight: 600, color: '#F5C842', whiteSpace: 'nowrap', ...style }}>
    {children}
  </span>
);

const MapRecenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 16); }, [lat, lng, map]);
  return null;
};

// ── Example address pool ──────────────────────────────────────────────────────
const EXAMPLE_ADDRESSES: { address: string; country: string }[] = [
  { address: 'حي النزهة، شارع الملك فهد، الرياض، المملكة العربية السعودية',    country: 'SA' },
  { address: 'شارع الشيخ زايد، قرب برج خليفة، دبي، الإمارات العربية المتحدة', country: 'AE' },
  { address: 'حي المعادي، شارع النصر، القاهرة، مصر',                            country: 'EG' },
  { address: 'شارع الحمرا، بيروت، لبنان',                                        country: 'LB' },
  { address: 'حي السليمانية، شارع العروبة، جدة، المملكة العربية السعودية',      country: 'SA' },
  { address: 'منطقة الرميلة، الدوحة، قطر',                                       country: 'QA' },
  { address: 'حي الزمالك، شارع 26 يوليو، القاهرة، مصر',                         country: 'EG' },
  { address: 'شارع المطار، بوشر، مسقط، عُمان',                                  country: 'OM' },
  { address: 'حي الديرة، بر دبي، دبي، الإمارات',                                country: 'AE' },
  { address: 'المنامة، شارع الملك فيصل، البحرين',                               country: 'BH' },
  { address: 'حي العليا، طريق الملك عبدالعزيز، الرياض',                         country: 'SA' },
  { address: 'مدينة الكويت، منطقة الشرق، شارع الغلف، الكويت',                  country: 'KW' },
];

const pickRandomExample = () => EXAMPLE_ADDRESSES[Math.floor(Math.random() * EXAMPLE_ADDRESSES.length)];

// ── Main Page ─────────────────────────────────────────────────────────────────

type ResultTab = 'details' | 'map';

export const AddressNormalizerPage: React.FC = () => {
  const { increment, canUseNormalizer, usage } = useUsage();
  const { t, isRTL } = useLanguage();
  const [result,     setResult]     = useState<NormalizeResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [mapStyle,   setMapStyle]   = useState<MapStyle>('dark');
  const [resultTab,  setResultTab]  = useState<ResultTab>('details');

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { address: '', country: 'SA', use_ai: true, include_geocoding: true, use_cache: false },
  });

  const TOUR_KEY = 'addr_normalizer_tour_seen';
  const tourFirstResult = useRef(true);
  const addrTour = useTabTour(TOUR_KEY);

  useEffect(() => {
    if (result && !loading && tourFirstResult.current) {
      tourFirstResult.current = false;
      if (!addrTour.hasSeenTour()) {
        setTimeout(() => addrTour.startTour(), 500);
      }
    }
    if (!result) tourFirstResult.current = true;
  }, [result, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const components      = result?.components;

  const normCount = usage?.addressNormalizerCount ?? 0;
  const normLimit = usage?.addressNormalizerLimit ?? 10;
  const normPct   = normLimit > 0 ? (normCount / normLimit) * 100 : 0;
  const barColor  = normPct >= 100 ? '#EF4444' : normPct >= 80 ? '#F59E0B' : '#10B981';

  const onSubmit = async (data: FormValues) => {
    if (!canUseNormalizer) { setError(t('addr.limitReached')); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      await increment('address_normalizer', data.address.slice(0, 120));
      const payload: NormalizeRequest = { address: data.address, country: data.country, use_ai: data.use_ai, include_geocoding: data.include_geocoding, use_cache: data.use_cache };
      const res = await normalizeAddress(payload);
      if (!res.success) { setError(res.error || t('addr.normFailed')); }
      else { setResult(res); setResultTab('details'); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('addr.networkError'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', alignItems: 'start' }}>

      {/* ── LEFT: Input Form ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 2 }}>

        {/* Usage badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '18px', color: '#FFFFFF', margin: '0 0 2px' }}>{t('addr.title')}</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{t('addr.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: barColor, fontWeight: 700 }}>{normCount} / {normLimit} {t('addr.used')}</span>
            <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(normPct, 100)}%`, background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{ ...card, padding: '24px' }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Address textarea */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{t('addr.address')}</label>
                <button
                  type="button"
                  onClick={() => {
                    const ex = pickRandomExample();
                    setValue('address', ex.address, { shouldDirty: true });
                    setValue('country', ex.country, { shouldDirty: true });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.06))',
                    border: '1px solid rgba(245,200,66,0.35)',
                    borderRadius: '8px', padding: '5px 11px',
                    cursor: 'pointer', color: '#F5C842',
                    fontSize: '12px', fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,200,66,0.25), rgba(245,200,66,0.12))';
                    e.currentTarget.style.borderColor = 'rgba(245,200,66,0.6)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.06))';
                    e.currentTarget.style.borderColor = 'rgba(245,200,66,0.35)';
                  }}
                >
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={13} />
                  Use AI Example
                </button>
              </div>
              <textarea
                dir="auto" rows={4}
                placeholder={"حي النزهة، شارع الملك فهد، الرياض\nor: King Fahd Road, Al Nuzha, Riyadh"}
                style={{
                  ...inputStyle, height: 'auto', resize: 'none', lineHeight: 1.6,
                  borderColor: errors.address ? '#EF4444' : undefined,
                }}
                onFocus={e  => (e.target.style.borderColor = '#F5C842')}
                {...register('address', { required: t('addr.pleaseEnter') })}
                onBlur={e   => (e.target.style.borderColor = errors.address ? '#EF4444' : 'rgba(255,255,255,0.12)')}
              />
              {errors.address && <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{errors.address.message}</p>}
            </div>

            {/* Country */}
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <CountryDropdown value={field.value} onChange={field.onChange} />
              )}
            />

            {/* Toggles */}
            {/* <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Controller name="use_ai" control={control} render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={t('addr.aiEnhancement')} description={t('addr.aiEnhancementDesc')} />
              )} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <Controller name="include_geocoding" control={control} render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={t('addr.includeGeocoding')} description={t('addr.includeGeocodingDesc')} />
              )} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <Controller name="use_cache" control={control} render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={t('addr.useCache')} description={t('addr.useCacheDesc')} />
              )} />
            </div> */}

            <GoldButton type="submit" loading={loading} fullWidth size="lg" disabled={!canUseNormalizer}>
              {loading ? t('addr.normalizing') : t('addr.normalizeBtn')}
              {!loading && <Icon icon="solar:map-point-bold-duotone" width={17} />}
            </GoldButton>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>{t('addr.poweredBy')}</p>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Results ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Icon icon="solar:danger-circle-bold-duotone" width={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{error}</p>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                <Icon icon="solar:close-bold" width={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...card, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(245,200,66,0.06)', animation: 'pulse 1.5s ease infinite', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[80, 100, 60].map(w => <div key={w} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />)}
              </div>
            </div>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />)}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon icon="solar:map-point-bold-duotone" width={32} color="rgba(245,200,66,0.4)" />
            </div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>{t('addr.readyTitle')}</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.6 }}>
              {t('addr.readyDesc')}
            </p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              style={{ ...card, overflow: 'hidden' }}>

              {/* ── Tab bar ── */}
              <div style={{ display: 'flex', gap: '4px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {([
                  { key: 'details', icon: 'solar:document-text-bold-duotone', labelKey: 'addr.details' },
                  { key: 'map',     icon: 'solar:map-point-wave-bold-duotone', labelKey: 'addr.mapTab',
                    disabled: !result.geocoding },
                ] as { key: ResultTab; icon: string; labelKey: 'addr.details' | 'addr.mapTab'; disabled?: boolean }[]).map(tab => (
                  <button key={tab.key} id={`tour-addr-${tab.key}`} onClick={() => !tab.disabled && setResultTab(tab.key)}
                    disabled={tab.disabled}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                      background: resultTab === tab.key ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${resultTab === tab.key ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '10px', cursor: tab.disabled ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 600, opacity: tab.disabled ? 0.35 : 1,
                      color: resultTab === tab.key ? '#F5C842' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
                    }}>
                    <Icon icon={tab.icon} width={15} />
                    {t(tab.labelKey)}
                  </button>
                ))}

                {/* Accuracy badge on right */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {result.from_cache && (
                    <Tooltip text="Cached — result was retrieved from cache for instant response">
                      <Pill color="rgba(139,92,246,0.15)" style={{ color: '#A78BFA' } as React.CSSProperties}><Icon icon="solar:database-bold-duotone" width={12} />{t('addr.cached')}</Pill>
                    </Tooltip>
                  )}
                  <Tooltip text="Accuracy Confidence — how certain the system is about this result">
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.07) 100%)',
                      border: '1px solid rgba(16,185,129,0.35)',
                      borderRadius: '10px', padding: '5px 10px 5px 7px',
                      cursor: 'default', boxShadow: '0 0 14px rgba(16,185,129,0.08)',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)',
                        border: '1.5px solid rgba(16,185,129,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon icon="solar:target-bold-duotone" width={13} color="#10B981" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(16,185,129,0.65)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Accuracy Confidence</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', letterSpacing: '-0.01em' }}>{Math.round(result.confidence_score * 100)}%</span>
                      </div>
                    </div>
                  </Tooltip>
                </div>
              </div>

              {/* ── Tab content ── */}
              <AnimatePresence mode="wait">
                <motion.div key={resultTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  style={{ padding: '20px' }}>

                  {resultTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Addresses */}
                      <div>
                        <p style={{ ...sectionTitle, marginBottom: '10px' }}>{t('addr.normalizedAddresses')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <CopyField label={t('addr.arabic')}   value={result.normalized_address} dir="rtl" />
                          <CopyField label={t('addr.english')}  value={result.normalized_english} />
                        </div>
                      </div>

                      {/* Components */}
                      <div>
                        <p style={{ ...sectionTitle, marginBottom: '10px' }}>{t('addr.components')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <CopyField label={t('addr.streetEn')}   value={components?.street_name      || ''} />
                          <CopyField label={t('addr.streetAr')}   value={components?.street_name_ar   || ''} dir="rtl" />
                          <CopyField label={t('addr.areaEn')}     value={components?.area             || ''} />
                          <CopyField label={t('addr.areaAr')}     value={components?.area_ar          || ''} dir="rtl" />
                          <CopyField label={t('addr.cityEn')}     value={components?.city             || ''} />
                          <CopyField label={t('addr.cityAr')}     value={components?.city_ar          || ''} dir="rtl" />
                          <CopyField label={t('addr.buildingNo')} value={components?.building_number  || ''} />
                          <CopyField label={t('addr.postalCode')} value={components?.postal_code      || ''} />
                        </div>
                      </div>

                      {/* Landmarks */}
                      {components?.landmarks && components.landmarks.length > 0 && (
                        <div>
                          <p style={{ ...sectionTitle, marginBottom: '8px' }}>{t('addr.landmarks')}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {components.landmarks.map((lm, i) => (
                              <span key={i} style={{ padding: '4px 12px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '20px', fontSize: '12px', color: '#F5C842', fontWeight: 600 }}>{lm}</span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {resultTab === 'map' && result.geocoding && (
                    <div>
                      {/* Map style switcher */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                          {(Object.keys(MAP_STYLES) as MapStyle[]).map(key => (
                            <button key={key} type="button" onClick={() => setMapStyle(key)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px',
                                background: mapStyle === key ? 'rgba(245,200,66,0.15)' : 'none',
                                border: 'none', cursor: 'pointer',
                                color: mapStyle === key ? '#F5C842' : 'rgba(255,255,255,0.4)',
                                fontSize: '12px', fontWeight: mapStyle === key ? 700 : 500, transition: 'all 0.15s',
                              }}>
                              <Icon icon={MAP_STYLES[key].icon} width={14} />
                              {t(MAP_STYLES[key].labelKey)}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* Latitude */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.13) 0%, rgba(59,130,246,0.06) 100%)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '9px', padding: '5px 9px 5px 7px',
                            boxShadow: '0 0 12px rgba(59,130,246,0.07)',
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '6px',
                              background: 'rgba(59,130,246,0.15)',
                              border: '1px solid rgba(59,130,246,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Icon icon="solar:map-arrow-up-bold-duotone" width={12} color="#60A5FA" />
                            </div>
                            <div style={{ lineHeight: 1, gap: 2, display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(96,165,250,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Latitude</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#93C5FD', fontFamily: 'monospace' }}>{result.geocoding.latitude.toFixed(6)}</span>
                            </div>
                          </div>
                          {/* Longitude */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.13) 0%, rgba(168,85,247,0.06) 100%)',
                            border: '1px solid rgba(168,85,247,0.3)',
                            borderRadius: '9px', padding: '5px 9px 5px 7px',
                            boxShadow: '0 0 12px rgba(168,85,247,0.07)',
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '6px',
                              background: 'rgba(168,85,247,0.15)',
                              border: '1px solid rgba(168,85,247,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Icon icon="solar:map-arrow-right-bold-duotone" width={12} color="#C084FC" />
                            </div>
                            <div style={{ lineHeight: 1, gap: 2, display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(192,132,252,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Longitude</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#D8B4FE', fontFamily: 'monospace' }}>{result.geocoding.longitude.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderRadius: '12px', overflow: 'hidden', height: 'calc(100vh - 340px)', minHeight: '380px' }}>
                        <MapContainer
                          center={[result.geocoding.latitude, result.geocoding.longitude]}
                          zoom={16} style={{ width: '100%', height: '100%' }} zoomControl={false}
                        >
                          <TileLayer key={mapStyle} url={MAP_STYLES[mapStyle].url} attribution={MAP_STYLES[mapStyle].attribution} maxZoom={20} />
                          <MapRecenter lat={result.geocoding.latitude} lng={result.geocoding.longitude} />
                          <Marker position={[result.geocoding.latitude, result.geocoding.longitude]}>
                            <Popup>
                              <div style={{ fontSize: '13px', minWidth: 160 }}>
                                {components?.city && <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{components.city}</p>}
                                {components?.area && <p style={{ color: '#888', fontSize: '12px', margin: '0 0 4px' }}>{components.area}</p>}
                                <p style={{ color: '#aaa', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>
                                  {result.geocoding.latitude.toFixed(6)}, {result.geocoding.longitude.toFixed(6)}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        </MapContainer>
                      </div>

                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── First-time walkthrough ── */}
      <TabTour
        run={addrTour.run}
        onClose={addrTour.endTour}
        steps={[
          {
            target: '#tour-addr-details',
            title: 'Details Tab',
            description: 'See the fully normalized address in both English and Arabic, plus structured components like city, district, street, and postal code.',
          },
          {
            target: '#tour-addr-map',
            title: 'Map Tab',
            description: 'View the geocoded location pinned on an interactive map. Switch between street, satellite, and dark styles to explore the exact coordinates.',
          },
        ]}
      />
    </div>
  );
};
