/*
 * DriveThru.js: the drive-thru, beside the 3D store view (which shows only the inside of the
 * restaurant). At the top, the lane: cars in it now, the longest wait and the typical visit, and
 * each car's wait against that typical visit. Under it, the drive-thru checks as numbered steps,
 * in the order a car meets them; a step with alerts shows its first one, and opens to all of them.
 * Payment and present windows are also in the 3D view: choosing one there or here picks both.
 */
import React, { useEffect, useState } from 'react';

import { WORDING } from '../store-layout/config';
import { formatDuration } from '../store-layout/cars';
import AreaDetails, { STATUS_COLORS } from './AreaDetails';

// The drive-thru areas (store-layout/config.js), in the order a car meets them.
const LANE_ORDER = ['dt-vehicle', 'dt-speaker', 'dt-order', 'dt-help', 'dt-payment', 'dt-present', 'dt-roa', 'dt-cloud'];
const MOST_CARS = 6; // cars listed; more are counted
const WORST_FIRST = ['outage', 'degraded', 'unknown', 'healthy', 'unmonitored'];

// "4m": whole minutes, because the lane is only checked about once a minute.
const waitText = (ms) => (ms < 60000 ? 'under 1m' : `${Math.floor(ms / 60000)}m`);

// The time now, moved on every 30 seconds so the waits keep counting between checks.
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Lane({ lane }) {
  const now = useNow();
  if (lane.queue === null) {
    return <p className="cc-dt-note">Cars are not tracked for this store. Add CAR_QUERY and CAR_ACCOUNT_ID to app-config.js (see the README).</p>;
  }
  if (lane.failed) return <p className="cc-dt-note cc-bad">{WORDING.carsFailed}</p>;
  const { queue, visitMs, measured } = lane;
  const longest = queue.length ? now - queue[0].arrival : 0;
  const slow = measured && queue.length > 0 && longest > visitMs;
  return (
    <>
      <div className="cc-dt-stats">
        <div className="cc-dt-stat"><b>{queue.length}</b><span>{queue.length === 1 ? 'car in lane' : 'cars in lane'}</span></div>
        <div className={`cc-dt-stat${slow ? ' cc-dt-stat-slow' : ''}`}><b>{queue.length ? waitText(longest) : '–'}</b><span>longest wait</span></div>
        <div className="cc-dt-stat"><b>{measured ? formatDuration(visitMs) : '–'}</b><span>typical visit</span></div>
      </div>
      {queue.length > 0 && (
        <ol className="cc-dt-cars" aria-label="Cars in the lane, front first">
          {queue.slice(0, MOST_CARS).map((car, i) => {
            const wait = now - car.arrival;
            const share = measured && visitMs > 0 ? Math.min(1, wait / visitMs) : 0;
            const over = measured && wait > visitMs;
            return (
              <li key={car.key} className={over ? 'cc-dt-car-over' : ''}>
                <span className="cc-dt-car-name">{i === 0 ? 'Front car' : `Car ${i + 1}`}</span>
                <span className="cc-dt-car-bar" aria-hidden="true"><i style={{ width: `${Math.max(4, share * 100)}%` }} /></span>
                <span className="cc-dt-car-wait">{waitText(wait)}</span>
              </li>
            );
          })}
          {queue.length > MOST_CARS && <li className="cc-dt-more">and {queue.length - MOST_CARS} more</li>}
        </ol>
      )}
    </>
  );
}

function Step({ result, number, open, onToggle }) {
  const { area, status } = result;
  const first = result.open[0];
  return (
    <li className={`cc-dt-step cc-dt-step-${status}${open ? ' cc-dt-step-open' : ''}`}>
      <button type="button" className="cc-dt-step-head" onClick={onToggle} aria-expanded={open}>
        <span className="cc-dt-step-num" style={{ borderColor: STATUS_COLORS[status], color: STATUS_COLORS[status] }}>{number}</span>
        <span className="cc-dt-step-text">
          <b>{area.name}</b>
          {!open && first && <em>{(first.message || first.check.name).trim()}</em>}
        </span>
        <span className={`cc-dt-step-status cc-sv-text-${status}`}>{WORDING[status]}</span>
        <svg className="cc-dt-step-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
      </button>
      {open && <AreaDetails result={result} />}
    </li>
  );
}

/**
 *   results     the store's areas with their status (use-store-status.js)
 *   lane        the cars in the lane
 *   selectedId  the chosen area, shared with the 3D view; onSelect(areaId or null) changes it
 */
export default function DriveThru({ results, lane, selectedId, onSelect }) {
  const steps = LANE_ORDER.map((id) => results.find((result) => result.area.id === id)).filter(Boolean);
  const worst = WORST_FIRST.find((status) => steps.some((step) => step.status === status));
  const issues = steps.filter((step) => step.status === 'outage' || step.status === 'degraded').length;
  return (
    <div className="cc-dt">
      <section className="cc-dt-block">
        <h3>Lane</h3>
        <Lane lane={lane} />
      </section>
      <section className="cc-dt-block">
        <h3>
          Steps
          {worst && (
            <span className={`cc-dt-overall cc-sv-text-${worst}`}>
              {issues > 0 ? `${issues} of ${steps.length} need attention` : WORDING[worst]}
            </span>
          )}
        </h3>
        <ol className="cc-dt-steps">
          {steps.map((result, i) => (
            <Step
              key={result.area.id}
              result={result}
              number={i + 1}
              open={selectedId === result.area.id}
              onToggle={() => onSelect(selectedId === result.area.id ? null : result.area.id)}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
