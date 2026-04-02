import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useUsage } from '../../hooks/useUsage';
import { useLanguage } from '../../contexts/LanguageContext';
import { StatCard } from '../../components/ui/StatCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { OutlineButton } from '../../components/ui/OutlineButton';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// ── Helpers ───────────────────────────────────────────────────────────────────

const chartGridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.07)' };
const chartAxisStyle = { fill: 'rgba(255,255,255,0.45)', fontSize: 11 };

const ChartTooltip: React.FC<{
  active?:  boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?:   string;
}> = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '10px', padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: '13px', margin: '2px 0', fontWeight: 700 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function timeAgo(iso: string, lang: 'en' | 'ar'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (mins < 1)  return 'الآن';
    if (mins < 60) return `${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} ${hrs > 1 ? 'ساعات' : 'ساعة'}`;
    const days = Math.floor(hrs / 24);
    return `${days} ${days > 1 ? 'أيام' : 'يوم'}`;
  }
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DashboardHomePage: React.FC = () => {
  const { user }                              = useAuth();
  const { usage, history, activity, isLoading } = useUsage();
  const { t, lang }                           = useLanguage();
  const navigate                              = useNavigate();
  const { isMobile, winW }                   = useBreakpoint();
  const isTablet = winW < 1024;

  const firstName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? t('home.goodMorning') : hour < 17 ? t('home.goodAfternoon') : t('home.goodEvening');

  const normCount = usage?.addressNormalizerCount ?? 0;
  const normLimit = usage?.addressNormalizerLimit ?? 10;
  const optCount  = usage?.routeOptimizerCount    ?? 0;
  const optLimit  = usage?.routeOptimizerLimit     ?? 5;

  // Derived stats from real usage
  const estDistanceKm = Math.round(optCount * 159);   // ~159 km average per optimized route
  const estHours      = +(optCount * 3.9).toFixed(1); // ~3.9 hrs saved per route

  const normPct = normLimit > 0 ? normCount / normLimit : 0;
  const optPct  = optLimit  > 0 ? optCount  / optLimit  : 0;
  const showLimitWarning = normPct >= 0.8 || optPct >= 0.8;

  // Pie chart data (real counts)
  const pieData = useMemo(() => [
    { name: t('home.normUsed'), value: normCount, color: '#F5C842' },
    { name: t('home.optUsed'),  value: optCount,  color: '#3B82F6' },
    { name: t('home.remaining'), value: Math.max(0, (normLimit - normCount) + (optLimit - optCount)), color: 'rgba(255,255,255,0.08)' },
  ], [normCount, normLimit, optCount, optLimit, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grid breakpoints
  const statsGrid    = isMobile || isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const chartsGrid   = isMobile ? '1fr' : 'minmax(0,3fr) minmax(0,2fr)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>

      {/* ── Welcome Banner ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(12,17,45,0.88)', border: '1px solid rgba(245,200,66,0.18)',
          borderLeft: '4px solid #F5C842', borderRadius: '16px',
          padding: isMobile ? '18px 16px' : '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '14px',
        }}>
        <div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
            {greeting}, {firstName} 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
            {user?.companyName && <span>{user.companyName}</span>}
            {user?.country     && <span> · {user.country}</span>}
            {!user?.companyName && <span>{t('dash.welcomeTo')}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <GoldButton size="sm" onClick={() => navigate('/dashboard/address-normalizer')}>
            <Icon icon="solar:map-point-wave-bold" width={15} />{t('home.normalizeAddress')}
          </GoldButton>
          <OutlineButton size="sm" onClick={() => navigate('/dashboard/route-optimizer')}>
            <Icon icon="solar:routing-2-bold" width={15} />{t('home.planRoute')}
          </OutlineButton>
        </div>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: statsGrid, gap: isMobile ? '12px' : '16px' }}>
        <StatCard icon="solar:map-point-wave-bold-duotone" value={normCount} label={t('home.addrNormalized')}
          sublabel={t('home.ofFree').replace('{n}', String(normLimit))} progressRing={{ value: normCount, max: normLimit }} />
        <StatCard icon="solar:routing-2-bold-duotone" value={optCount} label={t('home.routesOptimized')}
          sublabel={t('home.ofFree').replace('{n}', String(optLimit))} progressRing={{ value: optCount, max: optLimit }} color="#3B82F6" />
        <StatCard icon="solar:ruler-angular-bold-duotone"
          value={estDistanceKm > 0 ? `${estDistanceKm.toLocaleString()} km` : '—'}
          label={t('home.distanceSaved')}
          sublabel={estDistanceKm > 0 ? t('home.estFromRoutes') : t('home.runFirstRoute')}
          trend={optCount > 0 ? undefined : undefined} trendUp color="#F5C842" />
        <StatCard icon="solar:clock-circle-bold-duotone"
          value={estHours > 0 ? `${estHours} hrs` : '—'}
          label={t('home.timeSaved')}
          sublabel={estHours > 0 ? t('home.estFromRoutes') : t('home.runFirstRoute')}
          trendUp color="#10B981" />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: chartsGrid, gap: '16px' }}>

        {/* Line / Area chart — real history data */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(12,17,45,0.88)', border: '1px solid rgba(245,200,66,0.18)', borderRadius: '16px', padding: '20px 20px 12px' }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #F5C842', paddingLeft: '10px' }}>
            {t('home.apiUsage7Days')}
          </h3>
          {isLoading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(245,200,66,0.2)', borderTopColor: '#F5C842', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="normGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F5C842" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F5C842" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridStyle} />
                <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="normalizer" name="Normalizer" stroke="#F5C842" strokeWidth={2} fill="url(#normGrad)" dot={{ fill: '#F5C842', r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="optimizer"  name="Optimizer"  stroke="#3B82F6" strokeWidth={2} fill="url(#optGrad)"  dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '4px' }}>
            {[{ color: '#F5C842', label: t('home.addrNormalizerLabel') }, { color: '#3B82F6', label: t('home.routeOptimizerLabel') }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Donut chart — real counts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ background: 'rgba(12,17,45,0.88)', border: '1px solid rgba(245,200,66,0.18)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', borderLeft: '3px solid #F5C842', paddingLeft: '10px' }}>
            {t('home.usageBreakdown')}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                formatter={(v, n) => [v, n]}
                contentStyle={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', fontSize: '13px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {pieData.slice(0, 2).map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '2px', background: p.color }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{p.name}</span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div style={{ marginTop: '12px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{t('home.totalApiCalls')}</p>
            <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: '#F5C842', fontFamily: "'Sora', sans-serif" }}>{normCount + optCount}</p>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Activity (real data) ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: 'rgba(12,17,45,0.88)', border: '1px solid rgba(245,200,66,0.18)', borderRadius: '16px', padding: isMobile ? '16px' : '24px' }}>
        <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #F5C842', paddingLeft: '10px' }}>
          {t('home.recentActivity')}
        </h3>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid rgba(245,200,66,0.2)', borderTopColor: '#F5C842', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Icon icon="solar:history-bold-duotone" width={40} color="rgba(245,200,66,0.2)" />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '12px' }}>{t('home.noActivity')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {activity.map((row, i) => {
              const isNorm = row.service === 'address_normalizer';
              return (
                <motion.div key={row.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + i * 0.04 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', transition: 'background 0.15s', cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: isNorm ? 'rgba(245,200,66,0.12)' : 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon={isNorm ? 'solar:map-point-wave-bold-duotone' : 'solar:routing-2-bold-duotone'} width={17} color={isNorm ? '#F5C842' : '#3B82F6'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
                      {isNorm ? t('home.addrNormalizedAct') : t('home.routeOptimizedAct')}
                    </p>
                    {row.summary && (
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.summary}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{timeAgo(row.createdAt, lang)}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '20px' }}>{t('home.success')}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Quick Start Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {[
          { icon: 'solar:map-point-wave-bold-duotone', title: t('home.normalizeTitle'), desc: t('home.normalizeDesc'), btn: t('home.startNow'), route: '/dashboard/address-normalizer', color: '#F5C842' },
          { icon: 'solar:routing-2-bold-duotone',       title: t('home.optimizeTitle'), desc: t('home.optimizeDesc'), btn: t('home.planRoute'), route: '/dashboard/route-optimizer',    color: '#3B82F6' },
        ].map(card => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, boxShadow: `0 12px 40px ${card.color}20` }} transition={{ duration: 0.2 }}
            style={{ background: 'rgba(12,17,45,0.88)', border: `1px solid ${card.color}25`, borderRadius: '16px', padding: '24px', cursor: 'pointer' }}
            onClick={() => navigate(card.route)}
          >
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Icon icon={card.icon} width={24} color={card.color} />
            </div>
            <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>{card.title}</h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', lineHeight: 1.6 }}>{card.desc}</p>
            {card.color === '#F5C842' ? (
              <GoldButton size="sm" onClick={e => { e.stopPropagation(); navigate(card.route); }}>
                {card.btn} <Icon icon="solar:arrow-right-bold" width={13} />
              </GoldButton>
            ) : (
              <OutlineButton size="sm" onClick={e => { e.stopPropagation(); navigate(card.route); }}>
                {card.btn} <Icon icon="solar:arrow-right-bold" width={13} />
              </OutlineButton>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Usage Limit Warning ──────────────────────────────────────── */}
      {showLimitWarning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="solar:danger-triangle-bold-duotone" width={20} color="#F59E0B" />
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              {normPct >= 0.8 && `Used ${normCount}/${normLimit} normalizer requests. `}
              {optPct  >= 0.8 && `Used ${optCount}/${optLimit} optimizer requests.`}
              {' '}{t('home.upgradeMsg')}
            </p>
          </div>
          <button style={{ background: 'linear-gradient(135deg, #F5C842, #D4A017)', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 700, color: '#0A0E27', cursor: 'pointer',             fontFamily: "'Sora', sans-serif", whiteSpace: 'nowrap' }}>
            {t('home.upgradePlan')}
          </button>
        </motion.div>
      )}
    </div>
  );
};
