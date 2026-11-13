/*
 * segments.js: McDonald's three reporting segments (U.S., IOM, IDL & Corporate), the countries in
 * each, and the numbers on the Global page: its three cards (Availability, Throughput,
 * Experience / quality) and each segment's card on the map.
 *
 * The numbers are the examples from the Archy observability demo
 * (Archy_Dashboard_Demo_2026.10.28 v1.html, its Global view), not live data: SAMPLE_DATA marks
 * them as such on the page. Swap in real figures when they exist.
 *
 * What the app shows for each segment is liveSegments (at the end), not these numbers: the U.S.
 * is live where there is data (the NEXT stores' numbers from the overview, widgets.js
 * OVERVIEW, and the map); IOM and IDL & Corporate have no data, so a dash for every number and
 * Critical, rather than the demo's figures.
 */
import { OVERVIEW } from './widgets';
import { change, percentText } from './overview-data';

export const SAMPLE_DATA = true;

/** ok · warn · crit, the demo's three statuses, with its words for them. */
export const SEGMENT_STATUS = {
  ok: { label: 'Healthy', palette: 'healthy' },
  warn: { label: 'Degraded', palette: 'warning' },
  crit: { label: 'Critical', palette: 'critical' },
};

/** The status's colour in grafana's theme (theme.palette.location), as on its service layer. */
export function statusColor(theme, status) {
  const entry = SEGMENT_STATUS[status];
  return entry ? theme.palette.location[entry.palette] : theme.palette.location.unmanaged;
}

/** The Global page's three cards: can a customer order food? */
export const GLOBAL_KPIS = [
  { key: 'availability', label: 'Availability', value: '97.8%', status: 'warn', sub: 'Archy operational uptime %' },
  { key: 'throughput', label: 'Throughput', value: '−3%', status: 'warn', sub: 'POS sales vs. expected (benchmark for this time of day and weekday)' },
  { key: 'experience', label: 'Experience / quality', value: '93.8%', status: 'warn', sub: 'Automation rate' },
];

export const SEGMENTS = [
  {
    id: 'us',
    name: 'U.S.',
    sub: '13,557 restaurants · 50 states',
    status: 'warn',
    restaurants: 13557,
    availability: { value: '97.8%', status: 'warn' },
    throughput: { value: '−3%', status: 'warn' },
    escalation: { value: '6.2%', status: 'warn' },
    countries: 'United States',
    // Where the map looks on the segment's page when it has no stores to zoom to (the mainland).
    bounds: { south: 24, west: -125, north: 50, east: -66 },
    detail: '95% franchised. Largest single market. Midwest degraded.',
  },
  {
    id: 'iom',
    name: 'IOM',
    sub: '10,512 restaurants · 19 countries',
    status: 'ok',
    restaurants: 10512,
    availability: { value: '99.1%', status: 'ok' },
    throughput: { value: '+1%', status: 'ok' },
    escalation: { value: '4.9%', status: 'ok' },
    bounds: { south: -47, west: -130, north: 66, east: 178 },
    countries: 'AU · AT · BE · CA · CZ · FR · DE · IE · IT · LU · NL · NZ · PL · PT · SK · ES · CH · UK · UA',
    detail: 'International Operated Markets. 89% franchised.',
  },
  {
    id: 'idl',
    name: 'IDL & Corporate',
    sub: '19,408 restaurants · 95+ markets',
    status: 'ok',
    restaurants: 19408,
    availability: { value: '98.6%', status: 'ok' },
    throughput: { value: '+2%', status: 'ok' },
    escalation: { value: '5.1%', status: 'ok' },
    bounds: { south: -50, west: -110, north: 55, east: 150 },
    countries: 'China · Japan · India · Philippines · S. Korea · Malaysia · Indonesia + LATAM · Middle East · Africa · 95 other markets',
    detail: 'International Developmental Licensed + ~2,045 company-operated. 99% franchised. One combined reporting segment.',
  },
];

export function findSegment(id) {
  return SEGMENTS.find((segment) => segment.id === id) || null;
}

// Countries by their name in the map's GeoJSON (src/shared/const/geojson.json). Every country
// not named here, nor in NO_RESTAURANTS, is in IDL & Corporate.
const US_COUNTRIES = ['United States of America'];
const IOM_COUNTRIES = [
  'Australia', 'Austria', 'Belgium', 'Canada', 'Czech Republic', 'France', 'Germany', 'Ireland', 'Italy', 'Luxembourg',
  'Netherlands', 'New Zealand', 'Poland', 'Portugal', 'Slovakia', 'Spain', 'Switzerland', 'United Kingdom', 'Ukraine',
];
// Left uncoloured: no McDonald's restaurants (approximate; the map only needs to look right).
const NO_RESTAURANTS = [
  'Antarctica', 'French Southern and Antarctic Lands', 'Greenland', 'Russia', 'Belarus', 'Kazakhstan', 'Iran', 'North Korea',
];

/** The segment id of a country in the map's GeoJSON, by its name; null for none. */
export function segmentOfCountry(name) {
  if (!name || NO_RESTAURANTS.includes(name)) return null;
  if (US_COUNTRIES.includes(name)) return 'us';
  if (IOM_COUNTRIES.includes(name)) return 'iom';
  return 'idl';
}

// Store countries as the map's data gives them (a code or a name). Empty means the US, as for
// the agents (window.__rmDefaultCountry, index.js).
const IOM_CODES = ['AU', 'AT', 'BE', 'CA', 'CZ', 'FR', 'DE', 'IE', 'IT', 'LU', 'NL', 'NZ', 'PL', 'PT', 'SK', 'ES', 'CH', 'GB', 'UK', 'UA'];

/** The segment id of a store, from its country. */
export function segmentOfStore(store) {
  const country = String((store && store.country) || '').trim();
  if (!country) return 'us';
  const code = country.toUpperCase();
  if (code === 'US' || code === 'USA' || code === 'UNITED STATES') return 'us';
  if (IOM_CODES.includes(code)) return 'iom';
  return segmentOfCountry(country) || 'idl';
}

// ---------------------------------------------------------------------------
// The U.S. card's live numbers. Only the NEXT stores report, so they stand for the segment:
//   availability  the lower of the overview's infrastructure parts (edge nodes, GRNT), last 7 days,
//                 in its colours (OVERVIEW.availability goodAt / warnAt)
//   throughput    Archy orders completed in the last hour against the same hour a week before
//   esc. rate     no data yet: a dash
//   stores        the NEXT stores in the U.S. on the map
// The card's status is the worse of availability and throughput. Each number's sub says what it
// is, for the cards at the top of the segment's page (SegmentPage.js, SegmentKpis).
// ---------------------------------------------------------------------------
const THROUGHPUT_WARN_BELOW = 0; // a drop of any size is Degraded
const THROUGHPUT_CRIT_BELOW = -0.1; // more than 10% fewer orders is Critical
const STATUS_ORDER = ['ok', 'warn', 'crit'];

function liveAvailability(parts) {
  const values = (parts || []).filter((part) => part.status === 'ok' && Number.isFinite(part.value)).map((part) => part.value);
  const sub = 'Infrastructure (edge nodes, GRNT), NEXT stores, last 7 days';
  if (!values.length) return { value: '–', status: null, sub };
  const lowest = Math.min(...values);
  const { goodAt, warnAt } = OVERVIEW.availability;
  return { value: percentText(lowest), status: lowest >= goodAt ? 'ok' : lowest >= warnAt ? 'warn' : 'crit', sub };
}

function liveThroughput(orders) {
  const ratio = orders && orders.status === 'ok' ? change(orders.current, orders.previous) : null;
  const sub = 'Archy orders, last hour vs. a week ago, NEXT stores';
  if (ratio === null) return { value: '–', status: null, sub };
  const percent = Math.round(ratio * 100);
  return {
    value: `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${Math.abs(percent)}%`,
    status: ratio < THROUGHPUT_CRIT_BELOW ? 'crit' : ratio < THROUGHPUT_WARN_BELOW ? 'warn' : 'ok',
    sub,
  };
}

// A segment with no data (IOM, IDL & Corporate): a dash for every number, and Critical.
const NO_DATA = { value: '–', status: null, sub: 'No data yet' };

/**
 * The segments as the app shows them: the U.S. with its live numbers (live: true; status null
 * while no live number has come back yet), the others with none (noData: true).
 * overview: useOverview's answer; stores: the stores on the map, null while it loads.
 */
export function liveSegments({ overview, stores }) {
  return SEGMENTS.map((segment) => {
    if (segment.id !== 'us') {
      return { ...segment, noData: true, status: 'crit', availability: NO_DATA, throughput: NO_DATA, escalation: NO_DATA, storesValue: '–' };
    }
    const availability = liveAvailability(overview && overview.parts);
    const throughput = liveThroughput(overview && overview.orders);
    const statuses = [availability.status, throughput.status].filter(Boolean);
    const count = stores ? stores.filter((store) => segmentOfStore(store) === 'us').length : null;
    return {
      ...segment,
      live: true,
      status: statuses.length ? STATUS_ORDER[Math.max(...statuses.map((status) => STATUS_ORDER.indexOf(status)))] : null,
      availability,
      throughput,
      escalation: { value: '–', status: null, note: 'No data yet', sub: 'No data yet' },
      storesLabel: 'NEXT stores',
      storesValue: count === null ? '–' : count.toLocaleString(),
    };
  });
}
