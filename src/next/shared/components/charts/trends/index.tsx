import type { ScriptableContext, TooltipItem } from 'chart.js';
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { useChartTheme } from '../../../hooks/use-chart-theme';
import { useIsChartJsReady } from '../../../hooks/use-is-chart-js-ready';
import { compactNumber } from '../../../utils/numbers';

import {
  ChartContainer,
  ChartWrapper,
  IndicatorItem,
  LineCircle,
  LineContainer,
  LineIndicatorRow,
  LineLabel,
  LinePreview,
} from './trends.styled';

const defaultChartStyles = {
  height: 170,
};

export interface TrendsChartProps {
  title?: string;
  subtitle?: string;
  chartStyles?: React.CSSProperties;
  ticksLimit?: number;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string | ((context: ScriptableContext<'line'>) => CanvasGradient);
      borderDash?: number[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
    }>;
  };
}
const TICKS_LIMIT = 13; // Default maximum number of ticks on the x-axis
const TrendsChart: React.FC<TrendsChartProps> = ({
  data,
  chartStyles = defaultChartStyles,
  ticksLimit = TICKS_LIMIT,
}) => {
  const isChartReady = useIsChartJsReady();
  const chartTheme = useChartTheme();

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
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
            label: (context: TooltipItem<'line'>) => {
              const label = context.dataset.label ?? '';
              const value = context.parsed.y ?? 0;

              return `${label}: ${compactNumber(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: ticksLimit,
            color: chartTheme.tick,
            grid: {
              display: false,
            },
          },
        },

        y: {
          grid: {
            color: chartTheme.grid,
            lineWidth: 1,
            drawBorder: false,
            drawTicks: false,
            borderDash: [5, 5],
            borderDashOffset: 5,
            drawOnChartArea: true,
          },
          ticks: {
            color: chartTheme.tick,
            callback: (value: string | number) =>
              typeof value === 'number' ? compactNumber(value) : value,
          },
          min: 0,
        },
      },
      elements: {
        line: {
          borderWidth: 2,
        },
        point: {
          radius: 3,
          hoverRadius: 5,
          hitRadius: 10,
        },
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
    }),
    [chartTheme, ticksLimit]
  );

  const renderLegends = () => {
    if (!data?.datasets?.length) return null;

    return (
      <LineIndicatorRow>
        {data.datasets.map((dataset, index) => (
          <IndicatorItem key={index}>
            <LineContainer>
              <LinePreview lineColor={dataset.borderColor} isDashed={Boolean(dataset.borderDash)} />
              <LineCircle lineColor={dataset.borderColor} />
            </LineContainer>
            <LineLabel component="span" variant="caption">
              {dataset.label}
            </LineLabel>
          </IndicatorItem>
        ))}
      </LineIndicatorRow>
    );
  };

  if (!isChartReady) return null;

  return (
    // eslint-disable-next-line no-restricted-syntax -- forwards the caller's `chartStyles` prop
    <ChartContainer style={chartStyles}>
      <ChartWrapper>
        <Line
          options={options}
          data={data}
          role="img"
          aria-label={`Trend chart: ${data.datasets
            .map((dataset) => dataset.label)
            .filter(Boolean)
            .join(', ')}`}
        />
      </ChartWrapper>
      {renderLegends()}
    </ChartContainer>
  );
};

export default TrendsChart;
