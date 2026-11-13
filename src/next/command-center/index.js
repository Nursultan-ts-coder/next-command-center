import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme2 } from '@grafana/ui';

import RestaurantMap from './restaurant-map/Index';
import { RECORDS_REFRESH_MS, AGENT_FLOW_URL, DEFAULT_COUNTRY, TEXT } from './app-config';
import {
  CHARTS_REFRESH_MS,
  ORDERS_RECENT_MINUTES,
  CHARTS,
  ROW_DETAILS,
  ROW_DETAILS_REFRESH_MS,
  SHOW_HEALTHY_DOTS,
} from './widgets';
import { MAP_SETTINGS, fetchChartSeries, fetchOpenedCount, fetchRecords, fetchRowDetail } from './data';
import { seriesFor, summarize, storeKey } from './orders';
import { sameRow, listDetailQueries, compareWithSeen } from './details';
import { useOverview } from './Overview';
import { useMenuOrders } from './MenuBoard';
import { useNetwork } from './NetworkTab';
import { AppHeader } from './app/layout';
import { useTimeZoneFilter } from './app/filters';
import GrafanaTheme from './app/theme';
import { PAGES, useNavigation } from './app/navigation';
import { GlobalKpis, LayerTabs, globalLayer } from './pages/GlobalPage';
import { MapOverview, SEGMENT_TABS, SegmentDetails, SegmentKpis, SegmentTiles, segmentLayer } from './pages/SegmentPage';
import { StoreDetails, StorePanel } from './pages/SitePage';
import StoreInfo from './pages/StoreInfo';
import { askAgent } from './agent';
import { findSegment, liveSegments, segmentOfStore } from './segments';
import { repeatWhileShowing } from './store-layout/visibility';
import './styles.scss';

// The country sent to the agents when a store's own data has none (app-config.js).
if (typeof window !== 'undefined') window.__rmDefaultCountry = String(DEFAULT_COUNTRY || 'US');

// ---------------------------------------------------------------------------
// What the map tells us: which store was clicked, and how many stores are in each status
// ---------------------------------------------------------------------------
function useMapBridge(onPinClick, onOpenStorePage) {
  const [counts, setCounts] = useState(null);
  const [stores, setStores] = useState(null);
  const lastCounts = useRef('');
  const lastStores = useRef('');
  const pinClick = useRef(onPinClick);
  pinClick.current = onPinClick;
  const openPage = useRef(onOpenStorePage);
  openPage.current = onOpenStorePage;

  useEffect(() => {
    // A pin clicked on the map (it opens the store's pop-up there).
    window.__rmOnStoreSelect = (store) => {
      if (store && store.key !== null && store.key !== undefined) pinClick.current(String(store.key));
    };
    // The store's name in its pop-up opens the store's page.
    window.__rmOpenStorePage = (key) => {
      if (key !== null && key !== undefined && key !== '') openPage.current(String(key));
    };
    window.__rmOnStatusCounts = (latest) => {
      const signature = JSON.stringify(latest);
      if (signature === lastCounts.current) return;
      lastCounts.current = signature;
      const copy = { ...latest };
      setTimeout(() => setCounts(copy), 0); // the map calls this while drawing, so wait a beat
    };
    // The stores on the map (number, name, status), for the store drop-down.
    window.__rmOnStores = (list) => {
      const signature = JSON.stringify(list);
      if (signature === lastStores.current) return;
      lastStores.current = signature;
      const copy = list.slice();
      setTimeout(() => setStores(copy), 0);
    };
    return () => {
      delete window.__rmOnStoreSelect;
      delete window.__rmOpenStorePage;
      delete window.__rmOnStatusCounts;
      delete window.__rmOnStores;
    };
  }, []);

  return { counts, stores };
}

/*
 * Keeps the map in step with the page: a store opened from the drop-down, the page address or the
 * Back button is zoomed to and its pop-up opened; coming back to the Global page closes the pop-up
 * (a pop-up opened on the Global page itself stays open). The map may not have drawn the store
 * yet, so it is asked again for a few seconds.
 */
function useMapFollowsPage(storeKey, stores) {
  // The store the map was last brought to, so a pop-up closed by hand stays closed.
  const shown = useRef('');
  const lastKey = useRef(storeKey);
  useEffect(() => {
    const leftStore = Boolean(lastKey.current) && !storeKey;
    lastKey.current = storeKey;
    if (!storeKey) {
      shown.current = '';
      if (leftStore && window.__rmOpenStoreKey && typeof window.__rmClosePopup === 'function') window.__rmClosePopup();
      return undefined;
    }
    let tries = 0;
    let timer = null;
    const focus = () => {
      if (shown.current === storeKey) return;
      if (String(window.__rmOpenStoreKey) === storeKey) {
        shown.current = storeKey; // opened on the map itself
        return;
      }
      const done = typeof window.__rmFocusStore === 'function' && window.__rmFocusStore(storeKey);
      if (done) shown.current = storeKey;
      tries += 1;
      if (!done && tries < 20) timer = setTimeout(focus, 500);
    };
    focus();
    return () => clearTimeout(timer);
  }, [storeKey, stores]);
}

// ---------------------------------------------------------------------------
// Incidents and cases
// ---------------------------------------------------------------------------
// One number for a tile at the top: incidents (or cases) opened in the last 24 hours, all stores.
function useOpenedCount(kind) {
  const [state, setState] = useState({ status: 'loading', value: null });
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchOpenedCount(kind)
        .then((value) => !cancelled && setState({ status: 'ok', value: value || 0 }))
        .catch(() => !cancelled && setState((before) => ({ status: 'failed', value: before.value })));
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, RECORDS_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [kind]);
  return state;
}

// The list for one store (kind: 'incident' or 'case').
function useRecords(kind, storeId) {
  const [state, setState] = useState({ status: 'loading', records: [] });

  useEffect(() => {
    if (!/^\d+$/.test(String(storeId || ''))) {
      setState({ status: 'skipped', records: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', records: [] });
    const load = () =>
      fetchRecords(kind, storeId)
        .then((records) => !cancelled && setState({ status: 'ok', records }))
        .catch(() => !cancelled && setState({ status: 'failed', records: [] }));
    const repeat = repeatWhileShowing(load, RECORDS_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [kind, storeId]);

  return state;
}

// ---------------------------------------------------------------------------
// Charts. Each chart's data covers every store. Picking a store does not load anything
// again; the chart just shows that store's share.
// active: false while another tab (Network, Archy, ServiceNow) is open; the charts then
// wait, and catch up once as soon as Channel Orders is opened again.
// ---------------------------------------------------------------------------
const CHART_WINDOW = 'in the last 6 hours';

function useCharts(active) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const repeatRef = useRef(null);
  const [states, setStates] = useState(() => CHARTS.map(() => ({ status: 'loading', data: null })));
  useEffect(() => {
    let cancelled = false;
    const set = (index, change) => !cancelled && setStates((all) => all.map((state, i) => (i === index ? change(state) : state)));
    const load = () =>
      CHARTS.forEach((chart, index) => {
        const extra = { windowText: CHART_WINDOW, hasTimeseries: true };
        fetchChartSeries(chart.id)
          .then((data) => set(index, () => ({ status: 'ok', data, ...extra })))
          .catch(() => set(index, (before) => ({ status: 'failed', data: before.data, ...extra }))); // keep the last good chart on screen
      });
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, CHARTS_REFRESH_MS, () => activeRef.current);
    repeatRef.current = repeat;
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, []);
  useEffect(() => {
    if (active && repeatRef.current) repeatRef.current.poke();
  }, [active]);
  return states;
}

// ---------------------------------------------------------------------------
// Lists that unfold under a row in the map's pop-up (ROW_DETAILS in queries.js).
// Each list covers every store and is kept up to date. When the map draws
// a pop-up it asks, row by row, "is there a list for this row and this store?"
// ---------------------------------------------------------------------------
const DETAIL_QUERIES = listDetailQueries(ROW_DETAILS);

function useRowDetails() {
  // One state per list, by id.
  //   byStore      what is reporting now
  //   seenByStore  what was seen over the longer time (only for parts with outOfSince)
  const [states, setStates] = useState(() => {
    const first = {};
    DETAIL_QUERIES.forEach((item) => { first[item.id] = { status: 'loading', byStore: null, seenByStore: null, seenStatus: 'loading' }; });
    return first;
  });
  const latest = useRef(states);
  latest.current = states;

  useEffect(() => {
    let cancelled = false;
    const set = (id, change) => !cancelled && setStates((all) => ({ ...all, [id]: { ...all[id], ...change(all[id]) } }));
    const load = () =>
      DETAIL_QUERIES.forEach((item) => {
        fetchRowDetail(item.part)
          .then(({ byStore, seenByStore }) => set(item.id, () => ({ status: 'ok', byStore, seenByStore: item.outOfSince ? seenByStore : null, seenStatus: 'ok' })))
          .catch((error) => set(item.id, () => ({ status: 'failed', error: error.message || '' }))); // the last good list stays
      });
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, ROW_DETAILS_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, []);

  useEffect(() => {
    // One list for one store, in the shape the map draws.
    const listFor = (item, store) => {
      const state = latest.current[item.id];
      const now = state.byStore ? state.byStore[storeKey(store)] || [] : [];
      let outOf = Number(item.outOf) || 0;
      let missing = [];
      if (item.outOfSince) {
        const seen = state.seenByStore ? state.seenByStore[storeKey(store)] || [] : null;
        ({ outOf, missing } = compareWithSeen(now, seen));
      }
      let status = state.byStore ? 'ok' : state.status;
      // Nothing now and nothing over the longer time either: we know nothing about this store.
      if (status === 'ok' && item.outOfSince && state.seenByStore && outOf === 0) status = 'nodata';
      return {
        name: item.name,
        outOf,
        missing,
        things: item.things || 'items',
        window: item.window || '',
        status,
        items: now,
      };
    };

    // What the map calls for every row of a pop-up. Returns null for rows that have no list.
    window.__rmRowDetail = (label, store) => {
      const index = ROW_DETAILS.findIndex((detail) => sameRow(label, detail.row));
      if (index === -1) return null;
      const detail = ROW_DETAILS[index];
      const mine = DETAIL_QUERIES.filter((item) => item.id === `${index}` || item.id.indexOf(`${index}.`) === 0);
      if (Array.isArray(detail.parts)) return { showAs: detail.showAs || '', parts: mine.map((item) => listFor(item, store)) };
      return { showAs: detail.showAs || '', ...listFor(mine[0], store) };
    };
    window.__rmShowHealthyDots = SHOW_HEALTHY_DOTS === true;
    return () => {
      delete window.__rmRowDetail;
      delete window.__rmShowHealthyDots;
    };
  }, []);

  return { states };
}


// ---------------------------------------------------------------------------
// Agent Q
// ---------------------------------------------------------------------------
const ASK_ANYTHING =
  'Ask me anything. Your question is sent as you typed it, with what this page is showing added as background: the selected store, or all stores when none is selected.';

const FIRST_MESSAGE = () => [{ from: 'q', text: TEXT.agentIntroAny || ASK_ANYTHING }];

/*
 * onWide(true) when the panel should be full width: while someone is typing a
 * question, waiting for an answer, or once there is a conversation to read.
 * "Clear chat" empties it, and the panel goes back to its narrow size.
 */
function Chat({ store, flowUrl, getContext, onWide }) {
  const [messages, setMessages] = useState(FIRST_MESSAGE);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const talked = messages.length > 1;
  useEffect(() => {
    if (onWide) onWide(typing || busy || talked || draft.trim() !== '');
  }, [typing, busy, talked, draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useRef(null);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, busy]);

  const add = (message) => setMessages((all) => all.concat(message));

  function ask(text) {
    const question = text.trim();
    if (!question || busy) return;
    setDraft('');
    add({ from: 'me', text: question, about: store ? `store ${store.key}` : 'all stores' });
    setBusy(true);
    askAgent(flowUrl, store, question, getContext())
      .then((reply) => alive.current && add({ from: 'q', ...reply }))
      .catch((error) => alive.current && add({ from: 'q', text: error.message, bad: true }))
      .then(() => alive.current && setBusy(false));
  }

  return (
    <div className="cc-chat">
      <div className="cc-chat-list" ref={list}>
        {messages.map((message, index) => (
          <div key={index} className={`cc-msg cc-msg-${message.from}${message.bad ? ' cc-msg-bad' : ''}`}>
            {message.about && <div className="cc-msg-meta">About {message.about}</div>}
            {message.health && <div className="cc-msg-meta">Overall health: <b>{message.health}</b></div>}
            {message.text}
            {(message.sections || []).map((section) => (
              <div key={section.title} className="cc-msg-section">
                <b>{section.title}</b>
                <ul>{section.items.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
          </div>
        ))}
        {busy && <div className="cc-msg cc-msg-q cc-thinking">{TEXT.agentWorking}</div>}
      </div>
      {talked && !busy && (
        <button type="button" className="cc-chat-clear" onClick={() => setMessages(FIRST_MESSAGE())}>Clear chat</button>
      )}
      <form className="cc-ask" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
        <input
          value={draft}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={store ? `Ask about store ${store.key}…` : 'Ask Agent Q…'}
          aria-label="Ask Agent Q"
          style={{ background: 'var(--cc-bg-0f1318)', color: 'var(--cc-fg-e6e9ed)', border: '1px solid var(--cc-line-323b47)', boxShadow: 'none' }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sizing: text and spacing grow on a big or zoomed-out screen, so the page reads
// the same on a laptop and on a wall display. 1 on a normal laptop, up to 2.5.
// ---------------------------------------------------------------------------
// Also reports the page width, so a laptop gets the compact layout (see LAPTOP_WIDTH).
const LAPTOP_WIDTH = 1500; // narrower than this: Agent Q slides out over the page instead of taking a column
function useScale(ref) {
  const [size, setSize] = useState({ scale: 1, width: 1600 });
  useEffect(() => {
    const measure = () => {
      const width = ref.current ? ref.current.clientWidth : window.innerWidth;
      const scale = Math.round(Math.max(1, Math.min(2.5, width / 1500)) * 20) / 20;
      setSize((before) => (before.scale === scale && before.width === width ? before : { scale, width }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined' || !ref.current) {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return size;
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------
function CommandCenter() {
  // Which page is open: Global, a segment's, or a store's page (app/navigation.js).
  const { page, segmentId, storeKey, goToSite, goToSegment, goToGlobal } = useNavigation();
  const segment = findSegment(segmentId);
  // A pin opens the store's pop-up; on the Global and segment pages that is all it does, on a
  // store's page it also switches to the clicked store. The store's name in the pop-up opens its
  // page, under the store's own segment when opened from the Global page.
  const { counts: allCounts, stores } = useMapBridge(
    (key) => { if (page === PAGES.SITE) goToSite(key); },
    (key) => goToSite(key, segmentOfStore((stores || []).find((item) => item.key === key))),
  );
  useMapFollowsPage(storeKey, stores);
  // An address with a segment that doesn't exist (any more) goes to the Global page.
  useEffect(() => {
    if (segmentId && !segment) goToGlobal();
  }, [segmentId]); // eslint-disable-line react-hooks/exhaustive-deps
  // The Global page's map: its layer, the service layer's status buttons, and the segment clicked.
  const [mapLayer, setMapLayer] = useState('service');
  const [serviceStatus, setServiceStatus] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState(null);
  // What the open store's pop-up says, from the map (out of sight on the store page).
  const [storeDetail, setStoreDetail] = useState(null);
  // The segment's own stores, and their counts for the tiles; null while the map is loading.
  const segmentStores = segment && stores ? stores.filter((item) => segmentOfStore(item) === segment.id) : null;
  const counts = !segment ? allCounts : segmentStores && segmentStores.reduce((tally, item) => ({ ...tally, [item.status]: (tally[item.status] || 0) + 1 }), { normal: 0, warning: 0, critical: 0, nodata: 0 });
  const segmentHasStores = !segmentStores || segmentStores.length > 0;
  const { timeZone, setTimeZone } = useTimeZoneFilter();
  const [storeStatus, setStoreStatus] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatWide, setChatWide] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chosenTab, setTab] = useState('orders');
  const detail = useRef(null);
  const root = useRef(null);
  const { scale, width: pageWidth } = useScale(root);
  // Laptop: Agent Q becomes a panel that slides out from the right when asked for.
  const compact = pageWidth < LAPTOP_WIDTH;
  // Grafana's light or dark theme: the page is marked "cc-light" for styles.scss, and the map
  // takes its light style.
  const light = !useTheme2().isDark;
  useEffect(() => {
    document.documentElement.classList.toggle('cc-light', light);
    return () => document.documentElement.classList.remove('cc-light');
  }, [light]);

  // The open store: the map's own entry for it once the map has drawn it (name, status).
  // The Global page has no tabs, and a segment's page only some; on it, a store-only tab falls back
  // to Channel Orders.
  const tab = page === PAGES.GLOBAL ? '' : page === PAGES.SEGMENT && !SEGMENT_TABS.includes(chosenTab) ? 'orders' : chosenTab;
  const showsStores = page === PAGES.SITE || (page === PAGES.SEGMENT && segmentHasStores);
  const store = page === PAGES.SITE ? ((stores || []).find((item) => item.key === storeKey) || { key: storeKey }) : null;
  const storeId = store ? store.key : '';
  const incidents = useRecords('incident', storeId);
  const cases = useRecords('case', storeId);
  const incidentsOpened = useOpenedCount('incident');
  const casesOpened = useOpenedCount('case');
  const charts = useCharts(showsStores && tab === 'orders');
  useRowDetails();
  // The overview is on a segment's page; the Global page's U.S. card uses its numbers too.
  const overview = useOverview(page === PAGES.GLOBAL || (page === PAGES.SEGMENT && segmentHasStores));
  const { orders: overviewOrders, parts: overviewParts } = overview;
  const segments = useMemo(() => liveSegments({ overview: { orders: overviewOrders, parts: overviewParts }, stores }), [overviewOrders, overviewParts, stores]);
  const menuOrders = useMenuOrders(storeId, showsStores && tab === 'menu');
  const network = useNetwork(storeId, page === PAGES.SITE && tab === 'network'); // the network is on a store's page only

  // Agent Q's flow: the one saved on the app's Configuration page, else app-config.js; none: example answers.
  const flowUrl = String((window.__NEXT_CC_CONFIG__ && window.__NEXT_CC_CONFIG__.agentFlowUrl) || AGENT_FLOW_URL || '').trim();

  // A new store starts with a clean slate. On a narrow screen it opens below the map, so bring it into view.
  useEffect(() => {
    setStoreStatus(null);
    if (storeId && detail.current && window.innerWidth <= 1100) detail.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [storeId]);

  // Everything Agent Q is told: about the selected store, or about all stores when none is selected.
  const getContext = () => ({
    storeNumber: storeId,
    storeCounts: counts,
    incidentsOpened: incidentsOpened.value,
    casesOpened: casesOpened.value,
    loading: !storeStatus || storeStatus.loading,
    impacted: storeStatus ? storeStatus.impacted : [],
    degraded: storeStatus ? storeStatus.degraded : [],
    causes: storeStatus ? storeStatus.causes : [],
    carsInLane: storeStatus ? storeStatus.carsInLane : null,
    incidents: incidents.records.map((record) => record.title),
    cases: cases.records.map((record) => record.title),
    orders: CHARTS.map((chart, i) => {
      if (chart.countsAs !== 'orders' || chart.style === 'lines' || !charts[i].data) return null;
      const summary = summarize(charts[i].data.buckets, seriesFor(charts[i].data, storeId), Date.now(), ORDERS_RECENT_MINUTES);
      return { title: chart.title, total: summary.total, recent: summary.recent, window: charts[i].windowText || '' };
    }).filter(Boolean),
  });

  // What the map shows (restaurant-map/Index.js, rmLayer): the Global page's chosen layer; a
  // segment's stores on its page; on a store's page, where the map is out of sight, what the
  // store's pop-up says, for its cards (StoreInfo).
  const mapLayerFor = () => {
    if (page === PAGES.GLOBAL) {
      return globalLayer({
        layer: mapLayer,
        segments,
        status: serviceStatus,
        onStatus: setServiceStatus,
        selectedId: selectedSegment,
        onSelect: setSelectedSegment,
        onOpen: (id) => { setSelectedSegment(null); goToSegment(id); },
      });
    }
    if (!segment) return null;
    const layer = segmentLayer({ segment, hasStores: segmentHasStores });
    return page === PAGES.SITE ? { ...layer, content: null, detailKey: storeId, onDetail: setStoreDetail } : layer;
  };

  return (
    <div ref={root} className={`cc-root cc-app cc-page-${page}${compact ? ' cc-compact' : chatOpen ? '' : ' cc-chat-closed'}${!compact && chatOpen && chatWide ? ' cc-chat-wide' : ''}`} style={{ '--u': `${scale}px` }}>
      <AppHeader
        page={page}
        segment={segment}
        segments={segments}
        store={store}
        stores={stores}
        onGlobal={goToGlobal}
        onSegment={() => goToSegment(segmentId)}
        onPickSegment={goToSegment}
        onStore={goToSite}
        timeZone={timeZone}
        onTimeZone={setTimeZone}
        agentButton={compact ? (
          <button type="button" className="cc-toggle cc-toggle-q" onClick={() => setDrawerOpen(!drawerOpen)}>{drawerOpen ? 'Hide Agent Q' : 'Ask Agent Q'}</button>
        ) : (
          <button type="button" className="cc-toggle" onClick={() => setChatOpen(!chatOpen)}>{chatOpen ? 'Hide Agent Q' : 'Ask Agent Q'}</button>
        )}
      />

      <div className="cc-head">
        {page === PAGES.GLOBAL && <GlobalKpis />}
        {page === PAGES.SITE && <StoreInfo store={store} detail={storeDetail} />}
        {page === PAGES.SEGMENT && segment && <SegmentKpis segment={segments.find((item) => item.id === segment.id) || segment} />}
      </div>

      {/* The map is on every page and stays put when the page changes, so it is not loaded again.
          In the app's theme (rmDark), with its boxes in that theme's colours.
          Global page: full width, with its layers (Service: the segments; Locations: every store).
          Segment page: full width, the segment's stores, with the NEXT overview on it.
          Store page: out of sight (cc-panel-map-away), still running, so the store's cards above get
          what its pop-up says, and the map is not loaded again on the way back. */}
      <section className={`cc-panel cc-panel-map${page === PAGES.SITE ? ' cc-panel-map-away' : ''}`} aria-hidden={page === PAGES.SITE ? 'true' : undefined}>
        <h2>
          {page === PAGES.GLOBAL && mapLayer === 'service' ? 'Segments' : TEXT.mapTitle}
          <span>{store ? TEXT.mapHintOpen : page === PAGES.GLOBAL && mapLayer === 'service' ? 'Click a segment or its card to highlight it' : segment && !segmentHasStores ? segment.name : TEXT.mapHint}</span>
          {page === PAGES.GLOBAL && <LayerTabs layer={mapLayer} onLayer={setMapLayer} />}
        </h2>
        <div className="cc-map">
          <div className="cc-fill"><RestaurantMap {...MAP_SETTINGS} agentFlowUrl={flowUrl} rmDark={!light} rmLayer={mapLayerFor()} /></div>
          {page === PAGES.SEGMENT && segmentHasStores && <MapOverview overview={overview} />}
        </div>
      </section>

      {page === PAGES.SITE && (
        <StorePanel key={storeId} panelRef={detail} store={store} onStatus={setStoreStatus} onClose={() => goToSegment(segmentId)} />
      )}

      {page === PAGES.SITE && (
        <StoreDetails store={store} tab={tab} onTab={setTab} charts={charts} network={network} menuOrders={menuOrders} incidents={incidents} cases={cases} />
      )}
      {page === PAGES.SEGMENT && segmentHasStores && <SegmentTiles counts={counts} incidentsOpened={incidentsOpened} casesOpened={casesOpened} />}
      {page === PAGES.SEGMENT && segment && segmentHasStores && (
        <SegmentDetails segment={segment} tab={tab} onTab={setTab} charts={charts} menuOrders={menuOrders} />
      )}

      {/* Agent Q, on every page: about the open store, or all stores on the Global and segment pages.
          A column beside the map; on a laptop, a panel that slides out from the right. */}
      {(compact || chatOpen) && (
        <section className={`cc-panel cc-panel-chat${compact ? ` cc-drawer${drawerOpen ? ' cc-drawer-open' : ''}` : ''}`} aria-hidden={compact && !drawerOpen ? 'true' : undefined}>
          <h2>
            {TEXT.agentTitle} <span>{store ? `Store ${store.key}` : segment ? segment.name : 'All stores'}</span>
            {compact && <button type="button" className="cc-close" onClick={() => setDrawerOpen(false)}>Close</button>}
          </h2>
          <Chat store={store} flowUrl={flowUrl} getContext={getContext} onWide={setChatWide} />
        </section>
      )}
    </div>
  );
}

// The page inside grafana-restraurant-custom-widgets' MUI theme (app/theme.js), which its cards,
// charts and drop-downs need.
export default function CommandCenterApp() {
  return (
    <GrafanaTheme>
      <CommandCenter />
    </GrafanaTheme>
  );
}
