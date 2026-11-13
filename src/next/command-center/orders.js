/*
 * orders.js: the numbers for a chart. A chart's data, from the data layer (data/index.js,
 * fetchChartSeries), is { buckets: [{ start, end }], bySeries: { name: [value per slot] } }.
 * No React code in here, so it is easy to read and test.
 */

// "00844", "844" and 844 are all the same store. Other names are left alone.
export function storeKey(value) {
  const text = String(Array.isArray(value) ? value[0] : value === null || value === undefined ? '' : value).trim();
  return /^\d+$/.test(text) ? String(Number(text)) : text;
}

// Joins neighbouring slots so a bar chart never has more than `most` bars. Only right for counts.
export function fewerBuckets(data, most) {
  const every = Math.ceil(data.buckets.length / most);
  if (every <= 1) return data;
  const buckets = [];
  for (let i = 0; i < data.buckets.length; i += every) {
    const last = data.buckets[Math.min(i + every, data.buckets.length) - 1];
    buckets.push({ start: data.buckets[i].start, end: last.end });
  }
  const bySeries = {};
  Object.keys(data.bySeries).forEach((key) => {
    bySeries[key] = buckets.map((bucket, b) => data.bySeries[key].slice(b * every, b * every + every).reduce((sum, value) => sum + (value || 0), 0));
  });
  return { buckets, bySeries };
}

// The numbers to draw for a count: one store's, or every store added together when no store is picked.
export function seriesFor(data, storeId) {
  const empty = data.buckets.map(() => 0);
  if (storeId) return (data.bySeries[storeKey(storeId)] || empty).map((value) => value || 0);
  return Object.keys(data.bySeries).reduce((sum, key) => sum.map((value, i) => value + (data.bySeries[key][i] || 0)), empty);
}

/*
 * The headline for a count chart.
 *   total    the whole window added up
 *   lastEnd  the end of the latest slot that had anything (null if none)
 *   recent   true when that slot ended within recentMinutes of now
 */
export function summarize(buckets, values, now, recentMinutes) {
  let total = 0;
  let lastEnd = null;
  values.forEach((value, i) => {
    total += value || 0;
    if (value > 0) lastEnd = buckets[i].end;
  });
  return { total, lastEnd, recent: lastEnd !== null && now - lastEnd <= recentMinutes * 60 * 1000 };
}

/*
 * For a 'lines' chart: the busiest FACET values, each as { key, values, latest, peak }.
 * Names with no numbers at all are left out. Returns { series, hidden } where
 * hidden is how many more had numbers but did not fit.
 */
export function topSeries(data, most) {
  const all = Object.keys(data.bySeries)
    .map((key) => {
      const values = data.bySeries[key];
      const real = values.filter((value) => value !== null);
      return { key, values, latest: real.length ? real[real.length - 1] : null, peak: real.length ? Math.max(...real) : null };
    })
    .filter((series) => series.peak !== null && series.peak > 0)
    .sort((a, b) => b.peak - a.peak || a.key.localeCompare(b.key));
  return { series: all.slice(0, most), hidden: Math.max(0, all.length - most) };
}

// A round number at or above the tallest value, and the gridlines to draw: 0, halfway, top.
// Counts only get whole-number gridlines.
export function niceScale(max, fractions) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const power = 10 ** Math.floor(Math.log10(max));
  const round = (value) => Number(value.toPrecision(6));
  const top = round([1, 2, 4, 5, 6, 8, 10].map((step) => step * power).find((step) => step >= max * 0.9999));
  const half = round(top / 2);
  if (!fractions && top < 1) return { top: 1, ticks: [0, 1] };
  return { top, ticks: fractions || Number.isInteger(half) ? [0, half, top] : [0, top] };
}

// How a value is written: 1,284 for a count, 4.2% for a rate.
export function formatValue(value, unit) {
  if (value === null || value === undefined) return '–';
  if (unit === 'percent') {
    const percent = value * 100;
    return `${percent >= 10 || percent === 0 ? Math.round(percent) : Number(percent.toFixed(1))}%`;
  }
  return Number(value.toFixed(2)).toLocaleString();
}

export const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/*
 * The times to print under a chart, as [{ at, label }] where at is 0 (left edge) to 1 (right edge).
 * Picks a round gap (5 minutes, 1 hour, ...) that gives no more than seven labels.
 */
export function timeTicks(buckets) {
  if (buckets.length === 0) return [];
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;
  if (!(to > from)) return [];
  const minute = 60 * 1000;
  const step = [1, 2, 5, 10, 15, 30, 60, 120, 180, 240, 360, 720, 1440].map((m) => m * minute).find((gap) => (to - from) / gap <= 7) || 1440 * minute;
  const shift = new Date(from).getTimezoneOffset() * minute; // so 2-hour gaps land on even local hours
  const ticks = [];
  for (let at = Math.ceil((from - shift) / step) * step + shift; at < to; at += step) {
    const fraction = (at - from) / (to - from);
    if (fraction <= 0.94) {
      ticks.push({ at: fraction, label: step >= 60 * minute ? new Date(at).toLocaleTimeString([], { hour: 'numeric' }) : clock(at) });
    }
  }
  return ticks;
}
