/*
 * store-layout/index.js: one store's checks and drive-thru cars, kept up to date, for the store
 * view (store-view/use-store-status.js). The numbers come from the data layer (data/index.js).
 */
import { useEffect, useState } from 'react';

import { fetchCars, fetchStoreChecks } from '../data';
import { REFRESH_MS, CAR_REFRESH_MS } from './config';
import { levelFor } from './status';
import { typicalVisitMs, carsInLane } from './cars';
import { repeatWhileShowing } from './visibility';

/*
 * Keeps an up-to-date list of the cars in the lane.
 * Returns { queue, visitMs, measured, failed }:
 *   queue    cars in the lane right now, front first, or null before the first answer
 *   visitMs  the typical length of a visit
 */
export function useLaneCars(storeId) {
  const [state, setState] = useState({ queue: null, visitMs: 0, measured: false, failed: false });

  useEffect(() => {
    let cancelled = false;
    if (!storeId) {
      setState({ queue: null, visitMs: 0, measured: false, failed: false });
      return undefined;
    }
    let busy = false;
    const load = () => {
      if (busy) return;
      busy = true;
      fetchCars(storeId)
        .then((cars) => {
          if (cancelled) return;
          const visitMs = typicalVisitMs(cars);
          const queue = carsInLane(cars, Date.now(), visitMs);
          const measured = cars.some((car) => !car.inLane);
          // Only redraw when something actually changed (the same cars are usually still there).
          const signature = `${queue.map((car) => car.key).join(',')}|${Math.round(visitMs / 1000)}|${measured}`;
          setState((before) => (before.signature === signature && !before.failed ? before : { queue, visitMs, measured, failed: false, signature }));
        })
        .catch(() => !cancelled && setState({ queue: [], visitMs: 0, measured: false, failed: true }))
        .finally(() => { busy = false; });
    };
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, CAR_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [storeId]);

  return state;
}

/*
 * Loads every check's number now and then again every REFRESH_MS.
 * Returns { answers, failed, updatedAt }.
 *   answers  { checkId: { level, value, missing } }, or null before the first answer.
 *            We never show green before we actually know.
 *   failed   true when the checks could not be loaded at all.
 */
export function useAnswers(checks, storeId) {
  const [state, setState] = useState({ answers: null, failed: false, updatedAt: null });
  const fingerprint = JSON.stringify([storeId, checks.map((c) => [c.id, c.direction, c.criticalAt, c.warningAt])]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchStoreChecks(storeId)
        .then((values) => {
          if (cancelled) return;
          const answers = {};
          checks.forEach((check) => {
            const value = values[check.id] === undefined ? null : values[check.id];
            const reply = { value, failed: false };
            answers[check.id] = { level: levelFor(reply, check), value, missing: value === null };
          });
          setState({ answers, failed: false, updatedAt: new Date() });
        })
        .catch(() => !cancelled && setState({ answers: null, failed: true, updatedAt: null }));

    setState({ answers: null, failed: false, updatedAt: null });
    const repeat = repeatWhileShowing(load, REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

// " (yellow at 1 or more)": why this number turned the dot yellow or red.
export function thresholdNote(check, level) {
  const threshold = level === 'outage' ? check.criticalAt : check.warningAt;
  if (threshold === null || threshold === undefined) return '';
  return ` (${level === 'outage' ? 'red' : 'yellow'} at ${threshold} ${check.direction === 'below' ? 'or less' : 'or more'})`;
}
