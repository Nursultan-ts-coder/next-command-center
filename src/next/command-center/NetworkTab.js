import React, { useEffect, useState } from 'react';

import { NETWORK, NETWORK_REFRESH_MS } from './widgets';
import { fetchNetwork } from './data';
import { readStrips, readPools, readRetries, level } from './network-data';
import { clock } from './orders';
import TrendsChart from '@/shared/components/charts/trends';
import { useChartTheme } from '@/shared/hooks/use-chart-theme';
import { LINE_COLORS, dashedLine, plainLine } from './components/trend-lines';
import WidgetCard from './components/WidgetCard';
import { repeatWhileShowing } from './store-layout/visibility';

/*
 * The Network tab: edge nodes, gateways and switches, DHCP pools and Wi-Fi for the store you
 * click (data/index.js, fetchNetwork), now and every NETWORK_REFRESH_MS, only while the tab is open.
 * Returns { edge, devices, dhcp, wifi }, each { status, data, error }.
 */
export function useNetwork(storeId, enabled) {
  const [state, setState] = useState({});
  useEffect(() => {
    if (!enabled || !/^\d+$/.test(String(storeId || ''))) return undefined;
    let cancelled = false;
    setState({});
    const load = () =>
      fetchNetwork(storeId)
        .then((data) => {
          if (cancelled) return;
          const next = {};
          Object.keys(NETWORK).forEach((key) => { next[key] = { status: 'ok', data: data[key] }; });
          setState(next);
        })
        .catch((error) => {
          if (cancelled) return;
          setState((all) => {
            const next = {};
            Object.keys(NETWORK).forEach((key) => { next[key] = { status: 'failed', data: (all[key] || {}).data, error: error.message || String(error) }; });
            return next;
          });
        });
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, NETWORK_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [storeId, enabled]);
  return state;
}

const TONE = { ok: '#17b84a', warn: '#f5c400', bad: '#e5231b', none: '#4a5565' };

// One part of the network, in grafana's widget card.
function Card({ part, badge, tone, children, state }) {
  return (
    <WidgetCard title={part.title} subtitle={part.note} actions={badge && <b className={`cc-net-badge cc-net-${tone || 'none'}`}>{badge}</b>}>
      {state && state.status === 'failed' && <p className="cc-net-problem">Couldn't load. {state.error}</p>}
      {!state && <p className="cc-net-empty">Loading…</p>}
      {state && children}
    </WidgetCard>
  );
}

// One row per device: a strip of slots, green when it reported, red when it did not.
// 7360 -> "7.36k", 48 -> "48".
const shortCount = (value) => (value >= 1000 ? `${Number((value / 1000).toFixed(2))}k` : String(Math.round(value)));

function Strips({ data, noun, countLabel }) {
  if (!data.devices.length) return <p className="cc-net-empty">No {noun} reported in the last 6 hours.</p>;
  const { buckets } = data;
  return (
    <div className={`cc-net-strips${countLabel ? ' cc-net-counts' : ''}`}>
      {countLabel && (
        <div className="cc-net-strip cc-net-colhead" aria-hidden="true">
          <span /><span>Device</span><span>Every 5 minutes</span><span>{countLabel}</span><span />
        </div>
      )}
      {data.devices.map((device) => (
        <div key={device.name} className="cc-net-strip">
          <span className={`cc-net-dot cc-net-${device.upNow ? 'ok' : 'bad'}`} aria-hidden="true" />
          <span className="cc-net-name" title={device.name}>{device.name}</span>
          <div className="cc-net-slots" role="img" aria-label={`${device.name}: ${device.upNow ? 'reporting now' : 'not reporting now'}, missed ${device.slots.filter((up) => !up).length} of ${device.slots.length} five-minute slots`}>
            {device.slots.map((up, i) => (
              <i key={buckets[i] ? buckets[i].start : i} className={up ? 'cc-up' : 'cc-down'} title={`${buckets[i] ? clock(buckets[i].start) : ''}: ${countLabel ? `${Math.round(device.values[i])} heartbeats` : up ? 'reported' : 'no data'}`} />
            ))}
          </div>
          {countLabel && <b className={`cc-net-count cc-net-t-${device.recent > 0 ? 'ok' : 'bad'}`} title={`${Math.round(device.recent)} heartbeats in about the last 10 minutes`}>{shortCount(device.recent)}</b>}
          <span className={`cc-net-now cc-net-t-${device.upNow ? 'ok' : 'bad'}`}>{device.upNow ? 'Up' : 'Down'}</span>
        </div>
      ))}
      {buckets.length > 1 && (
        <div className="cc-net-strip cc-net-axis-row" aria-hidden="true">
          <span /><span />
          <div className="cc-net-axis"><span>{clock(buckets[0].start)}</span><span>now</span></div>
          {countLabel && <span />}
          <span />
        </div>
      )}
    </div>
  );
}

function Pools({ pools, part }) {
  if (!pools.length) return <p className="cc-net-empty">No DHCP pools reported in the last 30 minutes.</p>;
  return (
    <div className="cc-net-pools">
      {pools.map((pool) => {
        const tone = level(pool.percent, part.warnAt, part.badAt);
        return (
          <div key={pool.name} className="cc-net-pool">
            <span className="cc-net-name" title={pool.name}>{pool.name}</span>
            <div className="cc-net-bar"><i style={{ width: `${Math.min(100, pool.percent)}%`, background: TONE[tone === 'ok' ? 'ok' : tone] }} /></div>
            <span className="cc-net-num">{pool.used}/{pool.total}</span>
            <b className={`cc-net-t-${tone}`}>{Math.round(pool.percent)}%</b>
          </div>
        );
      })}
    </div>
  );
}

// Wi-Fi retries: one line per access point in grafana's trend chart, with the warn and bad
// limits as its dashed warning and critical lines. Under it, each access point's rates now.
function Retries({ data, part }) {
  const chartTheme = useChartTheme();
  if (!data.aps.length) return <p className="cc-net-empty">No access points reported in the last 6 hours.</p>;
  const flat = (value) => data.buckets.map(() => value);
  const percent = (value) => `${Number(Number(value).toFixed(1))}%`;
  return (
    <div className="cc-net-wifi">
      <TrendsChart
        data={{
          labels: data.buckets.map((bucket) => clock(bucket.start)),
          datasets: [
            ...data.aps.map((ap, i) => plainLine(chartTheme, ap.name, ap.tx, LINE_COLORS[i % LINE_COLORS.length])),
            dashedLine(chartTheme, `Warning at ${part.warnAt}%`, flat(part.warnAt), 'warning'),
            dashedLine(chartTheme, `Bad at ${part.badAt}%`, flat(part.badAt), 'critical'),
          ],
        }}
      />
      <div className="cc-net-legend">
        {data.aps.map((ap, i) => {
          const tone = level(ap.txNow, part.warnAt, part.badAt);
          const known = (value) => value !== null && value !== undefined;
          return (
            <span key={ap.name}>
              <i style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
              {ap.name}
              <b className={`cc-net-t-${tone}`}>{known(ap.txNow) ? percent(ap.txNow) : '–'}</b>
              <em>receive {known(ap.rxNow) ? `${ap.rxNow}%` : '–'}</em>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function NetworkTab({ state, storeId }) {
  if (!storeId) {
    return <WidgetCard><p className="cc-empty">Click a store on the map to see its network: edge nodes, gateways and switches, DHCP pools and Wi-Fi.</p></WidgetCard>;
  }
  const edge = state.edge && state.edge.data ? readStrips(state.edge.data) : null;
  const devices = state.devices && state.devices.data ? readStrips(state.devices.data) : null;
  const pools = state.dhcp && state.dhcp.data ? readPools(state.dhcp.data) : null;
  const wifi = state.wifi && state.wifi.data ? readRetries(state.wifi.data) : null;

  const edgeUp = edge ? edge.devices.filter((d) => d.upNow).length : 0;
  const edgeTone = !edge ? 'none' : edgeUp >= NETWORK.edge.expect ? 'ok' : edgeUp === 0 ? 'bad' : 'warn';
  const devUp = devices ? devices.devices.filter((d) => d.upNow).length : 0;
  const devTone = !devices || !devices.devices.length ? 'none' : devUp === devices.devices.length ? 'ok' : devUp === 0 ? 'bad' : 'warn';
  const fullest = pools && pools.length ? pools[0] : null;
  const poolTone = fullest ? level(fullest.percent, NETWORK.dhcp.warnAt, NETWORK.dhcp.badAt) : 'none';
  const worstAp = wifi && wifi.aps.length ? wifi.aps.reduce((a, b) => ((b.txNow || 0) > (a.txNow || 0) ? b : a)) : null;
  const wifiTone = worstAp ? level(worstAp.txNow, NETWORK.wifi.warnAt, NETWORK.wifi.badAt) : 'none';

  return (
    <div className="cc-widgets">
      <Card part={NETWORK.edge} state={state.edge} badge={edge ? `${edgeUp}/${NETWORK.edge.expect} up` : null} tone={edgeTone}>
        {edge && <Strips data={edge} noun="edge nodes" />}
      </Card>
      <Card part={NETWORK.devices} state={state.devices} badge={devices && devices.devices.length ? `${devUp}/${devices.devices.length} up` : null} tone={devTone}>
        {devices && <Strips data={devices} noun="gateways or switches" countLabel="10 min" />}
      </Card>
      <Card part={NETWORK.dhcp} state={state.dhcp} badge={fullest ? `Fullest ${Math.round(fullest.percent)}%` : null} tone={poolTone}>
        {pools && <Pools pools={pools} part={NETWORK.dhcp} />}
      </Card>
      <Card part={NETWORK.wifi} state={state.wifi} badge={worstAp && worstAp.txNow !== null ? `Worst ${Number(worstAp.txNow.toFixed(1))}%` : null} tone={wifiTone}>
        {wifi && <Retries data={wifi} part={NETWORK.wifi} />}
      </Card>
    </div>
  );
}
