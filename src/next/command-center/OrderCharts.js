import React from 'react';

import TrendsChart from '@/shared/components/charts/trends';
import { useChartTheme } from '@/shared/hooks/use-chart-theme';
import { seriesFor, summarize, fewerBuckets, topSeries, formatValue, clock } from './orders';
import BarChart from './components/BarChart';
import { LINE_COLORS, filledLine, plainLine } from './components/trend-lines';
import WidgetCard from './components/WidgetCard';

const MOST_BARS = 48; // a bar chart with more slots than this has neighbours joined
const MOST_POINTS = 72; // the same for a 'line' or 'area' chart of counts, so one-minute data isn't all spikes
const MOST_LINES = 6; // a 'lines' chart shows this many lines at most

// A name keeps its colour for as long as the page is open, so DoorDash is the same colour in every chart.
const colorByName = {};
function colorFor(name) {
  if (!colorByName[name]) colorByName[name] = LINE_COLORS[Object.keys(colorByName).length % LINE_COLORS.length];
  return colorByName[name];
}

/*
 * One chart's widget card: the title, the line under it, the total on the right, and the chart.
 * Without a chart (loading, failed, nothing to show) it keeps the chart's height, so the cards in
 * a row stay level.
 */
function ChartCard({ chart, note, bad, stale, total, unitText, children }) {
  return (
    <WidgetCard
      className={`cc-oc${stale ? ' cc-oc-stale' : ''}`}
      title={chart.title}
      subtitle={<span className={`cc-oc-note${bad ? ' cc-bad' : ''}`}>{note}</span>}
      actions={total !== null && total !== undefined ? (
        <>
          <b className="cc-oc-total">{total}</b>
          {unitText && <span className="cc-oc-unit">{unitText}</span>}
        </>
      ) : null}
    >
      {children || <div className="cc-oc-blank" />}
    </WidgetCard>
  );
}

/*
 * One chart.
 *   state    { status: 'loading' | 'ok' | 'failed' | 'missing', data, windowText, problem }
 *   storeId  the selected store, or '' for every store added together
 * Point at the chart and its tooltip shows that slot's time and number.
 */
function Chart({ chart, state, storeId, recentMinutes }) {
  const chartTheme = useChartTheme();
  const { status } = state;

  if (status === 'missing') return <ChartCard chart={chart} bad note={state.problem} />;
  if (!state.data) return <ChartCard chart={chart} bad={status === 'failed'} note={status === 'failed' ? "Couldn't load this chart." : 'Loading…'} />;

  const manyLines = chart.style === 'lines';
  const data = manyLines ? state.data : fewerBuckets(state.data, chart.style === 'bars' ? MOST_BARS : MOST_POINTS);
  const { buckets } = data;
  const windowText = state.windowText || '';
  const where = manyLines ? 'all stores' : storeId ? `store ${storeId}` : 'all NEXT stores';
  if (buckets.length === 0) {
    const none = chart.countsAs === 'orders' ? 'No orders' : 'None';
    return <ChartCard chart={chart} note={<><i className="cc-oc-dot" />{`${none} ${windowText}`.trim()} at any store</>} />;
  }

  let lines;
  let hidden = 0;
  let total = null;
  let unitText = '';
  let note;
  if (manyLines) {
    const top = topSeries(data, MOST_LINES);
    hidden = top.hidden;
    lines = top.series.slice().sort((a, b) => a.key.localeCompare(b.key)).map((series) => ({ ...series, color: colorFor(series.key) }));
    const latest = top.series.filter((series) => series.latest !== null).sort((a, b) => b.latest - a.latest)[0];
    if (latest) {
      total = formatValue(latest.latest, chart.unit);
      unitText = 'highest now';
    }
    note = lines.length === 0 ? `Nothing above zero ${windowText}` : chart.note || `${where}, one line per ${chart.lineName || 'group'}`;
  } else {
    const values = seriesFor(data, storeId);
    const summary = summarize(buckets, values, Date.now(), recentMinutes);
    lines = [{ key: chart.title, color: chart.color || chartTheme.series.info, values }];
    total = formatValue(summary.total, chart.unit);
    unitText = windowText;
    if (chart.countsAs === 'orders' && summary.recent) {
      note = <><i className="cc-oc-dot cc-oc-on" />Orders in the last {recentMinutes} minutes</>;
    } else if (summary.lastEnd) {
      note = <><i className="cc-oc-dot" />{chart.countsAs === 'orders' ? 'No orders since' : 'Most recent before'} {clock(summary.lastEnd)}</>;
    } else {
      note = <><i className="cc-oc-dot" />{chart.countsAs === 'orders' ? 'No orders' : 'None'} {windowText}</>;
    }
  }
  const labels = buckets.map((bucket) => clock(bucket.start));

  return (
    <ChartCard chart={chart} note={note} stale={status === 'failed'} total={total} unitText={unitText}>
      {chart.style === 'bars' ? (
        <BarChart labels={labels} values={lines[0].values} label={chart.noun || chart.title} color={chart.color} format={(value) => formatValue(value, chart.unit)} />
      ) : (
        // grafana's trend chart: 'area' is its filled line, 'line' a plain one, 'lines' one line per
        // group in that group's own colour, with its legend under the chart.
        <TrendsChart
          data={{
            labels,
            datasets: lines.map((line) => (chart.style === 'area' ? filledLine(chartTheme, line.key, line.values) : plainLine(chartTheme, line.key, line.values, line.color))),
          }}
        />
      )}
      {manyLines && hidden > 0 && <p className="cc-oc-more-note">and {hidden} more with lower peaks</p>}

      {/* The same numbers as a table, for screen readers. */}
      <table className="cc-sr">
        <caption>{chart.title}, {where} {windowText}</caption>
        <thead><tr><th scope="col">Time</th>{lines.map((line) => <th key={line.key} scope="col">{line.key}</th>)}</tr></thead>
        <tbody>
          {buckets.map((bucket, i) => (
            <tr key={bucket.start}><th scope="row">{clock(bucket.start)}</th>{lines.map((line) => <td key={line.key}>{formatValue(line.values[i], chart.unit)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  );
}

/*
 * Every chart, grouped under the group's heading in the order the groups first appear, two
 * widgets to a row.
 *   states  one state per chart, in the same order as charts
 */
export default function ChartPanels({ charts, states, storeId, recentMinutes }) {
  const groups = [];
  charts.forEach((chart, index) => {
    const name = chart.group || 'Charts';
    let group = groups.find((item) => item.name === name);
    if (!group) groups.push((group = { name, items: [] }));
    group.items.push({ chart, state: states[index] });
  });

  return (
    <div className="cc-ord">
      {groups.map((group) => {
        // "Taking orders" only makes sense for one store, and only once every order chart has an answer.
        const orderCharts = group.items.filter((item) => item.chart.countsAs === 'orders' && item.chart.style !== 'lines');
        let signal = null;
        if (storeId && orderCharts.length > 0 && orderCharts.every((item) => item.state.data)) {
          const now = Date.now();
          const recent = orderCharts.some((item) => summarize(item.state.data.buckets, seriesFor(item.state.data, storeId), now, recentMinutes).recent);
          signal = recent ? (
            <i className="cc-signal cc-signal-on"><em />Taking orders</i>
          ) : (
            <i className="cc-signal"><em />No orders in the last {recentMinutes} minutes</i>
          );
        }
        const perStore = group.items.some((item) => item.chart.style !== 'lines');
        return (
          <section key={group.name} className="cc-group">
            <h2 className="cc-group-head">
              {group.name} <span>{!perStore ? 'All stores' : storeId ? `Store ${storeId}` : 'All NEXT stores'}</span>
              {signal}
            </h2>
            <div className="cc-widgets">
              {group.items.map((item) => (
                <Chart key={item.chart.title} chart={item.chart} state={item.state} storeId={storeId} recentMinutes={recentMinutes} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
