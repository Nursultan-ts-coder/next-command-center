/*
 * StoreInfo.js: at the top of a store's page, what the store's pop-up on the map says, as one
 * row of small glass cards, as the cards over the map (the store page has no map): the store and
 * its status, then one card per row of the pop-up (edge nodes, GRNT, ...), each with an icon,
 * its number and its status.
 *
 * The rows come from the map, which keeps running out of sight (restaurant-map/Index.js,
 * rmLayer.onDetail), so they follow the dashboard's map tile and its rules.
 */
import React from 'react';
import { SvgIcon } from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';

import GlassCard from '@/shared/components/glass-card';
import { storeName } from '../app/layout';
import { rmRowIconPath } from '../restaurant-map/row-icons';
import { MAP_STATUS } from './SegmentPage';

// A row's icon: the same one as on its row in the store's pop-up on the map (restaurant-map/row-icons.js).
function RowIcon({ label }) {
  return <SvgIcon><path d={rmRowIconPath(label)} /></SvgIcon>;
}

// The row's list from the app (window.__rmRowDetail, index.js), as the pop-up unfolds it.
function rowDetail(label, storeKey) {
  if (typeof window === 'undefined' || typeof window.__rmRowDetail !== 'function') return null;
  try { return window.__rmRowDetail(label, storeKey); } catch (error) { return null; }
}

// The number the pop-up shows for a row: with its "out of" (2/3), and a group (GRNT) as the sum of its parts.
function rowValue(row, detail) {
  if (detail && Array.isArray(detail.parts)) {
    const known = detail.parts.filter((part) => part.status === 'ok');
    if (!known.length) return row.value;
    const have = known.reduce((sum, part) => sum + (Array.isArray(part.items) ? part.items.length : 0), 0);
    const expected = known.reduce((sum, part) => sum + (Number(part.outOf) || 0), 0);
    return expected ? `${have}/${expected}` : String(have);
  }
  if (detail && Number(detail.outOf) > 0 && row.value !== 'No data') return `${row.value}/${detail.outOf}`;
  return row.value;
}

function StatusChip({ status }) {
  const entry = MAP_STATUS[status];
  if (!entry) return null;
  return <span className="cc-si-chip" style={{ color: entry.color, borderColor: entry.color }}><i style={{ background: entry.color }} />{entry.label}</span>;
}

// One small card: an icon, a label over a value, and the status.
function InfoCard({ icon, label, value, status, className = '' }) {
  const tone = status && status !== 'normal' && MAP_STATUS[status] ? MAP_STATUS[status].color : null;
  return (
    <GlassCard className={`cc-si-card ${className}`} sx={tone ? { borderColor: tone } : undefined}>
      <span className="cc-si-icon" style={tone ? { color: tone, background: `${tone}22` } : undefined}>{icon}</span>
      <span className="cc-si-text">
        <span className="cc-si-label" title={label}>{label}</span>
        <b className="cc-si-value" title={String(value)} style={tone ? { color: tone } : undefined}>{value}</b>
      </span>
      <StatusChip status={status} />
    </GlassCard>
  );
}

export default function StoreInfo({ store, detail }) {
  const ready = detail && detail.key === String(store.key);
  return (
    <div className="cc-si">
      <InfoCard
        icon={<StorefrontOutlinedIcon />}
        className="cc-si-store"
        label={`Store ${store.key}`}
        value={(ready && detail.label) || store.label || storeName(store)}
        status={ready ? detail.status : store.status}
      />
      {ready ? detail.rows.map((row) => {
        const found = rowDetail(row.label, detail.key);
        const label = (found && found.showAs) || row.label;
        return (
          <InfoCard
            key={row.label}
            icon={<RowIcon label={`${label} ${row.label}`} />}
            label={label}
            value={rowValue(row, found)}
            status={row.status !== 'normal' || row.hasRule ? row.status : null}
          />
        );
      }) : <p className="cc-si-note">Loading the store’s checks…</p>}
    </div>
  );
}
