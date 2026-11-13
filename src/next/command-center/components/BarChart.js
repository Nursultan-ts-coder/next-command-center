/*
 * BarChart.js: a bar for each time slot, in the style of grafana-restraurant-custom-widgets'
 * TrendsChart (src/shared/components/charts/trends), which has no bar chart of its own: the same
 * container, theme colours (useChartTheme), tooltip, dashed grid and compact y axis from 0.
 */
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartContainer, ChartWrapper } from '@/shared/components/charts/trends/trends.styled';
import { useChartTheme } from '@/shared/hooks/use-chart-theme';
import { useIsChartJsReady } from '@/shared/hooks/use-is-chart-js-ready';
import { compactNumber } from '@/shared/utils/numbers';

/**
 *   labels   one label per bar (the x axis)
 *   values   one number per bar
 *   label    what a bar counts, for the tooltip
 *   format   how a number reads in the tooltip and on the y axis
 */
export default function BarChart({ labels, values, label, color, height = 170, ticksLimit = 13, format = compactNumber }) {
  const isChartReady = useIsChartJsReady();
  const chartTheme = useChartTheme();

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltip.background,
        titleColor: chartTheme.tooltip.title,
        bodyColor: chartTheme.tooltip.body,
        borderColor: chartTheme.tooltip.border,
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: (context) => `${context.dataset.label || ''}: ${format(context.parsed.y === null || context.parsed.y === undefined ? 0 : context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: ticksLimit, maxRotation: 0, color: chartTheme.tick },
      },
      y: {
        min: 0,
        border: { display: false, dash: [5, 5] },
        grid: { color: chartTheme.grid, lineWidth: 1, drawTicks: false },
        ticks: { color: chartTheme.tick, callback: (value) => (typeof value === 'number' ? format(value) : value) },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }), [chartTheme, ticksLimit, format]);

  const data = useMemo(() => ({
    labels,
    datasets: [{
      label,
      data: values,
      backgroundColor: color || chartTheme.series.info,
      hoverBackgroundColor: color || chartTheme.series.info,
      borderRadius: 4,
      maxBarThickness: 24,
      categoryPercentage: 0.9,
      barPercentage: 0.9,
    }],
  }), [labels, values, label, color, chartTheme]);

  if (!isChartReady) return null;

  return (
    <ChartContainer style={{ height }}>
      <ChartWrapper>
        <Bar options={options} data={data} role="img" aria-label={`Bar chart: ${label}`} />
      </ChartWrapper>
    </ChartContainer>
  );
}
