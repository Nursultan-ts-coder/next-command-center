import React, { useEffect, useRef, useState } from 'react';

import GlassCard from '@/shared/components/glass-card';
import { OVERVIEW, OVERVIEW_REFRESH_MS } from './widgets';
import { fetchOverview } from './data';
import { minutesSeconds, percentText, change } from './overview-data';
import { niceScale } from './orders';
import { repeatWhileShowing } from './store-layout/visibility';

/*
 * The overview on the Global page's map: orders completed, drive-thru duration and
 * infrastructure availability, for all NEXT stores. Each card shows only its key number, in
 * grafana-restraurant-custom-widgets' glass card.
 */

// ---------------------------------------------------------------------------
// Data (data/index.js, fetchOverview), now and again every OVERVIEW_REFRESH_MS.
// While a new answer is on its way the last one stays on screen.
// ---------------------------------------------------------------------------
// active: false while the overview is hidden; it waits, and catches up once as soon as it shows again.
export function useOverview(active = true) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const repeatRef = useRef(null);
  const [orders, setOrders] = useState({ status: 'loading' });
  const [drive, setDrive] = useState({ status: 'loading', today: null });
  const [parts, setParts] = useState(() => OVERVIEW.availability.parts.map(() => ({ status: 'loading' })));

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchOverview()
        .then((data) => {
          if (cancelled) return;
          setOrders({ status: 'ok', error: '', ...data.orders });
          setDrive({ status: 'ok', error: '', ...data.drive });
          setParts(OVERVIEW.availability.parts.map((part) => ({ status: 'ok', value: data.availability[part.id] })));
        })
        .catch((error) => {
          if (cancelled) return;
          const failed = (before) => ({ ...before, status: 'failed', error: error.message || String(error) });
          setOrders(failed);
          setDrive(failed);
          setParts((all) => all.map(failed));
        });

    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, OVERVIEW_REFRESH_MS, () => activeRef.current);
    repeatRef.current = repeat;
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, []);
  useEffect(() => {
    if (active && repeatRef.current) repeatRef.current.poke();
  }, [active]);

  return { orders, drive, parts };
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
const ICONS = {
  orders: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11a8 6 0 0 1 16 0z" /><rect x="3" y="13" width="18" height="2.4" rx="1.2" /><path d="M4 17.5h16v.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" /></svg>
  ),
  car: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 10.5 7.2 6.4A2 2 0 0 1 9.1 5h5.8a2 2 0 0 1 1.9 1.4l1.7 4.1A2.5 2.5 0 0 1 21 13v4h-2v1.5a1.5 1.5 0 0 1-3 0V17H8v1.5a1.5 1.5 0 0 1-3 0V17H3v-4a2.5 2.5 0 0 1 2.5-2.5zm2.3 0h8.4l-1.2-3a1 1 0 0 0-.9-.6H9.9a1 1 0 0 0-.9.6zM6.5 12.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm11 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" /></svg>
  ),
  servers: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 2.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zM4 14h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zm2 2.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" /></svg>
  ),
};

function CardHead({ icon, title, note }) {
  return (
    <div className="cc-ov-head">
      <span className="cc-ov-icon">{ICONS[icon]}</span>
      <div>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
    </div>
  );
}

// "▲ 11.5% vs last week". Whether up is good decides the colour.
function Delta({ fraction, against, upIsGood, upWord, downWord }) {
  if (fraction === null || fraction === undefined) return null;
  const up = fraction >= 0;
  const good = up === upIsGood || Math.abs(fraction) < 0.005;
  const size = Math.abs(fraction * 100);
  return (
    <span className={`cc-ov-delta ${good ? 'cc-ov-good' : 'cc-ov-bad'}`}>
      <i aria-hidden="true">{up ? '▲' : '▼'}</i>
      {size >= 100 ? Math.round(size) : size.toFixed(1)}% <em>{upWord ? `${up ? upWord : downWord} ${against}` : against}</em>
    </span>
  );
}

function Problem({ state }) {
  if (state.status === 'failed') return <p className="cc-ov-problem" title={state.error}>Couldn't load. {state.error ? state.error : ''}</p>;
  return null;
}

// ---------------------------------------------------------------------------
// Card 1: orders completed, a half-circle gauge with last week's mark on it
// ---------------------------------------------------------------------------
function polar(fraction, radius) {
  const angle = Math.PI * (1 - fraction);
  return [60 + radius * Math.cos(angle), 60 - radius * Math.sin(angle)];
}
function arc(from, to, radius) {
  const [x1, y1] = polar(from, radius);
  const [x2, y2] = polar(to, radius);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

function OrdersCard({ state }) {
  const { current, previous } = state;
  const known = state.status !== 'loading' && current !== null && current !== undefined;
  const top = niceScale(Math.max(current || 0, previous || 0) * 1.1 || 1, false).top;
  const fill = known ? Math.max(0, Math.min(1, current / top)) : 0;
  return (
    <GlassCard className="cc-ov-card">
      <CardHead icon="orders" title={OVERVIEW.orders.title} note={OVERVIEW.orders.note} />
      <div className="cc-ov-gauge">
        <svg viewBox="0 0 120 68" role="img" aria-label={known ? `${current} orders completed in the last hour` : 'Loading'}>
          <path d={arc(0, 1, 48)} className="cc-ov-track" />
          {fill > 0.003 && <path d={arc(0, fill, 48)} className="cc-ov-fill" />}
        </svg>
        <div className="cc-ov-gauge-mid">
          <b>{known ? Math.round(current).toLocaleString() : '–'}</b>
          <span>orders</span>
        </div>
        <div className="cc-ov-gauge-ends"><span>0</span><span>{top.toLocaleString()}</span></div>
      </div>
      <Problem state={state} />
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Card 2: drive-thru duration, and whether today is faster or slower than usual
// ---------------------------------------------------------------------------
function DriveCard({ state }) {
  const d = OVERVIEW.driveThru;
  const today = Number.isFinite(state.today) ? state.today : null;
  return (
    <GlassCard className="cc-ov-card">
      <CardHead icon="car" title={d.title} note={d.note} />
      <div className="cc-ov-big">
        <b>{minutesSeconds(state.average)}</b>
        <span>min:sec, last {d.days || 7} days</span>
      </div>
      <div className="cc-ov-foot">
        {today !== null && <Delta fraction={change(today, state.average)} against={`today (${minutesSeconds(today)})`} upWord="slower" downWord="faster" upIsGood={false} />}
      </div>
      <Problem state={state} />
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Card 3: availability (a ring for the lowest), plus how the stores look right now
// ---------------------------------------------------------------------------
function health(value) {
  const { goodAt, warnAt } = OVERVIEW.availability;
  if (!Number.isFinite(value)) return { word: 'No data', tone: 'off' };
  if (value >= goodAt) return { word: 'Healthy', tone: 'good' };
  if (value >= warnAt) return { word: 'Degraded', tone: 'warn' };
  return { word: 'Down', tone: 'bad' };
}

// One ring per part (Edge nodes outside, GRNT inside), each filled to its percentage.
const RING_RADII = [42, 31];

function AvailabilityCard({ parts }) {
  const a = OVERVIEW.availability;
  const values = parts.map((part) => (part.status === 'ok' && Number.isFinite(part.value) ? part.value : null));
  const known = values.filter((value) => value !== null);
  const lowest = known.length ? Math.min(...known) : null;
  return (
    <GlassCard className="cc-ov-card">
      <CardHead icon="servers" title={a.title} note={a.note} />
      <div className="cc-ov-avail">
        <div className="cc-ov-ring">
          <svg viewBox="0 0 100 100" role="img" aria-label={a.parts.map((part, i) => `${part.name} ${percentText(values[i])}`).join(', ')}>
            {a.parts.slice(0, RING_RADII.length).map((part, i) => {
              const r = RING_RADII[i];
              const circumference = 2 * Math.PI * r;
              const filled = values[i] === null ? 0 : Math.max(0, Math.min(1, values[i] / 100));
              return (
                <g key={part.name}>
                  <circle cx="50" cy="50" r={r} className="cc-ov-ring-track" />
                  {filled > 0 && (
                    <circle cx="50" cy="50" r={r} className={`cc-ov-ring-fill cc-ov-${health(values[i]).tone}`} strokeDasharray={`${(filled * circumference).toFixed(2)} ${circumference.toFixed(2)}`} transform="rotate(-90 50 50)" />
                  )}
                </g>
              );
            })}
          </svg>
          <div className="cc-ov-ring-mid">
            <b>{lowest === null ? '–' : health(lowest).word}</b>
          </div>
        </div>
        <ul className="cc-ov-parts">
          {a.parts.map((part, i) => {
            const state = parts[i];
            const tone = state.status === 'failed' ? 'bad' : health(values[i]).tone;
            return (
              <li key={part.name} title={state.status === 'failed' ? state.error : undefined}>
                <span className={`cc-ov-dot cc-ov-${tone}`} aria-hidden="true" />
                <span className="cc-ov-part-name">{part.name}</span>
                <b>{state.status === 'loading' ? '…' : state.status === 'failed' ? 'Error' : percentText(values[i])}</b>
              </li>
            );
          })}
        </ul>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// The whole overview
// ---------------------------------------------------------------------------
export default function Overview({ data }) {
  return (
    <div className="cc-ov">
      <OrdersCard state={data.orders} />
      <DriveCard state={data.drive} />
      <AvailabilityCard parts={data.parts} />
    </div>
  );
}
