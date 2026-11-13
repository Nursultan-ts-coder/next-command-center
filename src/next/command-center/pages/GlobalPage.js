/*
 * GlobalPage.js: the widgets of the Global page, as grafana-restraurant-custom-widgets' global
 * dashboard and the Archy demo's Global view: three cards at the top (Availability, Throughput,
 * Experience / quality), then the map across the page with its layers, as on grafana's global map:
 *   - Service: McDonald's segments, each coloured by its status, with every segment's card
 *     along the bottom of the map. Clicking a segment or its card highlights both.
 *   - Locations: the store pins (the map's own layer).
 * The numbers are the demo's examples (segments.js).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { StatusIcon } from '@/shared/components/icons';
import GlassCard from '@/shared/components/glass-card';
import { GLOBAL_KPIS, SAMPLE_DATA, SEGMENT_STATUS, statusColor } from '../segments';
import PillTabs from '../components/PillTabs';
import SegmentPolygons from './SegmentPolygons';

export const LAYERS = [
  { key: 'service', label: 'Service' },
  { key: 'locations', label: 'Locations' },
];

/** One status card: its label, the number in its status's colour, and what the number is. */
export function KpiCard({ label, value, status, sub }) {
  const theme = useTheme();
  const color = status && status !== 'ok' ? statusColor(theme, status) : undefined;
  return (
    <Card variant="widget" className="cc-kpi" style={{ borderTopColor: status ? statusColor(theme, status) : 'var(--cc-kpi-none)' }}>
      <div className="cc-kpi-head">
        <span className="cc-kpi-label">{label}</span>
        {SEGMENT_STATUS[status] && (
          <span className="cc-kpi-status" style={{ color: statusColor(theme, status) }}>
            <StatusIcon color={statusColor(theme, status)} size={14} />
            {SEGMENT_STATUS[status].label}
          </span>
        )}
      </div>
      <b className="cc-kpi-value" style={color ? { color } : undefined}>{value}</b>
      {sub && <span className="cc-kpi-sub">{sub}</span>}
    </Card>
  );
}

/** The Global page's three cards: can a customer order food? */
export function GlobalKpis() {
  return (
    <div className="cc-kpis">
      {GLOBAL_KPIS.map((kpi) => <KpiCard key={kpi.key} {...kpi} />)}
      {SAMPLE_DATA && <span className="cc-sample">Sample figures from the Archy demo, not live data</span>}
    </div>
  );
}

/** The map's layers, above it as on grafana's global map (its LayerSwitcher). */
export function LayerTabs({ layer, onLayer }) {
  return <PillTabs value={layer} onChange={onLayer} items={LAYERS} label="Map layer" className="cc-layer-tabs" />;
}

/** The service layer's buttons, in the map's top-right corner: show only the segments in one status. */
function ServiceStatusButtons({ value, onChange }) {
  const theme = useTheme();
  const items = [
    { key: 'all', label: 'All' },
    ...Object.keys(SEGMENT_STATUS).map((key) => ({ key, label: SEGMENT_STATUS[key].label, icon: <StatusIcon color={statusColor(theme, key)} size={16} /> })),
  ];
  // grafana's tabs, as the map's store status buttons (restaurant-map/Index.js).
  return <PillTabs value={value} onChange={onChange} items={items} label="Show segments by status" />;
}

/**
 * One number on a segment's card: its label, then the value, in its status's colour when not
 * healthy. note: small print after the label (a number with no query yet).
 */
function StripMetric({ label, value, color, note }) {
  return (
    <span className="cc-strip-metric">
      <span className="cc-strip-label" title={note ? `${label} · ${note}` : undefined}>{label}{note && <small> · {note}</small>}</span>
      <b style={color ? { color } : undefined}>{value}</b>
    </span>
  );
}

/**
 * The segments' cards, side by side along the bottom of the map, as the Archy demo's segment
 * cards, kept low so the map shows above them: the name, a dot per status (overall, availability,
 * throughput, escalation) and the status; restaurants and countries on one line, with whether the
 * numbers are live or there is no data yet; then the four numbers in a row.
 * onHeight: how far up the map the cards reach, in pixels, as they are drawn (ServiceLayer).
 * Clicking a card highlights its segment's countries on the map, as clicking them does, and
 * outlines the card; clicking it again clears it. Its name opens the segment's page, as the
 * name on grafana's country card. Segments the status buttons hide are dimmed.
 * Only the cards take clicks; the map between them stays usable.
 * (A button can't hold another, so the highlight button covers the card from behind and the
 * card's contents let clicks through to it, all but the name.)
 * segments: the segments with the U.S. one's live numbers (segments.js, liveSegments).
 */
function SegmentStrip({ segments, status, selectedId, onSelect, onOpen, onHeight }) {
  const theme = useTheme();
  const tone = (value) => (value && value !== 'ok' ? statusColor(theme, value) : undefined);
  const strip = useRef(null);
  const reportHeight = useRef(onHeight);
  reportHeight.current = onHeight;
  useEffect(() => {
    const element = strip.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    // From the bottom of the map to the top of the cards.
    const measure = () => reportHeight.current(element.offsetParent ? element.offsetParent.clientHeight - element.offsetTop : element.offsetHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={strip} className="cc-strip" role="group" aria-label="Segments">
      {segments.map((segment) => {
        const color = statusColor(theme, segment.status);
        // A live card with nothing back yet has no status.
        const statusLabel = SEGMENT_STATUS[segment.status] ? SEGMENT_STATUS[segment.status].label : 'No data';
        const statuses = [segment.status, segment.availability.status, segment.throughput.status, segment.escalation.status];
        const selected = segment.id === selectedId;
        const classes = ['cc-strip-card'];
        if (selected) classes.push('cc-strip-selected');
        if (status !== 'all' && segment.status !== status) classes.push('cc-strip-dim');
        return (
          <GlassCard key={segment.id} className={classes.join(' ')} sx={{ borderLeftColor: color }}>
            <button
              type="button"
              className="cc-strip-select"
              aria-pressed={selected}
              aria-label={`Highlight ${segment.name} on the map`}
              onClick={() => onSelect(selected ? null : segment.id)}
              title={segment.detail}
            />
            <div className="cc-strip-body">
              <span className="cc-strip-head">
                <button type="button" className="cc-strip-name" onClick={() => onOpen(segment.id)} title={`Open ${segment.name}`}>{segment.name}</button>
                <span className="cc-strip-dots" role="img" aria-label={`Status ${statusLabel}`}>
                  {statuses.map((value, i) => <i key={i} style={{ background: statusColor(theme, value) }} />)}
                </span>
                <span className="cc-strip-badge" style={{ color, borderColor: alpha(color, 0.45), background: alpha(color, 0.14) }}>
                  {statusLabel}
                </span>
              </span>
              <span className="cc-strip-line">
                <span className="cc-strip-sub" title={segment.countries}>{segment.sub} · {segment.countries}</span>
                <span className="cc-strip-source">{segment.live ? 'Live · NEXT stores' : 'No data yet'}</span>
              </span>
              <span className="cc-strip-grid">
                <StripMetric label="Availability" value={segment.availability.value} color={tone(segment.availability.status)} />
                <StripMetric label="Throughput" value={segment.throughput.value} color={tone(segment.throughput.status)} />
                <StripMetric label="Esc. rate" value={segment.escalation.value} color={tone(segment.escalation.status)} note={segment.escalation.note} />
                <StripMetric label={segment.storesLabel || 'Restaurants'} value={segment.storesValue || segment.restaurants.toLocaleString()} />
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

/**
 * The map's layer on the Global page, for the map (restaurant-map/Index.js, its rmLayer):
 * on Service, the segments (segments.js, liveSegments) and their cards, and the status buttons in place of the store ones;
 * on Locations, the map's own store pins.
 */
export function globalLayer({ layer, segments, status, onStatus, selectedId, onSelect, onOpen }) {
  if (layer !== 'service') return { name: 'locations' };
  return {
    name: 'service',
    controls: <ServiceStatusButtons value={status} onChange={onStatus} />,
    content: <ServiceLayer segments={segments} status={status} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} />,
  };
}

// The segments on the map and their cards, with the map's land placed above the cards.
function ServiceLayer({ segments, status, selectedId, onSelect, onOpen }) {
  const [cardsHeight, setCardsHeight] = useState(0);
  return (
    <>
      <SegmentPolygons segments={segments} status={status} selectedId={selectedId} onSelect={onSelect} bottomInset={cardsHeight} />
      <SegmentStrip segments={segments} status={status} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} onHeight={setCardsHeight} />
    </>
  );
}
