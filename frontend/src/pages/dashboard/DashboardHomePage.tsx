import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToday } from '../../hooks/useToday';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/LoadingOverlay';
import { dispatchAPI, messageOf, type DispatchEvent, type Order, type Run, type Today, type Van } from '../../services/dispatch';
import { LiveMap } from '../../components/dispatch/LiveMap';
import { AddOrders, PinOrder, PlanRun } from '../../components/dispatch/Dialogs';
import { MATCHES, clock, fill, matchColor, matchOf, stageOf, vanColor, type Stage, type T } from '../../components/dispatch/shared';
import type { TranslationKey } from '../../translations';
import '../../components/dispatch/dispatch.css';

// The dispatcher's day: what came in, how well it matched, the run, and where the vans are.

const ts = (iso: string) => new Date(iso).getTime();
const runOf = (runs: Run[], van: Van) => runs.find(r => r.vans.some(v => v.id === van.id))!;
const stopsOf = (orders: Order[], van: Van) => orders.filter(o => o.vanId === van.id).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

// ── Numbers along the top ─────────────────────────────────────────────────────

const Stats: React.FC<{ today: Today; vans: Van[]; t: T; lang: 'en' | 'ar' }> = ({ today, vans, t, lang }) => {
  const { orders, runs } = today;
  const n = (s: string) => orders.filter(o => o.state === s).length;
  const onRun = orders.filter(o => o.vanId), done = onRun.filter(o => o.deliveredAt).length;
  const out = vans.filter(v => stopsOf(orders, v).some(o => !o.deliveredAt)).length;
  const back = vans.length ? Math.max(...vans.map(v => ts(runOf(runs, v).startAt) + v.minutes * 60e3)) : 0;
  const parts = [
    n('ready') && fill(t('dp.exact'), { n: n('ready') }), n('check') && fill(t('dp.toCheck'), { n: n('check') }),
    n('pin') && fill(t('dp.toPin'), { n: n('pin') }), n('cleaning') && fill(t('dp.cleaningN'), { n: n('cleaning') }),
  ].filter(Boolean);
  return (
    <section className="dp-stats">
      <div className="dp-card dp-stat">
        <div className="k">{t('dp.ordersToday')}</div><div className="v num">{orders.length}</div>
        <div className="dp-seg">
          {(['ready', 'check', 'pin', 'cleaning'] as const).map(s => n(s) > 0 &&
            <i key={s} style={{ flex: n(s), background: { ready: 'var(--ok)', check: 'var(--check)', pin: 'var(--warn)', cleaning: 'var(--faint)' }[s] }} />)}
        </div>
        <div className="s">{parts.join(' · ')}</div>
      </div>
      <div className="dp-card dp-stat">
        <div className="k">{t('dp.delivered')}</div>
        <div className="v num">{onRun.length ? <>{done} <small>{fill(t('dp.of'), { n: onRun.length })}</small></> : '—'}</div>
        <div className="dp-seg"><i style={{ flex: done, background: 'var(--gold)' }} /><i style={{ flex: onRun.length - done, background: 'var(--line-2)' }} /></div>
        <div className="s">{!onRun.length ? t('dp.notPlanned') : done < onRun.length ? fill(t('dp.stillOut'), { n: onRun.length - done }) : t('dp.allDone')}</div>
      </div>
      <div className="dp-card dp-stat">
        <div className="k">{t('dp.distance')}</div>
        <div className="v num">{vans.length ? <>{vans.reduce((s, v) => s + v.km, 0).toFixed(1)} <small>{lang === 'ar' ? 'كم' : 'km'}</small></> : '—'}</div>
        <div className="s" style={{ marginTop: 28 }}>
          {vans.length ? vans.slice(0, 4).map(v => `${fill(t('dp.van'), { n: v.index + 1 })} ${v.km.toFixed(1)}`).join(' · ') : t('dp.notPlanned')}
        </div>
      </div>
      <div className="dp-card dp-stat">
        <div className="k">{t('dp.vansOut')}</div>
        <div className="v num">{vans.length ? <>{out} <small>{fill(t('dp.of'), { n: vans.length })}</small></> : '—'}</div>
        <div className="s" style={{ marginTop: 28 }}>{vans.length ? fill(t('dp.backBy'), { t: clock(new Date(back), lang) }) : t('dp.notPlanned')}</div>
      </div>
    </section>
  );
};

// ── Deliveries over the day: what's been delivered against the plan ──────────

const Chart: React.FC<{ today: Today; vans: Van[]; t: T; lang: 'en' | 'ar' }> = ({ today, vans, t, lang }) => {
  const onRun = today.orders.filter(o => o.vanId && o.eta);
  if (!vans.length || !onRun.length) return <div className="dp-chart-empty">{t('dp.chartEmpty')}</div>;
  const planned = onRun.map(o => ts(o.eta!)).sort((a, b) => a - b);
  const done = onRun.filter(o => o.deliveredAt).map(o => ts(o.deliveredAt!)).sort((a, b) => a - b);
  const now = ts(today.now);
  const lo = Math.min(...vans.map(v => ts(runOf(today.runs, v).startAt)), ...done);
  const hi = Math.max(...vans.map(v => ts(runOf(today.runs, v).startAt) + v.minutes * 60e3), ...done, lo + 60 * 60e3);
  const W = 600, H = 190, x = (tm: number) => ((tm - lo) / (hi - lo)) * W, y = (k: number) => H - 6 - (k / planned.length) * (H - 14);
  const steps = (list: number[]) => list.reduce((d, tm, i) => `${d} H${x(tm)} V${y(i + 1)}`, `M0 ${y(0)}`);
  const doneTo = Math.min(Math.max(now, done.at(-1) ?? lo), hi);
  const doneD = `${steps(done)} H${x(doneTo)}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => clock(new Date(lo + f * (hi - lo)), lang));
  return (
    <>
      <div className="dp-chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {[0, 0.5, 1].map(f => <line key={f} x1="0" x2={W} y1={y(planned.length * f)} y2={y(planned.length * f)} stroke="rgba(255,255,255,.06)" vectorEffect="non-scaling-stroke" />)}
          <path d={`${steps(planned)} H${W}`} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={`${doneD} V${y(0)} Z`} fill="rgba(245,200,66,.12)" />
          <path d={doneD} fill="none" stroke="#F5C842" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {now > lo && now < hi && <line x1={x(now)} x2={x(now)} y1="0" y2={H} stroke="rgba(255,255,255,.35)" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
      <div className="dp-axis num" dir="ltr">{ticks.map((tk, i) => <span key={i}>{tk}</span>)}</div>
    </>
  );
};

const Matches: React.FC<{ orders: Order[]; t: T }> = ({ orders, t }) => {
  const count = (k: string) => orders.filter(o => matchOf(o) === k).length;
  const shown = MATCHES.filter(m => m.key !== 'cleaning' || count('cleaning') > 0).filter(m => m.key !== 'pinned' || count('pinned') > 0);
  const max = Math.max(1, ...shown.map(m => count(m.key)));
  return (
    <div className="dp-bars">
      {shown.map(m => (
        <div className="dp-bar" key={m.key}>
          <span>{t(`dp.m.${m.key}` as TranslationKey)}</span><span className="num">{count(m.key)}</span>
          <div className="track"><b style={{ width: `${(count(m.key) / max) * 100}%`, background: m.color }} /></div>
        </div>
      ))}
    </div>
  );
};

// ── Live: the map and one card per van ────────────────────────────────────────

const Live: React.FC<{ today: Today; vans: Van[]; t: T; lang: 'en' | 'ar' }> = ({ today, vans, t, lang }) => {
  const { toast } = useToast();
  const [focus, setFocus] = useState<number | null>(null);
  const depot = today.runs.at(-1)?.depot ?? today.last?.depot ?? null;
  const copy = async (van: Van) => {
    try { await navigator.clipboard.writeText(`${location.origin}/d/${van.token}`); toast({ type: 'success', title: t('dp.copied'), message: van.driver }); }
    catch { window.prompt(t('dp.copyLink'), `${location.origin}/d/${van.token}`); }
  };
  return (
    <div className="dp-card dp-livemap">
      <div className="h">
        <h3>{t('dp.live')}</h3>
        {vans.length > 1 && (
          <div className="dp-chips">
            <button className={`dp-chip all ${focus === null ? 'on' : ''}`} onClick={() => setFocus(null)}>{t('dp.allVans')}</button>
            {vans.map(v => (
              <button key={v.id} className={`dp-chip ${focus === v.index ? 'on' : ''}`} onClick={() => setFocus(f => (f === v.index ? null : v.index))}>
                <i style={{ background: vanColor(v.index) }}>{v.index + 1}</i>{v.driver}
              </button>
            ))}
          </div>
        )}
      </div>
      <LiveMap orders={today.orders} vans={vans} depot={depot} focus={focus} />
      {vans.length > 0 && (
        <>
          <div className="dp-vans">
            {vans.map(v => {
              const stops = stopsOf(today.orders, v), done = stops.filter(o => o.deliveredAt).length;
              const next = stops.find(o => !o.deliveredAt), leaves = runOf(today.runs, v).startAt;
              const line = !next ? t('dp.vanDone')
                : ts(today.now) < ts(leaves) ? fill(t('dp.notLeft'), { t: clock(leaves, lang) })
                : fill(t('dp.nextStop'), { n: next.seq ?? '', t: next.eta ? clock(next.eta, lang) : '' });
              return (
                <div key={v.id} className={`dp-van ${focus === v.index ? 'on' : ''}`}>
                  <div className="t"><i style={{ background: vanColor(v.index) }}>{v.index + 1}</i><span>{v.driver}</span>
                    <button className="dp-mini" onClick={() => copy(v)}>{t('dp.copyLink')}</button></div>
                  <div className="m num">{fill(t('dp.vanStat'), { d: done, n: stops.length, km: v.km.toFixed(1) })}</div>
                  <div className="p">{stops.map(o => <b key={o.id} style={o.deliveredAt ? { background: vanColor(v.index) } : undefined} />)}</div>
                  <div className="n">{line}</div>
                </div>
              );
            })}
          </div>
          <p className="dp-livenote">{t('dp.liveNote')}</p>
        </>
      )}
    </div>
  );
};

const EVENT_TEXT: Record<string, (d: DispatchEvent['data']) => [TranslationKey, Record<string, string | number>]> = {
  orders_added: d => ['dp.e.orders_added', { n: d.count ?? 0 }],
  needs_pin:    d => [d.match ? 'dp.e.needs_pin' : 'dp.e.needs_pin0', { c: d.customer ?? '' }],
  checked:      d => ['dp.e.checked', { c: d.customer ?? '' }],
  pinned:       d => ['dp.e.pinned', { c: d.customer ?? '' }],
  run_planned:  d => ['dp.e.run_planned', { v: d.vans ?? 0, n: d.stops ?? 0, km: d.km ?? 0 }],
  delivered:    d => ['dp.e.delivered', { v: d.van ?? '', c: d.customer ?? '' }],
  van_done:     d => ['dp.e.van_done', { v: d.van ?? '' }],
};

const Activity: React.FC<{ events: DispatchEvent[]; t: T; lang: 'en' | 'ar' }> = ({ events, t, lang }) => {
  const shown = events.filter(e => EVENT_TEXT[e.kind]);
  return (
    <div className="dp-card dp-feed">
      <h3>{t('dp.activity')}</h3>
      {!shown.length ? <p className="dp-empty-feed">{t('dp.noActivity')}</p> : (
        <ol>
          {shown.map(e => {
            const [key, vars] = EVENT_TEXT[e.kind](e.data);
            const van = e.kind === 'delivered' || e.kind === 'van_done' ? Number(e.data.van) : 0;
            const color = van ? vanColor(van - 1) : { needs_pin: 'var(--warn)', checked: 'var(--check)', run_planned: 'var(--gold)' }[e.kind] ?? 'var(--ok)';
            return (
              <li key={e.id}>
                <span className="d" style={{ background: color }}>{van || (e.kind === 'needs_pin' ? '!' : '✓')}</span>
                <span className="w">{fill(t(key), vars)}</span>
                <time className="num" dateTime={e.createdAt}>{clock(e.createdAt, lang)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

// ── Today's orders ────────────────────────────────────────────────────────────

type Tab = 'all' | 'look' | 'road' | 'done' | 'off';
const inTab: Record<Tab, (o: Order) => boolean> = {
  all:  () => true,
  look: o => !o.deliveredAt && (o.state === 'check' || o.state === 'pin'),
  road: o => !!o.vanId && !o.deliveredAt,
  done: o => !!o.deliveredAt,
  off:  o => !o.vanId,
};

const STATUS: Record<Stage, (o: Order, lang: 'en' | 'ar') => [TranslationKey, string, Record<string, string>?]> = {
  cleaning: () => ['dp.s.cleaning', 'var(--faint)'],
  check:    () => ['dp.s.check', 'var(--check)'],
  pin:      () => ['dp.s.pin', 'var(--warn)'],
  ready:    () => ['dp.s.ready', 'var(--muted)'],
  road:     (o, lang) => ['dp.s.expected', 'var(--muted)', { t: o.eta ? clock(o.eta, lang) : '' }],
  done:     (o, lang) => ['dp.s.deliveredAt', 'var(--ok)', { t: clock(o.deliveredAt!, lang) }],
};

const OrdersTable: React.FC<{ today: Today; vans: Van[]; t: T; lang: 'en' | 'ar'; onPin: (o: Order) => void; onChange: () => void }> = ({ today, vans, t, lang, onPin, onChange }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [busy, setBusy] = useState('');
  const rows = today.orders.filter(inTab[tab]);
  const act = async (o: Order, call: () => Promise<unknown>) => {
    setBusy(o.id);
    try { await call(); onChange(); }
    catch (e) { toast({ type: 'error', title: `W-${o.ref}`, message: messageOf(e, t('dr.fail')) }); }
    finally { setBusy(''); }
  };
  return (
    <section className="dp-card">
      <h3>{t('dp.ordersT')}
        <span className="dp-tabs">
          {(Object.keys(inTab) as Tab[]).map(k => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {t(`dp.t.${k}` as TranslationKey)} <span className="num">{today.orders.filter(inTab[k]).length}</span>
            </button>
          ))}
        </span>
      </h3>
      {!rows.length ? <p className="dp-norows">{t('dp.noRows')}</p> : (
        <div className="dp-table-wrap">
          <table>
            <thead><tr>
              <th>{t('dp.col.order')}</th><th>{t('dp.col.customer')}</th><th>{t('dp.col.address')}</th><th>{t('dp.col.matched')}</th>
              <th>{t('dp.col.van')}</th><th>{t('dp.col.status')}</th><th style={{ textAlign: 'end' }}>kg</th><th />
            </tr></thead>
            <tbody>
              {rows.map(o => {
                const van = vans.find(v => v.id === o.vanId), stage = stageOf(o);
                const [sKey, sColor, sVars] = STATUS[stage](o, lang);
                const mc = matchColor(o);
                return (
                  <tr key={o.id}>
                    <td className="num" style={{ color: 'var(--faint)' }}>W-{o.ref}</td>
                    <td>{o.customer}</td>
                    <td className="addr">
                      <div dir="auto">{o.state === 'cleaning' ? '…' : (lang === 'ar' ? o.ar : o.en) || t('dp.m.city')}</div>
                      <small dir="auto">{o.text}</small>
                    </td>
                    <td><span className="tag" style={{ color: mc, background: `color-mix(in srgb, ${mc} 13%, transparent)` }}>{t(`dp.m.${matchOf(o)}` as TranslationKey)}</span></td>
                    <td>{van ? <><span style={{ color: vanColor(van.index) }}>{fill(t('dp.van'), { n: van.index + 1 })}</span> <span style={{ color: 'var(--faint)' }}>· {fill(t('dp.stop'), { n: o.seq ?? '' })}</span></> : <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    <td style={{ color: sColor }}>{fill(t(sKey), sVars ?? {})}</td>
                    <td className="num" style={{ textAlign: 'end' }}>{o.kg}</td>
                    <td>
                      <div className="acts">
                        {o.state === 'check' && !o.deliveredAt && <>
                          <button className="dp-mini ok" disabled={busy === o.id} onClick={() => act(o, () => dispatchAPI.confirm(o.id))}>{t('dp.looksRight')}</button>
                          <button className="dp-mini" disabled={busy === o.id} onClick={() => onPin(o)}>{t('dp.movePin')}</button>
                        </>}
                        {o.state === 'pin' && <button className="dp-mini warn" onClick={() => onPin(o)}>{t('dp.pinIt')}</button>}
                        {!o.vanId && o.state !== 'cleaning' && <button className="dp-mini quiet" disabled={busy === o.id} onClick={() => act(o, () => dispatchAPI.remove(o.id))}>{t('dp.remove')}</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// ── The page ──────────────────────────────────────────────────────────────────

export const DashboardHomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { data: today, error, reload } = useToday();
  const [dialog, setDialog] = useState<'add' | 'plan' | null>(null);
  const [pinning, setPinning] = useState<Order | null>(null);
  const vans = useMemo(() => (today?.runs ?? []).flatMap(r => r.vans).sort((a, b) => a.index - b.index), [today]);

  if (!today) {
    return error ? <div className="dp"><div className="dp-banner">{t('dp.loadFail')}</div></div>
      : <div style={{ display: 'grid', placeItems: 'center', height: 300 }}><Spinner size={28} /></div>;
  }

  const started = today.orders.some(o => o.runId && o.deliveredAt);
  const placeable = today.orders.some(o => (o.state === 'ready' || o.state === 'check') && o.lat != null && (!started || !o.runId));
  const planLabel = started ? t('dp.planMore') : today.runs.length ? t('dp.planAgain') : t('dp.plan');
  const dayName = new Date(`${today.day}T12:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const depot = today.runs.at(-1)?.depot;
  const near = depot ?? today.last?.depot ?? (() => { const o = today.orders.find(x => x.lat != null); return o ? { lat: o.lat!, lng: o.lng! } : null; })();

  return (
    <div className="dp">
      <div className="dp-head">
        <div>
          <h2>{dayName}</h2>
          <p>{[user?.companyName, depot?.address].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="dp-acts">
          <button className={`dp-btn ${today.orders.length ? 'ghost' : ''}`} onClick={() => setDialog('add')}>{t('dp.addOrders')}</button>
          {today.orders.length > 0 && <button className={`dp-btn ${placeable && !today.runs.length ? '' : 'ghost'}`} disabled={!placeable} onClick={() => setDialog('plan')}>{planLabel}</button>}
        </div>
      </div>
      {error && <div className="dp-banner">{t('dp.loadFail')}</div>}

      {!today.orders.length ? (
        <section className="dp-card dp-empty">
          <h3>{t('dp.emptyT')}</h3>
          <p>{t('dp.emptyP')}</p>
          <button className="dp-btn" onClick={() => setDialog('add')}>{t('dp.addOrders')}</button>
        </section>
      ) : (
        <>
          <Stats today={today} vans={vans} t={t} lang={lang} />
          <section className="dp-row2">
            <div className="dp-card">
              <h3>{t('dp.chartT')}
                <span className="dp-key"><span><i style={{ background: 'var(--gold)' }} />{t('dp.chartDone')}</span><span><i style={{ background: 'var(--line-2)' }} />{t('dp.chartPlan')}</span></span>
              </h3>
              <Chart today={today} vans={vans} t={t} lang={lang} />
            </div>
            <div className="dp-card">
              <h3>{t('dp.matchT')}<small className="num">{today.orders.length}</small></h3>
              <Matches orders={today.orders} t={t} />
              <p className="dp-note">{t('dp.matchNote')}</p>
            </div>
          </section>
          <section className="dp-live">
            <Live today={today} vans={vans} t={t} lang={lang} />
            <Activity events={today.events} t={t} lang={lang} />
          </section>
          <OrdersTable today={today} vans={vans} t={t} lang={lang} onPin={setPinning} onChange={reload} />
        </>
      )}

      {dialog === 'add' && <AddOrders country={user?.country ?? null} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void reload(); }} />}
      {dialog === 'plan' && <PlanRun today={today} onClose={() => setDialog(null)} onDone={note => {
        setDialog(null); void reload();
        if (note) toast({ type: 'warning', title: t('dp.plan.t'), message: note });
      }} />}
      {pinning && <PinOrder order={pinning} near={near} onClose={() => setPinning(null)} onDone={() => { setPinning(null); void reload(); }} />}
    </div>
  );
};
