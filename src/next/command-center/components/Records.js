/*
 * Records.js: one list of ServiceNow records (incidents or cases) for the open store, in grafana's
 * widget card.
 */
import React from 'react';

import { OPENED_WINDOW_LABEL } from '../widgets';
import { formatSeen } from '../records';
import WidgetCard from './WidgetCard';

export default function Records({ title, state, emptyText }) {
  const { status, records } = state;
  const shown = records.slice(0, 8);
  const now = Date.now();
  let body;
  if (status === 'loading') body = <p className="cc-empty">Loading…</p>;
  else if (status === 'failed') body = <p className="cc-empty cc-bad">Couldn't load {title.toLowerCase()}. Retrying every minute.</p>;
  else if (status === 'skipped') body = <p className="cc-empty">This store's number isn't numeric, so there is nothing to look up.</p>;
  else if (records.length === 0) body = <p className="cc-empty">{emptyText} {OPENED_WINDOW_LABEL}.</p>;
  else {
    body = (
      <ul>
        {shown.map((record) => (
          <li key={record.id}>
            <div className="cc-rec-top">
              <span className="cc-rec-text">{record.title}</span>
              {record.opened && <span className="cc-rec-time">{formatSeen(record.opened, now)}</span>}
            </div>
            {record.number && <div className="cc-rec-details">{record.number}</div>}
          </li>
        ))}
        {records.length > shown.length && <li className="cc-rec-more">and {records.length - shown.length} more</li>}
      </ul>
    );
  }
  return (
    <WidgetCard className="cc-records" title={title} subtitle={status === 'ok' ? `${records.length} opened in the ${OPENED_WINDOW_LABEL}` : `opened in the ${OPENED_WINDOW_LABEL}`}>
      {body}
    </WidgetCard>
  );
}
