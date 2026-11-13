/*
 * AreaDetails.js: what is going on in one area of the store: its open alerts (the check, its
 * message, its current number and the limit it crossed), or why it has none. Shown
 * in the 3D store view's card and in an opened drive-thru step.
 */
import React from 'react';

import { WORDING } from '../store-layout/config';
import { thresholdNote } from '../store-layout/index';
import { MISSING_IS_OUTAGE } from '../store-layout/status';

export const STATUS_COLORS = {
  outage: '#e5231b',
  degraded: '#f5c400',
  healthy: '#17b84a',
  unmonitored: '#1e88f0',
  unknown: '#8b939e',
};

export function StatusPill({ status }) {
  return (
    <span className={`cc-sv-pill cc-sv-pill-${status}`}>
      <i style={{ background: STATUS_COLORS[status] }} />
      {WORDING[status]}
    </span>
  );
}

export default function AreaDetails({ result }) {
  const { status, open, waiting, linked } = result;
  return (
    <div className="cc-sv-details">
      {open.length > 0 && (
        <ul className="cc-sv-causes">
          {open.map(({ check, message, value, level }) => (
            <li key={check.id} className={`cc-sv-cause cc-sv-cause-${level}`}>
              <b>{check.name}</b>
              {message && <p>{message.trim()}</p>}
              {value === null && MISSING_IS_OUTAGE.test(check.name) && <span>{WORDING.missingOutage || 'No data came back for this store'}</span>}
              {value !== null && (
                <span>
                  {WORDING.currentValue}: {Number(value.toFixed(2)).toLocaleString()}{thresholdNote(check, level)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {status === 'unmonitored' && <p className="cc-sv-note">{WORDING.noChecks}</p>}
      {open.length === 0 && waiting.length > 0 && (
        <p className="cc-sv-note">{WORDING.noData}: {waiting.map((check) => check.name).join(', ')}</p>
      )}
      {status === 'healthy' && (
        <p className="cc-sv-note">{WORDING.dependsOn}: {linked.map((check) => check.name).join(', ')}</p>
      )}
    </div>
  );
}
