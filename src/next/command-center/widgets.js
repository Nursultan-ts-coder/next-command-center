/*
 * widgets.js: what each part of the page shows: the charts, the pop-up lists, the overview cards,
 * the menu board and the network tab. Their numbers come from the data layer (data/), which
 * serves realistic mock data for now; swap its functions for real data sources (Grafana data
 * sources, the plugin's backend) when they exist. Nothing here runs a query.
 */

// ---------------------------------------------------------------------------
// 1. Incidents and cases (ServiceNow): the window the lists and the counts cover.
// ---------------------------------------------------------------------------
export const OPENED_WINDOW_LABEL = 'last 24 hours';

// ---------------------------------------------------------------------------
// 2. Charts on the Channel Orders tab.
//      id        what the data layer calls the series (data/index.js, fetchChartSeries)
//      style     'bars', 'area' or 'line' (one store or all stores added together),
//                'lines' (one line per name, all stores)
//      group     charts with the same group share a panel
//      countsAs  'orders': an order here counts toward "Taking orders"
//      unit      'percent' shows 0.042 as 4.2%
// ---------------------------------------------------------------------------
export const CHARTS_REFRESH_MS = 120000; // every two minutes
export const ORDERS_RECENT_MINUTES = 30; // "taking orders": an order this recently

export const CHARTS = [
  { id: 'kiosk', group: 'Orders', title: 'Kiosk orders', style: 'bars', color: '#3987e5', countsAs: 'orders', noun: 'orders' },
  { id: '3po', group: 'Orders', title: '3PO orders', style: 'bars', color: '#d95926', countsAs: 'orders', noun: 'orders' },
  { id: 'gma', group: 'Orders', title: 'GMA orders', style: 'bars', color: '#9085e9', countsAs: 'orders', noun: 'orders' },
  { id: 'delivery', group: 'Orders', title: 'Delivery orders', style: 'area', color: '#d55181', countsAs: 'orders', noun: 'orders' },
  { id: 'roa-cancelled', group: 'Order problems', title: 'ROA cancelled orders', style: 'line', color: '#3987e5', noun: 'cancelled' },
  { id: 'submit-failures', group: 'Order problems', title: 'Submit failure rate', style: 'lines', unit: 'percent', note: 'Failed ÷ successful, all stores, one line per service' },
  { id: 'release-failures', group: 'Order problems', title: 'Release failure rate', style: 'lines', unit: 'percent', note: 'Failed ÷ successful, all stores, one line per service' },
];

// ---------------------------------------------------------------------------
// 3. The map's pop-up: green dots, and rows that unfold into lists.
//    A simple row shows a number out of a total (outOf) and unfolds into names; a group row
//    unfolds into parts. outOfSince: the expected number is learnt per store from what was
//    seen over a longer time (anything seen then but not now is "not reporting").
// ---------------------------------------------------------------------------
export const SHOW_HEALTHY_DOTS = true;
export const ROW_DETAILS_REFRESH_MS = 60000;

export const ROW_DETAILS = [
  { id: 'edge-nodes', row: 'Edge Node Availability', outOf: 3, things: 'nodes', window: 'in the last 15 minutes' },
  {
    row: 'Gateways Up',
    showAs: 'GRNT',
    parts: [
      { id: 'gateways', name: 'Firewall Gateways', outOf: 2, things: 'gateways', window: 'in the last 10 minutes' },
      { id: 'switches', name: 'Switches', outOfSince: '7 days', things: 'switches', window: 'in the last 10 minutes' },
      { id: 'access-points', name: 'Access Points', outOf: 4, things: 'access points', window: 'in the last 15 minutes' },
      { id: 'lan', name: 'LAN', outOf: 11, things: 'networks', window: 'in the last 15 minutes' },
    ],
  },
];

// ---------------------------------------------------------------------------
// 4. The overview on the segment page's map: orders completed, drive-thru duration and
//    infrastructure availability, all NEXT stores.
//    goodAt, warnAt: availability at or above goodAt is green, at or above warnAt yellow.
// ---------------------------------------------------------------------------
export const OVERVIEW_REFRESH_MS = 300000;

export const OVERVIEW = {
  orders: { title: 'Orders completed', note: 'Archy, all NEXT stores, last hour' },
  driveThru: { title: 'Drive-thru duration', note: 'Greeted to order completed, average', days: 7 },
  availability: {
    title: 'Infrastructure availability',
    note: 'All NEXT stores, last 7 days',
    goodAt: 99.9,
    warnAt: 99,
    parts: [{ id: 'edge', name: 'Edge nodes' }, { id: 'grnt', name: 'GRNT' }],
  },
};

// ---------------------------------------------------------------------------
// 5. The Menu tab (Archy Ordered Items): today's orders drawn as a menu board.
//    MENU_ITEMS sorts the order system's item names onto the board: the first line whose
//    match fits wins, so keep specific ones above general ones.
// ---------------------------------------------------------------------------
export const MENU_REFRESH_MS = 60000;
export const BREAKFAST_ENDS = '10:30';

export const MENU_SECTIONS = ['Breakfast', 'Burgers & Sandwiches', 'Chicken & Fish', 'McCafé', 'Drinks', 'Sides', 'Sweets & Treats', 'Other'];

export const MENU_ITEMS = [
  { match: 'big breakfast', name: 'Big Breakfast', section: 'Breakfast', when: 'breakfast' },
  { match: 'mcgrdl|mcgriddle', name: 'McGriddles', section: 'Breakfast', when: 'breakfast' },
  { match: 'mcmuff|mcmuffin', name: 'McMuffins', section: 'Breakfast', when: 'breakfast' },
  { match: 'hotcake|htck', name: 'Hotcakes', section: 'Breakfast', when: 'breakfast' },
  { match: 'biscuit|bisc', name: 'Biscuits', section: 'Breakfast', when: 'breakfast' },
  { match: 'burrito', name: 'Breakfast Burrito', section: 'Breakfast', when: 'breakfast' },
  { match: 'big mac', name: 'Big Mac', section: 'Burgers & Sandwiches', when: 'regular' },
  { match: 'quarter|qtr|qpc|\\bqp\\b', name: 'Quarter Pounder', section: 'Burgers & Sandwiches', when: 'regular' },
  { match: 'mcdouble|dbl ch|double cheese', name: 'McDouble / Double Cheeseburger', section: 'Burgers & Sandwiches', when: 'regular' },
  { match: 'cheeseburger|chsbrgr|\\bcb\\b', name: 'Cheeseburger', section: 'Burgers & Sandwiches', when: 'regular' },
  { match: 'hamburger|hmbrgr', name: 'Hamburger', section: 'Burgers & Sandwiches', when: 'regular' },
  { match: 'mccrispy|crispy', name: 'McCrispy', section: 'Chicken & Fish', when: 'regular' },
  { match: 'mcchicken', name: 'McChicken', section: 'Chicken & Fish', when: 'regular' },
  { match: 'nugget|mcnug|nug', name: 'Chicken McNuggets', section: 'Chicken & Fish', when: 'regular' },
  { match: 'filet|fish', name: 'Filet-O-Fish', section: 'Chicken & Fish', when: 'regular' },
  { match: 'iced.*(coffee|cof)|iced latte', name: 'Iced Coffee', section: 'McCafé', when: 'all' },
  { match: 'frappe|frappé', name: 'Frappé', section: 'McCafé', when: 'all' },
  { match: 'latte|cappuc|mocha|americano', name: 'Latte / Cappuccino', section: 'McCafé', when: 'all' },
  { match: 'smoothie', name: 'Smoothie', section: 'McCafé', when: 'all' },
  { match: 'premium roast|coffee|\\bcof\\b', name: 'Premium Roast Coffee', section: 'McCafé', when: 'all' },
  { match: 'diet coke|dt coke', name: 'Diet Coke', section: 'Drinks', when: 'all' },
  { match: 'coke|coca', name: 'Coca-Cola', section: 'Drinks', when: 'all' },
  { match: 'sprite', name: 'Sprite', section: 'Drinks', when: 'all' },
  { match: 'dr pepper|dr pep', name: 'Dr Pepper', section: 'Drinks', when: 'all' },
  { match: 'tea', name: 'Tea', section: 'Drinks', when: 'all' },
  { match: 'orange|\\boj\\b|juice', name: 'Juice', section: 'Drinks', when: 'all' },
  { match: 'milk', name: 'Milk', section: 'Drinks', when: 'all' },
  { match: 'water|dasani', name: 'Water', section: 'Drinks', when: 'all' },
  { match: 'hash brown|hashbrown|hsh brn', name: 'Hash Brown', section: 'Sides', when: 'breakfast' },
  { match: 'fries|\\bfry\\b', name: 'Fries', section: 'Sides', when: 'regular' },
  { match: 'apple slice', name: 'Apple Slices', section: 'Sides', when: 'regular' },
  { match: 'pie', name: 'Pies', section: 'Sweets & Treats', when: 'all' },
  { match: 'mcflurry|flurry', name: 'McFlurry', section: 'Sweets & Treats', when: 'regular' },
  { match: 'shake', name: 'Shakes', section: 'Sweets & Treats', when: 'regular' },
  { match: 'sundae', name: 'Sundae', section: 'Sweets & Treats', when: 'regular' },
  { match: 'cookie', name: 'Cookies', section: 'Sweets & Treats', when: 'all' },
  { match: 'cone', name: 'Cone', section: 'Sweets & Treats', when: 'regular' },
];

// ---------------------------------------------------------------------------
// 6. The Network tab, for one store. Strips cover the last 6 hours in 5-minute slots.
//      expect       how many there should be (edge nodes); shown as 3/3
//      warnAt/badAt retry rate (%) or pool use (%) that turns a line yellow/red
// ---------------------------------------------------------------------------
export const NETWORK_REFRESH_MS = 60000;

export const NETWORK = {
  edge: { title: 'Edge nodes', note: 'Edge compute nodes reporting, last 6 hours', expect: 3 },
  devices: { title: 'Gateways & switches', note: 'Heartbeats from each firewall and switch, last 6 hours' },
  dhcp: { title: 'DHCP pools', note: 'Addresses handed out on each network (VLAN)', warnAt: 80, badAt: 95 },
  wifi: { title: 'Wi-Fi access points', note: 'Send retry rate per access point (higher = worse Wi-Fi), last 6 hours', warnAt: 10, badAt: 20 },
};
