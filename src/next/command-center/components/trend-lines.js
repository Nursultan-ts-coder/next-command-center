/*
 * trend-lines.js: the lines for grafana-restraurant-custom-widgets' TrendsChart
 * (src/shared/components/charts/trends), styled by that project's own line options
 * (src/shared/const/charts.ts): smooth 2px lines with no points until hovered, the first one
 * filled with a fading gradient, warning and critical lines dashed.
 * `chartTheme` is grafana's useChartTheme().
 */
import { createHistoricalDatasetOptions, createStatusDatasetOptions } from '@/shared/const/charts';

// Colours for charts with one line per group, in a fixed order.
export const LINE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];

/** A filled line, grafana's first ("info") series. */
export function filledLine(chartTheme, label, data) {
  return { ...createHistoricalDatasetOptions(chartTheme)[0], label, data };
}

/** A plain line in its own colour (grafana's info blue unless given one). */
export function plainLine(chartTheme, label, data, color = chartTheme.series.info) {
  return { ...createHistoricalDatasetOptions(chartTheme)[0], label, data, borderColor: color, backgroundColor: color, fill: false };
}

/** A dashed limit line: grafana's warning (orange) or critical (red) series. */
export function dashedLine(chartTheme, label, data, level = 'warning') {
  const [, warning, critical] = createStatusDatasetOptions(chartTheme);
  return { ...(level === 'critical' ? critical : warning), label, data, backgroundColor: level === 'critical' ? chartTheme.series.error : chartTheme.series.warning };
}
