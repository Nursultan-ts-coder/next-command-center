import type { ScriptableContext } from 'chart.js';

import type { ChartTheme } from '../hooks/use-chart-theme';

/** Vertical fill under a line, from `top` at the chart's top edge to `bottom` 400px down. */
const createAreaGradient =
  ([top, bottom]: readonly [string, string]) =>
  (context: ScriptableContext<'line'>) => {
    const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
  };

const lineOption = {
  borderWidth: 2,
  pointRadius: 0,
  pointHoverRadius: 6,
  tension: 0.3,
};

const createFilledDatasetOption = (chartTheme: ChartTheme) => ({
  ...lineOption,
  borderColor: chartTheme.series.info,
  fill: true,
  backgroundColor: createAreaGradient(chartTheme.areaFill.info),
});

const dashedDatasetOption = {
  ...lineOption,
  borderDash: [6, 6],
  fill: false,
};

/** Primary series filled, comparison series dashed and filled green. */
export const createHistoricalDatasetOptions = (chartTheme: ChartTheme) => [
  createFilledDatasetOption(chartTheme),
  {
    ...dashedDatasetOption,
    fill: true,
    borderColor: chartTheme.series.success,
    backgroundColor: createAreaGradient(chartTheme.areaFill.success),
  },
];

/** Informational series filled, warning and critical series dashed. */
export const createStatusDatasetOptions = (chartTheme: ChartTheme) => [
  createFilledDatasetOption(chartTheme),
  {
    ...dashedDatasetOption,
    borderColor: chartTheme.series.warning,
  },
  {
    ...dashedDatasetOption,
    borderColor: chartTheme.series.error,
  },
];
