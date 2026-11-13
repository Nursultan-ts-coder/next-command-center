/*
 * SegmentPage.js: the widgets of a segment's page (U.S., IOM or IDL & Corporate; segments.js),
 * the Archy demo's segment store map: the segment's numbers at the top (as on its card on the
 * Global map), then the map with only the segment's stores and its countries outlined, the NEXT
 * overview on it; below the map, its store counts, then tabs with the channel orders and Archy
 * ordered items of those stores. A segment with no NEXT stores shows its numbers and countries
 * only. The segment drop-down is in the header (app/layout.js). Agent Q is on every page (index.js).
 */
import React, { useEffect } from 'react';
import { Card } from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';

import { StatusIcon } from '@/shared/components/icons';

import MenuBoard from '../MenuBoard';
import ChartPanels from '../OrderCharts';
import Overview from '../Overview';
import { segmentOfStore } from '../segments';
import DetailTabs from './DetailTabs';
import { useRmMap } from '../restaurant-map/Index';
import { KpiCard } from './GlobalPage';
import { SegmentMarkets } from './SegmentPolygons';
import { CHARTS, ORDERS_RECENT_MINUTES } from '../widgets';

export const MAP_STATUS = {
  critical: { label: 'Critical', color: '#e5231b' },
  warning: { label: 'Warning', color: '#f5c400' },
  normal: { label: 'Normal', color: '#17b84a' },
  nodata: { label: 'No data', color: '#1e88f0' },
};

const TILE_LABELS = { critical: 'Critical', warning: 'Warning', normal: 'Healthy', nodata: 'No data' };
// Shown while there are no numbers to show (no stores counted yet, no incident or case count).
const SAMPLE_COUNTS = { critical: 3, warning: 9, normal: 82, nodata: 6 };
const SAMPLE_OPENED = { incidents: 12, cases: 27 };

/**
 * Below the map: how many of the segment's stores are in each status, as "9 / 100 stores" with
 * a bar for their share, then today's incidents and cases. Widget cards, as the cards above the map.
 */
export function SegmentTiles({ counts: liveCounts, incidentsOpened, casesOpened }) {
  const liveTotal = liveCounts ? Object.keys(MAP_STATUS).reduce((sum, key) => sum + (liveCounts[key] || 0), 0) : 0;
  const counts = liveTotal ? liveCounts : SAMPLE_COUNTS;
  const total = Object.keys(MAP_STATUS).reduce((sum, key) => sum + (counts[key] || 0), 0);
  const opened = (state, sample) => (state.value === null ? { value: sample, sample: true } : { value: state.value, failed: state.status === 'failed' });
  return (
    <div className="cc-tiles cc-seg-below">
      {Object.keys(MAP_STATUS).map((key) => {
        const { color } = MAP_STATUS[key];
        const count = counts[key] || 0;
        const share = total ? (count / total) * 100 : 0;
        return (
          <Card key={key} variant="widget" className="cc-tile">
            <span className="cc-tile-head"><StatusIcon color={color} size={14} />{TILE_LABELS[key]}</span>
            <span className="cc-tile-value">
              <b style={count ? { color: key === 'normal' ? undefined : color } : undefined}>{count.toLocaleString()}</b>
              <small>/ {total.toLocaleString()} stores</small>
            </span>
            <span className="cc-tile-bar" role="img" aria-label={`${Math.round(share)}% of the stores`}><i style={{ width: `${share}%`, background: color }} /></span>
          </Card>
        );
      })}
      {[['Incidents today', opened(incidentsOpened, SAMPLE_OPENED.incidents), ConfirmationNumberOutlinedIcon], ['Cases today', opened(casesOpened, SAMPLE_OPENED.cases), SupportAgentOutlinedIcon]].map(([label, shown, Icon]) => (
        <Card key={label} variant="widget" className="cc-tile">
          <span className="cc-tile-head"><Icon className="cc-tile-icon" />{label}</span>
          <span className="cc-tile-value"><b>{shown.value.toLocaleString()}</b></span>
          <span className={`cc-tile-note${shown.failed ? ' cc-bad' : ''}`}>{shown.failed ? 'Not updating' : shown.sample ? 'Sample figure' : 'Opened, all stores'}</span>
        </Card>
      ))}
      {!liveTotal && <span className="cc-sample">Sample store counts, not live data</span>}
    </div>
  );
}

/**
 * The NEXT overview, laid over the left of the map: orders completed, drive-thru duration and
 * infrastructure availability. Only the cards take clicks; the rest of the map stays usable.
 */
export function MapOverview({ overview }) {
  return (
    <div className="cc-map-overlay">
      <Overview data={overview} />
    </div>
  );
}

/**
 * At the top: the segment's numbers, as on its card on the Global page's map, the U.S. ones live
 * (segments.js, liveSegments), with what each live number is in place of the demo's wording.
 */
export function SegmentKpis({ segment }) {
  return (
    <div className="cc-kpis cc-kpis-4">
      <KpiCard label="Availability" value={segment.availability.value} status={segment.availability.status} sub={segment.availability.sub || 'Archy operational uptime %'} />
      <KpiCard label="Esc. rate" value={segment.escalation.value} status={segment.escalation.status} sub={segment.escalation.sub || 'Orders handed to crew'} />
      <KpiCard label="Throughput" value={segment.throughput.value} status={segment.throughput.status} sub={segment.throughput.sub || 'POS sales vs. expected'} />
      <KpiCard label={segment.storesLabel || 'Restaurants'} value={segment.storesValue || segment.restaurants.toLocaleString()} sub={segment.sub} />
    </div>
  );
}

// Places the map on the segment's part of the world (segments.js, its bounds).
function FitSegment({ bounds }) {
  const map = useRmMap();
  useEffect(() => {
    if (map && bounds) map.fitBounds(bounds, 20);
  }, [map, bounds]);
  return null;
}

/**
 * The map's layer on a segment's page, for the map (restaurant-map/Index.js, its rmLayer): the
 * pins of the segment's stores only and its countries outlined, without the Global page's
 * service layer. With no stores to zoom to, the map is placed on the segment instead.
 */
export function segmentLayer({ segment, hasStores }) {
  return {
    name: 'locations',
    pinFilter: (store) => segmentOfStore(store) === segment.id,
    pinFilterKey: segment.id,
    content: (
      <>
        <SegmentMarkets key={segment.id} segmentId={segment.id} />
        {!hasStores && <FitSegment bounds={segment.bounds} />}
        {!hasStores && <p className="cc-map-note">No NEXT stores report in {segment.name} yet.</p>}
      </>
    ),
  };
}

/** Below the map, in tabs: the channel orders and Archy ordered items of the segment's NEXT stores. */
export const SEGMENT_TABS = ['orders', 'menu'];

export function SegmentDetails({ segment, tab, onTab, charts, menuOrders }) {
  return (
    <DetailTabs
      tab={tab}
      onTab={onTab}
      where={`NEXT stores in ${segment.name}`}
      tabs={[
        { key: 'orders', label: 'Channel Orders', render: () => <ChartPanels charts={CHARTS} states={charts} storeId="" recentMinutes={ORDERS_RECENT_MINUTES} /> },
        { key: 'menu', label: 'Archy Ordered Items', render: () => <MenuBoard state={menuOrders} storeId="" /> },
      ]}
    />
  );
}
