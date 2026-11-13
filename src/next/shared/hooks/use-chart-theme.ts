import type { Theme } from '@mui/material/styles';
import { alpha, useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

const buildChartTheme = (theme: Theme) => {
  const { palette, typography } = theme;

  return {
    /** Line and arc colors by status. */
    series: {
      info: palette.info.main,
      success: palette.success.main,
      warning: palette.warning.main,
      error: palette.error.main,
    },
    /** Top and bottom stops of the area fill under a series line. */
    areaFill: {
      info: [alpha(palette.info.main, 0.3), palette.chart.fadeEnd] as [string, string],
      success: [alpha(palette.success.main, 0.2), palette.chart.fadeEnd] as [string, string],
    },
    grid: palette.chart.grid,
    tick: palette.text.primary,
    tooltip: {
      background: palette.chart.tooltipBackground,
      title: palette.chart.tooltipTitle,
      body: palette.chart.tooltipBody,
      border: palette.chart.tooltipBorder,
    },
    /** Dark end of the donut's status gradient. */
    donutFade: palette.chart.donutFade,
    speedometer: {
      needle: palette.chart.needle,
      /** Status label color when the value matches no range. */
      fallback: palette.chart.neutral,
    },
    sankey: {
      flow: palette.info.main,
      node: palette.chart.node,
      highlight: palette.chart.highlight,
      label: palette.text.primary,
      emptyText: palette.chart.emptyText,
      labelFontSize: typography.pxToRem(10),
      labelFontWeight: typography.fontWeightSemiBold,
      tooltip: {
        background: palette.chart.tooltipBackground,
        color: palette.text.primary,
        padding: theme.spacing(1),
        borderRadius: `${theme.shape.compact}px`,
        fontSize: String(typography.body2.fontSize),
        zIndex: theme.zIndex.chartTooltip,
      },
    },
  };
};

/** Theme colors and type for chart libraries (Chart.js, d3) that take JS values, not CSS. */
export type ChartTheme = ReturnType<typeof buildChartTheme>;

/**
 * Chart colors read from the MUI theme, memoized per theme so chart options and d3 renders that
 * depend on them stay stable across re-renders.
 */
export const useChartTheme = (): ChartTheme => {
  const theme = useTheme();
  return useMemo(() => buildChartTheme(theme), [theme]);
};
