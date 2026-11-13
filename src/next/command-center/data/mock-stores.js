/*
 * mock-stores.js: the NEXT stores the mock data describes, and how each one is doing.
 *
 * Every number on the page comes from data/index.js, which works these profiles into the
 * shapes each widget draws. They are made up but realistic: a few stores with problems, most
 * healthy, so every status and every widget has something to show.
 *
 *   edgeUp      edge nodes reporting (of 3)
 *   gatewaysUp  firewall gateways reporting (of 2)
 *   switches    switches the store has; switchesDown how many of them are not reporting
 *   apsDown     Wi-Fi access points not reporting (of 4)
 *   incidents   open ServiceNow incidents, cases: open cases
 *   changes     ServiceNow changes today
 *   busy        how busy the store is (1 = a typical NEXT store)
 *   problems    store view checks that are breached: { checkId: value }
 */

export const MOCK_STORES = [
  {
    key: '844', label: 'Chicago · W Madison St', lat: 41.8817, lng: -87.6466, country: 'US',
    edgeUp: 1, gatewaysUp: 2, switches: 4, switchesDown: 0, apsDown: 1, incidents: 2, cases: 1, changes: 1, busy: 1.3,
    problems: { 'edge-down': 2, 'archy-escalations': 6, 'confirm-latency': 9.4 },
  },
  {
    key: '2505', label: 'Oak Brook · 22nd St', lat: 41.8467, lng: -87.9531, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 3, switchesDown: 0, apsDown: 0, incidents: 0, cases: 1, changes: 0, busy: 1.1,
    problems: {},
  },
  {
    key: '2733', label: 'Naperville · Ogden Ave', lat: 41.77, lng: -88.127, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 4, switchesDown: 1, apsDown: 1, incidents: 1, cases: 0, changes: 2, busy: 0.9,
    problems: { 'fryer-alarms': 1, 'payment-errors': 7 },
  },
  {
    key: '3448', label: 'Dallas · Preston Rd', lat: 32.9483, lng: -96.8044, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 3, switchesDown: 0, apsDown: 0, incidents: 0, cases: 0, changes: 0, busy: 1.2,
    problems: {},
  },
  {
    key: '5947', label: 'Atlanta · Peachtree St', lat: 33.7838, lng: -84.383, country: 'US',
    edgeUp: 2, gatewaysUp: 2, switches: 4, switchesDown: 0, apsDown: 0, incidents: 1, cases: 2, changes: 1, busy: 1.0,
    problems: { 'vehicle-detection': 1 },
  },
  {
    key: '1123', label: 'Columbus · N High St', lat: 39.993, lng: -83.006, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 3, switchesDown: 0, apsDown: 0, incidents: 0, cases: 0, changes: 0, busy: 0.8,
    problems: {},
  },
  {
    key: '4410', label: 'Denver · E Colfax Ave', lat: 39.74, lng: -104.979, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 4, switchesDown: 0, apsDown: 0, incidents: 0, cases: 1, changes: 1, busy: 0.9,
    problems: { 'cooler-temp': 42 },
  },
  {
    key: '6721', label: 'Phoenix · E Camelback Rd', lat: 33.509, lng: -112.046, country: 'US',
    edgeUp: 3, gatewaysUp: 0, switches: 4, switchesDown: 2, apsDown: 4, incidents: 3, cases: 2, changes: 1, busy: 1.0, offline: true,
    problems: { 'gateway-down': 2, 'payment-errors': 31, 'cloud-backlog': 640, 'mobile-handoff': 12 },
  },
  {
    key: '7012', label: 'Seattle · Aurora Ave N', lat: 47.689, lng: -122.344, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 3, switchesDown: 0, apsDown: 0, incidents: 0, cases: 0, changes: 0, busy: 0.7,
    problems: {},
  },
  {
    key: '8130', label: 'Orlando · International Dr', lat: 28.444, lng: -81.47, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 4, switchesDown: 0, apsDown: 0, incidents: 1, cases: 0, changes: 0, busy: 1.4,
    problems: { 'beverage-faults': 1 },
  },
  {
    key: '9254', label: 'Boston · Boylston St', lat: 42.349, lng: -71.081, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 3, switchesDown: 0, apsDown: 0, incidents: 0, cases: 0, changes: 1, busy: 1.0,
    problems: {},
  },
  {
    key: '3067', label: 'Los Angeles · Sunset Blvd', lat: 34.098, lng: -118.333, country: 'US',
    edgeUp: 3, gatewaysUp: 2, switches: 4, switchesDown: 0, apsDown: 0, incidents: 0, cases: 1, changes: 0, busy: 1.2,
    problems: {},
  },
];

export function findMockStore(key) {
  const wanted = String(key === null || key === undefined ? '' : key).replace(/^0+/, '');
  return MOCK_STORES.find((store) => store.key === wanted) || null;
}

// Store numbers as the device names use them: 844 -> 00844.
export const pad5 = (key) => String(key).padStart(5, '0');
