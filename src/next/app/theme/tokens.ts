import type { BreakpointsOptions, ShapeOptions, Theme, ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

import { darkColors as dark, lightColors as light } from './palette';

export const shape: ShapeOptions = {
  borderRadius: 10,
  pill: 50,
  card: 8,
  panel: 12,
  compact: 4,
};

/** MUI's default breakpoints plus `xxl` for wide dashboard screens. */
export const breakpoints: BreakpointsOptions = {
  values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536, xxl: 1920 },
};

export const zIndex: ThemeOptions['zIndex'] = {
  mapOverlay: 10,
  mapCanvas: 200,
  chartTooltip: 1000,
};

// An alpha mask, not a color: only the stops' opacity matters, so both schemes share it.
const sparklineFade =
  'linear-gradient(to right, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%)';

type CustomShadows = Theme['customShadows'];
type Gradients = Theme['gradients'];
type SchemeTokens = {
  customShadows: CustomShadows;
  gradients: Gradients;
  mixins: NonNullable<ThemeOptions['mixins']>;
};

/** A scheme's shadows and gradients, plus the mixins built from them. */
const createSchemeTokens = (customShadows: CustomShadows, gradients: Gradients): SchemeTokens => ({
  customShadows,
  gradients,
  mixins: {
    sheenBorder: {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: shape.pill,
      padding: '1px',
      background: gradients.appBorder,
      // Masks the fill out of the content box, leaving only the 1px padding ring.
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      pointerEvents: 'none',
    },
  },
});

export const darkTokens = createSchemeTokens(
  {
    glassInset: `inset 0 1px 1px ${alpha(dark.white, 0.15)}, inset 0 -1px 1px ${alpha(dark.black, 0.35)}`,
    glow: `5px 5px 30px 0px ${alpha(dark.blue, 0.2)}, -5px -5px 30px 0px ${alpha(dark.blue, 0.2)} inset`,
    raisedPill: `0 1px 2px ${alpha(dark.black, 0.6)}, inset 0 1px 1px ${alpha(dark.white, 0.35)}`,
  },
  {
    appBorder: `linear-gradient(154.91deg, ${alpha(dark.white, 0.4)} 7.86%, ${alpha(dark.white, 0.0001)} 38.39%, ${alpha(dark.white, 0.0001)} 53.66%, ${alpha(dark.white, 0.1)} 84.19%)`,
    card: `linear-gradient(to bottom, ${alpha(dark.navy, 0.2)}, ${alpha(dark.ink, 0.5)})`,
    sparklineFade,
  }
);

// On a light surface a white sheen is invisible, so the light scheme draws its edges with
// translucent black, as MUI's light theme does.
export const lightTokens = createSchemeTokens(
  {
    glassInset: `inset 0 0 0 1px ${alpha(light.black, 0.08)}, inset 0 1px 1px ${alpha(light.white, 0.6)}`,
    // MUI's elevation 2: tooltips and slider labels are white cards like the chart tooltip.
    glow: `0px 3px 1px -2px ${alpha(light.black, 0.2)}, 0px 2px 2px 0px ${alpha(light.black, 0.14)}, 0px 1px 5px 0px ${alpha(light.black, 0.12)}`,
    raisedPill: `0 1px 2px ${alpha(light.black, 0.2)}, inset 0 1px 1px ${alpha(light.white, 0.6)}`,
  },
  {
    appBorder: `linear-gradient(154.91deg, ${alpha(light.black, 0.2)} 7.86%, ${alpha(light.black, 0.08)} 38.39%, ${alpha(light.black, 0.08)} 53.66%, ${alpha(light.black, 0.14)} 84.19%)`,
    card: `linear-gradient(to bottom, ${alpha(light.black, 0.02)}, ${alpha(light.black, 0.04)})`,
    sparklineFade,
  }
);
