/*
 * config.js: the store view's text, areas and checks.
 *
 *   1. WORDING       the text people see
 *   2. AREAS         the dots on the picture
 *   3. STORE_CHECKS  the checks behind the dots; their numbers come from the data layer
 *                    (data/index.js, fetchStoreChecks)
 */

// ---------------------------------------------------------------------------
// 1. WORDING: change any text on the right-hand side.
// ---------------------------------------------------------------------------
export const WORDING = {
  // Status shown in the pop-up
  outage: 'Outage / impacted',
  degraded: 'Degraded',
  healthy: 'Healthy',
  unmonitored: 'Not monitored',
  unknown: 'No data',

  // Small strip in the bottom-left corner
  summaryOutage: 'impacted',
  summaryDegraded: 'degraded',
  summaryHealthy: 'healthy',
  allStores: 'All stores',
  storePrefix: 'Store',
  carsInLane: 'in lane',
  carsTypical: 'typical visit',
  carsFailed: "Couldn't load car data.",

  // Notes inside the pop-up
  causedBy: 'Caused by',
  dependsOn: 'Depends on',
  currentValue: 'Current value',
  noChecks: 'No checks are linked to this area.',
  noData: 'No answer yet from',
  loadFailed: "Couldn't load the checks. Retrying every minute.",
  loading: 'Loading checks…',
  unnamedCheck: 'Check',
};

// ---------------------------------------------------------------------------
// 2. AREAS: one dot each.
//    short  the name you type in a check's "Impacted areas" box
//    name   the full name shown in the pop-up
//    also   optional: other names that should still work in that box
//    x, y   position as a percentage of the picture (x: 0 left to 100 right,
//           y: 0 top to 100 bottom)
//    label  optional: the name drawn on the picture (see SHOW_AREA_LABELS below)
//    Delete a line to remove that dot.
// ---------------------------------------------------------------------------
export const AREAS = [
  // Kitchen
  { id: 'fryers', short: 'Fryers', name: 'Fryers', group: 'Kitchen', x: 26.65, y: 29.09, label: { text: 'Fryers', w: 4.08, h: 2.15, y: 30.18 } },
  { id: 'grill', short: 'Grill', name: 'Grill', group: 'Kitchen', x: 48.72, y: 31.44, label: { text: 'Grill', w: 3.3, h: 2.15, y: 32.52 } },
  { id: 'kvs', short: 'KVS', name: 'KVS (kitchen order monitors)', group: 'Kitchen', x: 44.89, y: 19.67, label: { text: 'KVS', w: 2.82, h: 2.21, y: 20.7 } },
  { id: 'oat', short: 'OAT', name: 'Order Assembly Table (OAT)', group: 'Kitchen', x: 27.24, y: 45.1, label: { text: 'Order assembly (OAT)', w: 10.37, h: 2.41, y: 46.26 } },
  { id: 'kitchen', short: 'Kitchen', name: 'Kitchen (prep line)', group: 'Kitchen', x: 38.09, y: 35.06, label: { text: 'Kitchen', w: 5.56, h: 2.86, y: 36.39 } },
  { id: 'beverage', short: 'Beverage', also: ['Shake', 'Dessert'], name: 'Beverage / Shake', group: 'Kitchen', x: 49.87, y: 34.96, label: { text: 'Beverage /\nShake', w: 6.21, h: 4.69, y: 37.24 } },
  { id: 'cooler', short: 'Cooler', name: 'Walk-in cooler', group: 'Kitchen', x: 31.64, y: 19.92 },
  { id: 'freezer', short: 'Freezer', name: 'Walk-in freezer', group: 'Kitchen', x: 37.89, y: 21.68 },

  // Front of house
  { id: 'front-counter', short: 'Front counter', name: 'Front counter / POS', group: 'Front of house', x: 31.64, y: 53.91, label: { text: 'Front counter / POS', w: 9.85, h: 2.8, y: 55.24 } },
  { id: 'kiosks', short: 'Kiosks', name: 'Self order kiosks', group: 'Front of house', x: 18.03, y: 41.89, label: { text: 'Self order\nkiosks', w: 6.29, h: 5.27, y: 44.5 } },
  { id: 'mobile-pickup', short: 'Mobile pickup', name: 'Mobile and delivery pickup', group: 'Front of house', x: 54.62, y: 49.32, label: { text: 'Mobile & delivery\npickup', w: 7.42, h: 4.56, y: 51.5 } },

  // Drive-thru (these sit on top of the yellow dots in the picture)
  { id: 'dt-roa', short: 'ROA', name: 'Ready on Arrival (ROA)', group: 'Drive-thru', x: 77.31, y: 82.86 },
  { id: 'dt-vehicle', short: 'Vehicle detection', name: 'Vehicle detection', group: 'Drive-thru', x: 82.52, y: 73.63 },
  { id: 'dt-speaker', short: 'Speaker post', name: 'Speaker post (Archy)', group: 'Drive-thru', x: 83.37, y: 64.16 },
  { id: 'dt-order', short: 'Order confirmed', also: ['Order confirmation', 'Order built'], name: 'Order built and confirmed', group: 'Drive-thru', x: 80.57, y: 54.1 },
  { id: 'dt-help', short: 'Archy escalation', also: ['Archy needs help', 'Archy takeover'], name: 'Archy escalation / takeover', group: 'Drive-thru', x: 81.93, y: 45.07 },
  { id: 'dt-payment', short: 'Payment window', name: 'Payment window', group: 'Drive-thru', x: 82.72, y: 36.33 },
  { id: 'dt-present', short: 'Present window', name: 'Present window', group: 'Drive-thru', x: 83.95, y: 27.1 },
  { id: 'dt-cloud', short: 'Data to cloud', name: 'Data to cloud', group: 'Drive-thru', x: 85.38, y: 16.41 },
];

// Name labels for the areas inside the restaurant. An area with  label: { ... }
// gets a dark label laid exactly over the picture's yellow label, so the yellow
// one is hidden (the picture itself is unchanged). The dot sits at its left end.
//   text  the words shown (\n starts a new line)   w, h  its size (% of the picture's width / height)
//   y     its middle (% from the top); it starts at the area's dot (x)
// Areas without a label (the walk-in cooler and freezer) get a small tag beside the dot.
// The drive-thru steps keep the picture's own large boxes. false hides all labels.
export const SHOW_AREA_LABELS = true;
// Below this width (in pixels) the picture is too small for the labels to fit without
// overlapping, so they are left off and the picture's own labels show instead.
// Enlarge (in the Command Center) always has room for them.
export const LABELS_MIN_WIDTH = 600;

// How often to refresh the checks, in milliseconds (60000 = once a minute).
export const REFRESH_MS = 60000;

// How often to re-check car arrivals and departures (60000 = once a minute).
// A new car shows up within this time.
export const CAR_REFRESH_MS = 60000;

// ---------------------------------------------------------------------------
// 3. STORE_CHECKS: what can go wrong, and which areas it hits.
//    id           the check's number in the data layer (data/index.js, fetchStoreChecks)
//    areas        the areas it hits, by their short names (or "All")
//    message      the sentence shown on each of those areas while it is breached
//    warningAt, criticalAt, direction   'above': high numbers are bad; 'below': low ones
//    With no thresholds, 1 or more is red.
// ---------------------------------------------------------------------------
export const STORE_CHECKS = [
  { id: 'edge-down', name: 'Edge Node Down', areas: 'KVS, OAT, Front counter, Kiosks, Speaker post, Order confirmed', message: 'Edge nodes are down: orders may not reach the kitchen screens.' },
  { id: 'gateway-down', name: 'Primary/Secondary Firewall Gateway', areas: 'Front counter, Kiosks, Payment window, Mobile pickup, Data to cloud', message: 'The store network gateway is not reachable.' },
  { id: 'payment-errors', name: 'Payment gateway errors (15 min)', areas: 'Front counter, Kiosks, Payment window', warningAt: 5, criticalAt: 20, message: 'Card payments are failing.' },
  { id: 'archy-escalations', name: 'Archy escalations (30 min)', areas: 'Archy escalation, Speaker post', warningAt: 3, criticalAt: 8, message: 'Archy is handing many orders to the crew.' },
  { id: 'vehicle-detection', name: 'Vehicle detection offline', areas: 'Vehicle detection, ROA', message: 'Cars are not being detected in the lane.' },
  { id: 'fryer-alarms', name: 'Fryer temperature alarms', areas: 'Fryers', warningAt: 1, criticalAt: 3, message: 'A fryer vat is out of temperature range.' },
  { id: 'grill-offline', name: 'Grill controller offline', areas: 'Grill', message: '' },
  { id: 'cooler-temp', name: 'Walk-in cooler temperature (°F)', areas: 'Cooler', warningAt: 41, criticalAt: 45, message: 'The walk-in cooler is warming up.' },
  { id: 'freezer-temp', name: 'Walk-in freezer temperature (°F)', areas: 'Freezer', warningAt: 5, criticalAt: 10, message: 'The walk-in freezer is warming up.' },
  { id: 'beverage-faults', name: 'Beverage dispenser faults', areas: 'Beverage', warningAt: 1, criticalAt: 2, message: 'A drink or shake dispenser reports a fault.' },
  { id: 'mobile-handoff', name: 'Mobile order handoff errors', areas: 'Mobile pickup', warningAt: 3, criticalAt: 10, message: 'Mobile and delivery orders are not reaching the pickup screen.' },
  { id: 'kitchen-printer', name: 'Kitchen printer offline', areas: 'Kitchen', message: '' },
  { id: 'confirm-latency', name: 'Order confirm latency (s)', areas: 'Order confirmed, Present window', warningAt: 4, criticalAt: 8, message: 'Drive-thru orders take long to confirm.' },
  { id: 'cloud-backlog', name: 'Cloud sync backlog (events)', areas: 'Data to cloud', warningAt: 50, criticalAt: 200, message: 'Store data is not reaching the cloud.' },
];
