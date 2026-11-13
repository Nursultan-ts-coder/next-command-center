import React, { useEffect, useRef, useState } from 'react';

import { MENU_REFRESH_MS, MENU_ITEMS, MENU_SECTIONS, BREAKFAST_ENDS } from './widgets';
import { fetchMenuOrders } from './data';
import { buildBoard, placeItem } from './menu-data';
import BarChart from './components/BarChart';
import WidgetCard from './components/WidgetCard';
import { repeatWhileShowing } from './store-layout/visibility';

/*
 * The Menu tab: today's orders drawn as a menu board, then in pairs of widgets the latest orders
 * as kitchen tickets, the top sellers, orders by 15 minutes and the basket mix.
 */

// Today's orders for one store ('' = all NEXT stores), now and every MENU_REFRESH_MS (data/index.js).
export function useMenuOrders(storeId, enabled) {
  const [state, setState] = useState({ status: 'loading', orders: [] });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState({ status: 'loading', orders: [] });
    const load = () =>
      fetchMenuOrders(storeId, BREAKFAST_ENDS)
        .then((orders) => !cancelled && setState({ status: 'ok', orders, error: '', storeId }))
        .catch((error) => !cancelled && setState((before) => ({ ...before, status: 'failed', error: error.message || String(error) })));
    // Paused while the page is hidden (another tab, minimised); catches up once when it shows again.
    const repeat = repeatWhileShowing(load, MENU_REFRESH_MS);
    return () => {
      cancelled = true;
      repeat.stop();
    };
  }, [storeId, enabled]);
  return state;
}

const clock = (ms) => (ms ? new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '–');
const MIX_COLORS = ['#da291c', '#ffbc0d', '#3987e5', '#17b84a', '#9085e9', '#d55181', '#c98500', '#8b939e'];

// Orders that arrived since the last refresh get a yellow outline (and their board rows flash).
// The first answer for a store only sets the starting point, so nothing flashes on opening.
function useNewOrders(orders, status, storeId) {
  const seen = useRef(null);
  const [fresh, setFresh] = useState({});
  useEffect(() => {
    seen.current = null;
    setFresh({});
  }, [storeId]);
  useEffect(() => {
    if (status !== 'ok') return undefined;
    const ids = orders.map((order) => order.id);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return undefined;
    }
    const added = ids.filter((id) => !seen.current.has(id));
    ids.forEach((id) => seen.current.add(id));
    if (!added.length) return undefined;
    const marks = {};
    added.forEach((id) => { marks[id] = true; });
    setFresh(marks);
    const timer = setTimeout(() => setFresh({}), 20000);
    return () => clearTimeout(timer);
  }, [orders, status]); // eslint-disable-line react-hooks/exhaustive-deps
  return fresh;
}

export default function MenuBoard({ state, storeId }) {
  const { status, orders } = state;
  const fresh = useNewOrders(orders, status, storeId);
  const board = buildBoard(orders, { menuItems: MENU_ITEMS, sections: MENU_SECTIONS, now: Date.now(), breakfastEnds: BREAKFAST_ENDS });
  const freshKeys = new Set();
  orders.filter((order) => fresh[order.id]).forEach((order) => order.items.forEach((item) => freshKeys.add(placeItem(item.name, MENU_ITEMS).key)));
  const where = storeId ? `Store ${storeId}` : 'All NEXT stores';

  if (status === 'failed' && !orders.length) {
    return <WidgetCard><div className="cc-mb-empty cc-bad">Couldn't load the orders. {state.error}</div></WidgetCard>;
  }
  if (status === 'loading' && !orders.length) return <WidgetCard><div className="cc-mb-empty">Loading today's orders…</div></WidgetCard>;

  return (
    <div className="cc-mb">
      <div className="cc-mb-head">
        <span className="cc-mb-live">{status === 'failed' ? 'Not updating' : 'Live · every minute'}</span>
        <span className="cc-mb-chip">{where}</span>
        <span className="cc-mb-chip">Orders today <b>{board.totals.orders}</b></span>
        <span className="cc-mb-chip">Items <b>{board.totals.items}</b></span>
        <span className="cc-mb-chip">Last order <b>{clock(board.totals.lastTime)}</b></span>
      </div>

      {orders.length === 0 ? (
        <WidgetCard><div className="cc-mb-empty">No Archy orders yet today for {where.toLowerCase()}.</div></WidgetCard>
      ) : (
        // Two widgets to a row: the menu board across the whole row, then the four smaller ones in pairs.
        <div className="cc-widgets">
          <WidgetCard className="cc-widget-wide" title="Menu board" subtitle="Everything ordered today, by menu section">
            <div className="cc-mb-board">
              <div className="cc-mb-daypart">
                Menu shown: <span className={board.breakfast ? 'cc-on' : ''}>Breakfast</span><span className={board.breakfast ? '' : 'cc-on'}>Regular menu</span>
                <em>Grey = nothing ordered yet</em>
              </div>
              <div className="cc-mb-sections">
                {board.sections.map((section) => {
                  const top = Math.max(1, ...section.lines.map((line) => line.count));
                  return (
                    <div key={section.name} className="cc-mb-section">
                      <h4>{section.name}</h4>
                      {section.lines.map((line) => {
                        const hot = board.top.length && line.count > 0 && line.key === board.top[0].key;
                        const flash = freshKeys.has(line.key);
                        return (
                          <div key={line.key} className={`cc-mb-row${line.count ? '' : ' cc-mb-zero'}${hot ? ' cc-mb-hot' : ''}${flash && line.count ? ' cc-mb-flash' : ''}`}>
                            <div className="cc-mb-name">{line.name}{line.details && <em>{line.details}</em>}</div>
                            <div className="cc-mb-bar"><i style={{ width: `${(line.count / top) * 100}%` }} /></div>
                            <div className="cc-mb-count">{line.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title="Now serving" subtitle="The latest orders">
            <div className="cc-mb-tickets">
              {orders.slice(0, 7).map((order) => (
                <div key={order.id} className={`cc-mb-ticket${fresh[order.id] ? ' cc-mb-new' : ''}`}>
                  <div className="cc-mb-ticket-top"><span>#{order.id}</span><b>{clock(order.time)}</b></div>
                  {order.items.map((item, i) => (
                    <div key={i} className="cc-mb-ticket-item"><i>{item.qty}x</i>{item.text}</div>
                  ))}
                </div>
              ))}
            </div>
          </WidgetCard>

          <WidgetCard title="Top sellers today">
            {board.top.map((line, i) => (
              <div key={line.key} className="cc-mb-top"><span>{i + 1}</span><div>{line.name}<em>{line.section}</em></div><b>{line.count}</b></div>
            ))}
          </WidgetCard>

          <WidgetCard title="Orders by 15 minutes" subtitle="Today so far">
            <BarChart labels={board.slots.map((slot) => clock(slot.start))} values={board.slots.map((slot) => slot.count)} label="Orders" />
          </WidgetCard>

          <WidgetCard title="Basket mix" subtitle={`Largest order ${board.totals.biggest} items · ${(board.totals.items / Math.max(1, board.totals.orders)).toFixed(1)} items per order`}>
            <div className="cc-mb-mix">{board.mix.map((m, i) => <i key={m.section} style={{ width: `${m.share * 100}%`, background: MIX_COLORS[i % MIX_COLORS.length] }} />)}</div>
            <div className="cc-mb-legend">{board.mix.map((m, i) => <span key={m.section}><i style={{ background: MIX_COLORS[i % MIX_COLORS.length] }} />{m.section} {Math.round(m.share * 100)}%</span>)}</div>
          </WidgetCard>
        </div>
      )}
    </div>
  );
}
