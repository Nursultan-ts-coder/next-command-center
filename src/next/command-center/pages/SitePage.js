/*
 * SitePage.js: the widgets of a store's page: under the map (full width), the store view (a 3D
 * plan of the restaurant with each area's status) with the drive-thru beside it, Enlarge, and
 * Close to go back to its segment's page; below them, tabs with the store's channel orders, network,
 * Archy ordered items, and ServiceNow incidents and cases.
 */
import React, { useState } from 'react';

import { TEXT } from '../app-config';
import { storeName } from '../app/layout';
import Enlarged from '../components/Enlarged';
import Records from '../components/Records';
import MenuBoard from '../MenuBoard';
import NetworkTab from '../NetworkTab';
import ChartPanels from '../OrderCharts';
import { CHARTS, ORDERS_RECENT_MINUTES } from '../widgets';
import DriveThru from '../store-view/DriveThru';
import Store3D from '../store-view/Store3D';
import useStoreStatus from '../store-view/use-store-status';
import DetailTabs from './DetailTabs';
import { MAP_STATUS } from './SegmentPage';

/**
 * Below the map, side by side: the store view (the 3D plan of the restaurant) and the drive-thru.
 * They share the store's checks and cars, and the chosen area: picking one in either shows it in
 * both. Enlarge opens the 3D view over the page.
 */
export function StorePanel({ panelRef, store, onStatus, onClose }) {
  const [enlarged, setEnlarged] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const status = useStoreStatus({ storeId: store.key, onStatus });
  const badge = MAP_STATUS[store.status];
  const view = <Store3D results={status.results} summary={status} selectedId={selectedId} onSelect={setSelectedId} />;
  return (
    <>
      <div className="cc-store-row" ref={panelRef}>
        <section className="cc-panel cc-panel-store">
          <h2>
            Store view <span>{storeName(store)}</span>
            {badge && <i className="cc-badge" style={{ background: badge.color }}>{badge.label}</i>}
            <button type="button" className="cc-close" onClick={() => setEnlarged(true)}>Enlarge</button>
            <button type="button" className="cc-close cc-close-last" onClick={onClose}>{TEXT.closeStore || 'Close store'}</button>
          </h2>
          <div className="cc-store">
            {enlarged ? <div className="cc-fill cc-store-empty"><p>The store view is open in the enlarged view.</p></div> : view}
          </div>
        </section>
        <section className="cc-panel cc-panel-drive">
          <h2>Drive-thru <span>Store {store.key}</span></h2>
          <DriveThru results={status.results} lane={status.lane} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
      </div>
      {enlarged && <Enlarged title={storeName(store)} onClose={() => setEnlarged(false)}>{view}</Enlarged>}
    </>
  );
}

/** Below the map, in tabs: everything about this one store. */
export function StoreDetails({ store, tab, onTab, charts, network, menuOrders, incidents, cases }) {
  const serviceNowCount = incidents.status === 'ok' && cases.status === 'ok' ? ` (${incidents.records.length + cases.records.length})` : '';
  return (
    <DetailTabs
      tab={tab}
      onTab={onTab}
      where={`Store ${store.key}`}
      tabs={[
        { key: 'orders', label: 'Channel Orders', render: () => <ChartPanels charts={CHARTS} states={charts} storeId={store.key} recentMinutes={ORDERS_RECENT_MINUTES} /> },
        { key: 'network', label: 'Network', render: () => <NetworkTab state={network} storeId={store.key} /> },
        { key: 'menu', label: 'Archy Ordered Items', render: () => <MenuBoard state={menuOrders} storeId={store.key} /> },
        {
          key: 'servicenow',
          label: `ServiceNow${serviceNowCount}`,
          render: () => (
            <div className="cc-widgets">
              <Records title={TEXT.incidents} state={incidents} emptyText={TEXT.noIncidents} />
              <Records title={TEXT.cases} state={cases} emptyText={TEXT.noCases} />
            </div>
          ),
        },
      ]}
    />
  );
}
