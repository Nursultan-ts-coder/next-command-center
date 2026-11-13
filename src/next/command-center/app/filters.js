/*
 * filters.js: the page filters every page shares (the "common filters" of
 * grafana-restraurant-custom-widgets). For now that is the time zone: the order charts count
 * "today" in it. A time range filter is left out because every widget keeps its own
 * time window (its SINCE).
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ccTimeZone';

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    return 'UTC';
  }
}

// Every NEXT store is in the US, so the US zones (and UTC), with this browser's own first.
const US_TIME_ZONES = [
  ['America/New_York', 'Eastern (New York)'],
  ['America/Chicago', 'Central (Chicago)'],
  ['America/Denver', 'Mountain (Denver)'],
  ['America/Phoenix', 'Arizona (Phoenix)'],
  ['America/Los_Angeles', 'Pacific (Los Angeles)'],
  ['America/Anchorage', 'Alaska (Anchorage)'],
  ['Pacific/Honolulu', 'Hawaii (Honolulu)'],
  ['UTC', 'UTC'],
];

export function timeZoneOptions() {
  const own = browserTimeZone();
  const known = US_TIME_ZONES.find(([key]) => key === own);
  const first = [own, `${known ? known[1] : own} · this browser`];
  return [first, ...US_TIME_ZONES.filter(([key]) => key !== own)];
}

/** { timeZone, setTimeZone }: remembered in this browser. */
export function useTimeZoneFilter() {
  const [timeZone, setTimeZone] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || browserTimeZone();
    } catch (error) {
      return browserTimeZone();
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, timeZone); } catch (error) { /* not remembered, still works now */ }
  }, [timeZone]);
  return { timeZone, setTimeZone };
}
