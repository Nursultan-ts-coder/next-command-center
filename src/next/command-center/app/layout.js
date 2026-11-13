/*
 * layout.js: the top of every page, laid out like grafana-restraurant-custom-widgets' app bar,
 * in one row:
 *   - on the left, the breadcrumbs: where you are, and the way back to the segment and Global pages;
 *   - on the right, the page filters (the common ones on every page, plus the segment drop-down on
 *     a segment's page and the store drop-down on the store page; both are MUI's Select) and the Agent Q button, which shows or hides Agent Q.
 */
import React from 'react';

import { MenuItem, TextField } from '@mui/material';

import { TEXT } from '../app-config';
import { SEGMENTS, SEGMENT_STATUS } from '../segments';
import { timeZoneOptions } from './filters';
import { PAGES } from './navigation';

const STATUS = {
  critical: { label: 'Critical', color: '#e5231b' },
  warning: { label: 'Warning', color: '#f5c400' },
  normal: { label: 'Normal', color: '#17b84a' },
  nodata: { label: 'No data', color: '#1e88f0' },
};

// NavigateNext, the separator grafana's breadcrumbs use.
const SEPARATOR = (
  <svg className="cc-crumb-sep" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
);

export function storeName(store) {
  if (!store) return '';
  return store.label && store.label !== store.key ? `Store ${store.key} · ${store.label}` : `Store ${store.key}`;
}

/**
 * As grafana's breadcrumbs: on the Global page, the app's name; below it,
 * Global › U.S. › Store 844 · Name, where each earlier step goes back to its page.
 */
function Breadcrumbs({ page, segment, store, onGlobal, onSegment }) {
  const status = store && STATUS[store.status];
  if (page === PAGES.GLOBAL) {
    return (
      <nav className="cc-crumbs" aria-label="Breadcrumbs">
        <span className="cc-brand-bar" />
        <ol><li><span className="cc-crumb-here" aria-current="page">{TEXT.title}</span></li></ol>
      </nav>
    );
  }
  const segmentName = segment ? segment.name : 'Segment';
  return (
    <nav className="cc-crumbs" aria-label="Breadcrumbs">
      <span className="cc-brand-bar" />
      <ol>
        <li><button type="button" className="cc-crumb-link" onClick={onGlobal} title="Back to all segments">Global</button></li>
        <li>
          {SEPARATOR}
          {page === PAGES.SITE ? (
            <button type="button" className="cc-crumb-link" onClick={onSegment} title={`Back to ${segmentName}`}>{segmentName}</button>
          ) : (
            <span className="cc-crumb-here" aria-current="page">{segmentName}</span>
          )}
        </li>
        {page === PAGES.SITE && (
          <li>
            {SEPARATOR}
            <span className="cc-crumb-here" aria-current="page">{storeName(store)}</span>
            {status && <i className="cc-badge cc-crumb-badge" style={{ background: status.color }}>{status.label}</i>}
          </li>
        )}
      </ol>
    </nav>
  );
}

// A page filter: MUI's outlined Select, small, with its label on the border. Dark, as the whole
// app is (app/theme.js). A long list scrolls inside its menu.
function FilterSelect({ id, label, value, options, onChange, disabled, minWidth }) {
  return (
    <TextField
      select
      size="small"
      id={id}
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth }}
      slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 420 } } } } } }}
    >
      {options.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
    </TextField>
  );
}

function TimeZoneSelect({ timeZone, onChange }) {
  const options = timeZoneOptions().map(([key, label]) => ({ key, label }));
  if (!options.some((option) => option.key === timeZone)) options.unshift({ key: timeZone, label: timeZone });
  return <FilterSelect id="cc-time-zone" label="Time zone" value={timeZone} options={options} onChange={onChange} minWidth={220} />;
}

/** The stores on the map, by store number; picking one opens its page. */
function SiteSelect({ stores, value, onChange }) {
  const sorted = (stores || []).slice().sort((a, b) => Number(a.key) - Number(b.key) || String(a.key).localeCompare(String(b.key)));
  const options = sorted.map((store) => ({
    key: store.key,
    label: `${storeName(store)}${store.status && store.status !== 'normal' ? ` (${STATUS[store.status] ? STATUS[store.status].label : store.status})` : ''}`,
  }));
  if (!options.some((option) => option.key === value)) options.unshift({ key: value, label: stores ? `Store ${value} (not on the map)` : 'Loading stores…' });
  return <FilterSelect id="cc-store" label="Store" value={value} options={options} disabled={!stores} onChange={(key) => key !== value && onChange(key)} minWidth={300} />;
}

/**
 * McDonald's segments (segments.js), with their status, the U.S. one live (liveSegments); picking
 * one opens its page. A live status not back yet shows no status.
 */
function SegmentSelect({ segments, value, onChange }) {
  const options = segments.map((segment) => ({
    key: segment.id,
    label: `${segment.name}${SEGMENT_STATUS[segment.status] && segment.status !== 'ok' ? ` (${SEGMENT_STATUS[segment.status].label})` : ''}`,
  }));
  return <FilterSelect id="cc-segment" label="Segment" value={value} options={options} onChange={(id) => id !== value && onChange(id)} minWidth={220} />;
}

export function AppHeader({ page, segment, segments, store, stores, onGlobal, onSegment, onPickSegment, onStore, timeZone, onTimeZone, agentButton }) {
  return (
    <header className="cc-top">
      <Breadcrumbs page={page} segment={segment} store={store} onGlobal={onGlobal} onSegment={onSegment} />
      <div className="cc-filters" role="group" aria-label="Page filters">
        <TimeZoneSelect timeZone={timeZone} onChange={onTimeZone} />
        {page === PAGES.SEGMENT && segment && <SegmentSelect segments={segments || SEGMENTS} value={segment.id} onChange={onPickSegment} />}
        {page === PAGES.SITE && store && <SiteSelect stores={stores} value={store.key} onChange={onStore} />}
        {agentButton}
      </div>
    </header>
  );
}
