/*
 * data/index.js: where every number on the page comes from.
 *
 * Each function answers one widget's question with a promise, in the shape that widget draws.
 * For now they serve realistic mock data worked out from data/mock-stores.js and the clock (the
 * same for every viewer, moving a little from minute to minute). To go live, replace a
 * function's body with a call to a real source (a Grafana data source, or the plugin's backend
 * under /api/plugins/<plugin id>/resources) and keep its answer's shape.
 */
import { MOCK_STORES, findMockStore, pad5 } from './mock-stores';

// ---------------------------------------------------------------------------
// Helpers: steady pseudo-random numbers (the same seed always gives the same number).
// ---------------------------------------------------------------------------
function hash(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A number from 0 to 1 for this seed. */
export function noise(...seed) {
  let t = hash(seed.join('|')) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const between = (low, high, ...seed) => low + (high - low) * noise(...seed);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const minuteSlot = (now) => Math.floor(now / MINUTE);

// A short wait, so loading states show as they would with a real source.
const answer = (value, ms = 120 + Math.random() * 280) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

const storesFor = (storeId) => {
  const one = storeId ? findMockStore(storeId) : null;
  return one ? [one] : storeId ? [] : MOCK_STORES;
};

// How busy a restaurant is at a time of day (local time): breakfast, lunch and dinner peaks.
function rush(ms) {
  const at = new Date(ms);
  const hour = at.getHours() + at.getMinutes() / 60;
  const peak = (centre, width, height) => height * Math.exp(-((hour - centre) ** 2) / (2 * width * width));
  return 0.12 + peak(8, 1.2, 0.55) + peak(12.5, 1.1, 1) + peak(18, 1.4, 0.8) + (hour >= 22 || hour < 5 ? -0.06 : 0);
}

// Time slots of `size` ms covering the last `span` ms, oldest first: [{ start, end }].
function slots(now, span, size) {
  const last = Math.floor(now / size) * size;
  const list = [];
  for (let start = last - span + size; start <= last; start += size) list.push({ start, end: start + size });
  return list;
}

// ---------------------------------------------------------------------------
// The map: every store with its numbers, one per row of its pop-up.
// ---------------------------------------------------------------------------

/** The map's settings: what each pop-up row is called and the rules that colour a pin. */
export const MAP_SETTINGS = {
  mapTitle: 'NEXT stores',
  keyColumn: 'national_store_number',
  query2Label: 'Edge Node Availability',
  query2WarningThreshold: 2,
  query2CriticalThreshold: 1,
  query2Direction: 'below',
  query3Label: 'Gateways Up',
  query3WarningThreshold: 1,
  query3CriticalThreshold: 0,
  query3Direction: 'below',
  query4Label: 'Open Incidents',
  query4WarningThreshold: 1,
  query4CriticalThreshold: 3,
  query4Direction: 'above',
  query5Label: 'ServiceNow Changes',
  query6Label: 'Archy Orders (last hour)',
  query6WarningThreshold: 10,
  query6CriticalThreshold: 0,
  query6Direction: 'below',
  normalColor: '#17b84a',
  warningColor: '#f5c400',
  criticalColor: '#e5231b',
  noDataColor: '#1e88f0',
  initialLat: 39.8283,
  initialLng: -98.5795,
  initialZoom: 4,
};

// Archy orders a store completed in the hour before `now`.
function ordersLastHour(store, now) {
  if (store.offline) return 0;
  return Math.round(store.busy * 70 * rush(now - 30 * MINUTE) * between(0.85, 1.15, store.key, 'orders-hour', minuteSlot(now)));
}

/** [{ key, lat, lng, label, country, metrics: { m1 … m5 } }], m1 … m5 in MAP_SETTINGS' row order. */
export function fetchMapStores(now = Date.now()) {
  return answer(
    MOCK_STORES.map((store) => ({
      key: store.key,
      lat: store.lat,
      lng: store.lng,
      label: store.label,
      country: store.country,
      metrics: {
        m1: store.edgeUp,
        m2: store.gatewaysUp,
        m3: store.incidents,
        m4: store.changes,
        m5: ordersLastHour(store, now),
      },
    })),
  );
}

// ---------------------------------------------------------------------------
// The lists under a pop-up row (widgets.js ROW_DETAILS), by part id:
// { byStore: { '844': [{ name, note }] }, seenByStore } (seen: over the last 7 days).
// ---------------------------------------------------------------------------
const mac = (...seed) => Array.from({ length: 6 }, (_, i) => Math.floor(noise(...seed, i) * 256).toString(16).padStart(2, '0')).join(':');
const LAN_NETWORKS = ['CORE_VLAN410', 'CREW_VLAN451', 'GUEST_VLAN460', 'KVS_VLAN420', 'KIOSK_VLAN421', 'POS_VLAN422', 'DT_VLAN430', 'IOT_VLAN440', 'MGMT_VLAN400', 'VOICE_VLAN450', 'CAMERA_VLAN470'];

function storeDevices(store) {
  const id = pad5(store.key);
  const edge = [1, 2, 3].map((n) => ({ name: `us${id}cls01-node-${n}`, note: '' }));
  const gateways = [1, 2].map((n) => ({ name: `US${id}FW0${n}`, note: mac(store.key, 'fw', n) }));
  const switches = Array.from({ length: store.switches }, (_, i) => ({ name: mac(store.key, 'sw', i), note: `US${id}SW0${i + 1}` }));
  const aps = [1, 2, 3, 4].map((n) => ({ name: `US${id}IAP0${n}`, note: mac(store.key, 'ap', n) }));
  return { edge, gateways, switches, aps };
}

export function fetchRowDetail(partId) {
  const byStore = {};
  const seenByStore = {};
  MOCK_STORES.forEach((store) => {
    const devices = storeDevices(store);
    let now = [];
    let seen = null;
    if (partId === 'edge-nodes') now = devices.edge.slice(0, store.edgeUp);
    if (partId === 'gateways') now = devices.gateways.slice(0, store.gatewaysUp);
    if (partId === 'switches') {
      seen = devices.switches;
      now = devices.switches.slice(store.switchesDown);
    }
    if (partId === 'access-points') now = devices.aps.slice(store.apsDown);
    if (partId === 'lan') now = store.offline ? [] : LAN_NETWORKS.map((name) => ({ name, note: '' }));
    byStore[store.key] = now.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (seen) seenByStore[store.key] = seen;
  });
  return answer({ byStore, seenByStore });
}

// ---------------------------------------------------------------------------
// The store view: the value of every check for one store (store-layout/config.js STORE_CHECKS).
// { checkId: number }. A check a store breaks takes its value from the store's problems.
// ---------------------------------------------------------------------------
const HEALTHY_VALUES = {
  'edge-down': () => 0,
  'gateway-down': () => 0,
  'payment-errors': (seed) => Math.round(between(0, 3, seed)),
  'archy-escalations': (seed) => Math.round(between(0, 2, seed)),
  'vehicle-detection': () => 0,
  'fryer-alarms': () => 0,
  'grill-offline': () => 0,
  'cooler-temp': (seed) => Number(between(35, 38.5, seed).toFixed(1)),
  'freezer-temp': (seed) => Number(between(-4, 1, seed).toFixed(1)),
  'beverage-faults': () => 0,
  'mobile-handoff': (seed) => Math.round(between(0, 2, seed)),
  'kitchen-printer': () => 0,
  'confirm-latency': (seed) => Number(between(1.4, 3.2, seed).toFixed(1)),
  'cloud-backlog': (seed) => Math.round(between(0, 30, seed)),
};

export function fetchStoreChecks(storeId, now = Date.now()) {
  const store = findMockStore(storeId);
  const values = {};
  Object.keys(HEALTHY_VALUES).forEach((id) => {
    if (!store) values[id] = null;
    else if (id in store.problems) values[id] = store.problems[id];
    else values[id] = HEALTHY_VALUES[id](`${store.key}|${id}|${Math.floor(now / (5 * MINUTE))}`);
  });
  return answer(values, 150);
}

// ---------------------------------------------------------------------------
// Drive-thru cars for one store: [{ key, arrival, departure, inLane }], oldest first.
// One arrives every minute or two (more at rush hour) and stays two to five minutes.
// ---------------------------------------------------------------------------
export function fetchCars(storeId, now = Date.now()) {
  const store = findMockStore(storeId);
  if (!store) return answer([], 100);
  const every = Math.max(35, Math.round(110 / (store.busy * Math.max(0.35, rush(now))))) * 1000;
  const cars = [];
  const latest = Math.floor(now / every);
  for (let n = latest - 40; n <= latest; n += 1) {
    if (noise(store.key, 'car-skip', n) < 0.15) continue; // eslint-disable-line no-continue
    const arrival = n * every + Math.round(noise(store.key, 'car-at', n) * every * 0.6);
    if (arrival > now) continue; // eslint-disable-line no-continue
    const stay = Math.round(between(130, 300, store.key, 'car-stay', n) * 1000);
    const left = arrival + stay <= now;
    cars.push({ key: `${store.key}-${n}`, arrival, departure: left ? arrival + stay : null, inLane: !left });
  }
  return answer(cars, 100);
}

// ---------------------------------------------------------------------------
// ServiceNow incidents and cases: [{ id, title, number, opened }], newest first.
// ---------------------------------------------------------------------------
const INCIDENT_TITLES = [
  'Edge node not responding: kitchen screens not receiving orders',
  'Drive-thru speaker post: Archy dropping orders, crew took over',
  'POS register 3 cannot reach payment gateway',
  'Store network down: both firewall gateways offline',
  'Kiosk 2 frozen on payment screen',
  'Mobile order pickup screen blank',
  'Fryer vat 2 temperature alarm',
];
const CASE_TITLES = [
  'Request: replace damaged drive-thru headset',
  'Wi-Fi access point keeps rebooting near the lobby',
  'Menu board price mismatch for Big Mac meal',
  'Follow-up: switch replacement scheduled',
  'Crew reports slow KVS bump bar response',
];

function records(store, kind, now) {
  const count = kind === 'incident' ? store.incidents : store.cases;
  const titles = kind === 'incident' ? INCIDENT_TITLES : CASE_TITLES;
  const prefix = kind === 'incident' ? 'INC' : 'CS';
  return Array.from({ length: count }, (_, i) => {
    const seed = hash(`${store.key}|${kind}|${i}`);
    const number = `${prefix}${String(1200000 + (seed % 800000)).padStart(7, '0')}`;
    let title = titles[seed % titles.length];
    if (store.offline && kind === 'incident' && i === 0) title = INCIDENT_TITLES[3];
    if (store.edgeUp < 3 && kind === 'incident' && i === 0) title = INCIDENT_TITLES[0];
    const opened = now - Math.round(between(0.3, 20, store.key, kind, i) * HOUR);
    return { id: number, title, number, opened };
  }).sort((a, b) => b.opened - a.opened);
}

/** kind: 'incident' or 'case'. */
export function fetchRecords(kind, storeId, now = Date.now()) {
  const store = findMockStore(storeId);
  return answer(store ? records(store, kind, now) : []);
}

/** How many incidents (or cases) were opened in the last 24 hours, all stores. */
export function fetchOpenedCount(kind) {
  return answer(MOCK_STORES.reduce((sum, store) => sum + (kind === 'incident' ? store.incidents : store.cases), 0));
}

// ---------------------------------------------------------------------------
// Charts (widgets.js CHARTS): { buckets: [{ start, end }], bySeries: { name: [value per slot] } }.
// Count charts have one series per store; 'lines' charts one per service, as fractions.
// ---------------------------------------------------------------------------
const CHART_SHAPES = {
  kiosk: { perSlot: 9 },
  '3po': { perSlot: 4 },
  gma: { perSlot: 5 },
  delivery: { perSlot: 6, size: 5 * MINUTE },
  'roa-cancelled': { perSlot: 0.35, size: 30 * MINUTE },
};
const SERVICES = {
  'submit-failures': { DoorDash: 0.021, 'Uber Eats': 0.034, Grubhub: 0.012, GMA: 0.008, Kiosk: 0.004 },
  'release-failures': { DoorDash: 0.011, 'Uber Eats': 0.006, Grubhub: 0.018, GMA: 0.003 },
};

export function fetchChartSeries(chartId, now = Date.now()) {
  const services = SERVICES[chartId];
  if (services) {
    const buckets = slots(now, 6 * HOUR, 15 * MINUTE);
    const bySeries = {};
    Object.keys(services).forEach((name) => {
      bySeries[name] = buckets.map((bucket, i) => {
        const spike = noise(chartId, name, 'spike', bucket.start) > 0.93 ? between(2, 4, chartId, name, i) : 1;
        return Number((services[name] * between(0.6, 1.4, chartId, name, bucket.start) * spike).toFixed(4));
      });
    });
    return answer({ buckets, bySeries });
  }
  const shape = CHART_SHAPES[chartId] || { perSlot: 1 };
  const size = shape.size || 15 * MINUTE;
  const buckets = slots(now, 6 * HOUR, size);
  const bySeries = {};
  MOCK_STORES.forEach((store) => {
    bySeries[store.key] = buckets.map((bucket) => {
      if (store.offline && bucket.start > now - 2 * HOUR) return 0;
      const mean = shape.perSlot * store.busy * rush(bucket.start) * (size / (15 * MINUTE));
      const value = Math.round(mean * between(0.6, 1.4, chartId, store.key, bucket.start));
      return bucket.end > now ? Math.round(value * ((now - bucket.start) / size)) : value; // the newest slot is still filling
    });
  });
  return answer({ buckets, bySeries }, 300 + Math.random() * 500);
}

// ---------------------------------------------------------------------------
// The overview cards (widgets.js OVERVIEW), all NEXT stores.
//   orders        { current, previous }: the last hour, and the same hour a week ago
//   drive         { average, today }: seconds from greeting to order completed, week and today
//   availability  { edge, grnt }: % of the last 7 days
// ---------------------------------------------------------------------------
export function fetchOverview(now = Date.now()) {
  const current = MOCK_STORES.reduce((sum, store) => sum + ordersLastHour(store, now), 0);
  const previous = Math.round(current * between(0.95, 1.06, 'orders-week', Math.floor(now / HOUR)));
  return answer(
    {
      orders: { current, previous },
      drive: { average: Math.round(between(204, 218, 'dt-week', Math.floor(now / HOUR))), today: Math.round(between(196, 232, 'dt-today', Math.floor(now / (10 * MINUTE)))) },
      availability: { edge: 99.82, grnt: 99.94 },
    },
    400 + Math.random() * 600,
  );
}

// ---------------------------------------------------------------------------
// Archy ordered items, today: [{ id, time, items: [{ qty, text, size, name }] }], newest first.
// storeId '' = every NEXT store.
// ---------------------------------------------------------------------------
const BREAKFAST_MENU = ['Egg McMuffin', 'Sausage McMuffin w/ Egg', 'Hotcakes', 'Hash Brown', 'Sausage Biscuit', 'Bacon Egg Cheese McGriddle', 'Big Breakfast', 'Breakfast Burrito', 'Premium Roast Coffee', 'Orange Juice', 'Iced Coffee'];
const REGULAR_MENU = ['Big Mac', 'Quarter Pounder w/ Cheese', 'McDouble', 'Cheeseburger', 'McChicken', 'McCrispy', '10 pc Chicken McNuggets', 'Filet-O-Fish', 'Fries', 'Coca-Cola', 'Diet Coke', 'Sprite', 'Dr Pepper', 'Sweet Tea', 'McFlurry Oreo', 'Vanilla Shake', 'Apple Pie', 'Iced Coffee', 'Latte'];
const SIZED = /fries|coke|coca|sprite|pepper|tea|coffee|juice|latte|shake/i;
const SIZES = ['S', 'M', 'M', 'L'];

function ordersOf(store, now, breakfastEnds) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const [h, m] = String(breakfastEnds || '10:30').split(':').map(Number);
  const breakfastUntil = midnight.getTime() + (h * 60 + m) * MINUTE;
  const opens = midnight.getTime() + 5 * HOUR;
  const orders = [];
  if (store.offline) return orders;
  for (let at = opens; at < now; at += 4 * MINUTE) {
    const many = Math.round(rush(at) * store.busy * between(0.5, 1.6, store.key, 'menu-n', at));
    for (let n = 0; n < many; n += 1) {
      const time = at + Math.round(noise(store.key, 'menu-t', at, n) * 4 * MINUTE);
      if (time > now) continue; // eslint-disable-line no-continue
      const menu = time < breakfastUntil ? BREAKFAST_MENU : REGULAR_MENU;
      const lines = 1 + Math.floor(noise(store.key, 'menu-lines', time) * 4);
      const items = Array.from({ length: lines }, (_, i) => {
        const name = menu[Math.floor(noise(store.key, 'menu-item', time, i) * menu.length)];
        const qty = noise(store.key, 'menu-qty', time, i) > 0.82 ? 2 : 1;
        const size = SIZED.test(name) ? SIZES[Math.floor(noise(store.key, 'menu-size', time, i) * SIZES.length)] : '';
        return { qty, text: size ? `${size} ${name}` : name, size, name };
      });
      orders.push({ id: `${pad5(store.key)}-${time.toString(36)}-${n}`, time, items });
    }
  }
  return orders;
}

export function fetchMenuOrders(storeId, breakfastEnds, now = Date.now()) {
  const orders = storesFor(storeId).reduce((all, store) => all.concat(ordersOf(store, now, breakfastEnds)), []);
  orders.sort((a, b) => b.time - a.time);
  return answer(orders, 300);
}

// ---------------------------------------------------------------------------
// The Network tab, one store:
//   edge, devices  { buckets, bySeries: { device: [value per 5-minute slot] } } (0 = no report)
//   dhcp           [{ name, used, total }]
//   wifi           { buckets, tx: { ap: [%] }, rx: { ap: [%] } } per 10-minute slot
// ---------------------------------------------------------------------------
export function fetchNetwork(storeId, now = Date.now()) {
  const store = findMockStore(storeId);
  if (!store) return answer({ edge: { buckets: [], bySeries: {} }, devices: { buckets: [], bySeries: {} }, dhcp: [], wifi: { buckets: [], tx: {}, rx: {} } });
  const id = pad5(store.key);
  const five = slots(now, 6 * HOUR, 5 * MINUTE);
  const ten = slots(now, 6 * HOUR, 10 * MINUTE);
  // A device that is down stopped reporting a while ago; the others report in nearly every slot.
  const strip = (name, down, perSlot) => five.map((bucket, i) => {
    const wentDown = now - between(40, 150, store.key, name, 'down') * MINUTE;
    if (down && bucket.start >= wentDown) return 0;
    if (noise(store.key, name, 'gap', i) > 0.985) return 0;
    return Math.round(perSlot * between(0.9, 1.1, store.key, name, i));
  });

  const edge = { buckets: five, bySeries: {} };
  [1, 2, 3].forEach((n) => { edge.bySeries[`us${id}cls01-node-${n}`] = strip(`edge${n}`, n > store.edgeUp, 1); });

  const devices = { buckets: five, bySeries: {} };
  [1, 2].forEach((n) => { devices.bySeries[`US${id}FW0${n}`] = strip(`fw${n}`, n > store.gatewaysUp, 30); });
  for (let n = 1; n <= store.switches; n += 1) devices.bySeries[`US${id}SW0${n}`] = strip(`sw${n}`, n <= store.switchesDown || store.offline, 30);

  const dhcp = LAN_NETWORKS.map((name) => {
    const total = /CORE|MGMT/.test(name) ? 62 : /GUEST|CREW/.test(name) ? 254 : 126;
    const share = /GUEST/.test(name) ? between(0.55, 0.88, store.key, name) : between(0.12, 0.6, store.key, name);
    return { name, used: store.offline ? 0 : Math.round(total * share), total };
  });

  const wifi = { buckets: ten, tx: {}, rx: {} };
  [1, 2, 3, 4].forEach((n) => {
    const name = `US${id}IAP0${n}`;
    const down = n <= store.apsDown;
    const base = n === 3 ? 9 : between(2, 6, store.key, name);
    wifi.tx[name] = ten.map((bucket, i) => (down && i > ten.length - 8 ? null : Number((base * between(0.7, 1.5, store.key, name, 'tx', i)).toFixed(2))));
    wifi.rx[name] = ten.map((bucket, i) => (down && i > ten.length - 8 ? null : Number((base * 0.7 * between(0.7, 1.5, store.key, name, 'rx', i)).toFixed(2))));
  });

  return answer({ edge, devices, dhcp, wifi }, 250);
}
