/**
 * Custom MUI theme tokens (GNI-856). Values live in `src/app/theme/`; `docs/styling.md`
 * ("Custom Tokens") explains what each token is for.
 */
import type { CSSObject } from '@mui/material/styles';
import type { CSSProperties } from 'react';

import type { TechnologyStatus } from '../api/generated';

type LocationPalette = {
  healthy: string;
  warning: string;
  critical: string;
  unmanaged: string;
};

type BorderPalette = {
  light: string;
  default: string;
  /** Translucent info-blue frame of tooltips and slider value labels. */
  glow: string;
  /** The sidebar's fading divider line. */
  divider: string;
};

/** Translucent control surfaces on dark panels. */
type ControlPalette = {
  /** Fill of pill and form fields and of the selected-tab indicator. */
  background: string;
  /** 1px outline of form fields. */
  border: string;
};

/** The bright legacy brand blue, distinct from the navy `primary`. */
type AccentPalette = {
  /** Slider thumb ring and the default bar of progress lists. */
  main: string;
  /** Fill of the single `Progress` bar. */
  light: string;
  /** Amber strokes of the warning and empty-state illustrations. */
  amber: string;
};

/** Unfilled part of bars and sliders. */
type TrackPalette = {
  progress: string;
  list: string;
  slider: string;
};

type CustomShadows = {
  /** Top highlight + bottom shade that gives translucent surfaces their glass edge. */
  glassInset: string;
  /** Soft info-blue halo of tooltips and slider value labels. */
  glow: string;
  /** Drop shadow + top highlight of a raised pill (the selected-tab indicator). */
  raisedPill: string;
};

/** Google Maps and deck.gl colors; read them via `useMapTheme`. */
type MapPalette = {
  /** Every country's thin outline. */
  outline: string;
  /** Selected / enabled country outline. */
  outlineActive: string;
  /** Countries dimmed out of the way on a single-country map. */
  dimmedFill: string;
  /** Cluster fills by health status, matching the cluster SVG artwork. */
  clusterHealthy: string;
  clusterWarning: string;
  clusterCritical: string;
  clusterDefault: string;
  /** The point count drawn on a cluster. */
  clusterLabel: string;
};

/** three.js globe colors. */
type GlobePalette = {
  surface: string;
  countryFill: string;
  edge: string;
  particles: string;
};

/** Values for canvas/SVG charts with no semantic palette match; read them via `useChartTheme`. */
type ChartPalette = {
  /** Horizontal grid lines. */
  grid: string;
  /** Transparent bottom stop of a series' area fill. */
  fadeEnd: string;
  /** Dark end of the donut's status gradient. */
  donutFade: string;
  tooltipBackground: string;
  tooltipTitle: string;
  tooltipBody: string;
  tooltipBorder: string;
  /** Speedometer needle and hub. */
  needle: string;
  /** Speedometer label when no range matches. */
  neutral: string;
  /** Sankey nodes. */
  node: string;
  /** Hovered sankey flows. */
  highlight: string;
  /** "No data available" text drawn inside an SVG chart. */
  emptyText: string;
};

/** Translucent chips on dark panels (role scopes, selected members). */
type ChipPalette = {
  background: string;
  border: string;
  /** A "+N" counter chip: one step stronger than a plain chip. */
  counter: string;
  counterHover: string;
};

/** Brand colors that are not part of the app palette. */
type BrandPalette = {
  /** McDonald's yellow of the login submit button. */
  loginCta: string;
  /** Microsoft's sign-in button, per their branding guidelines (dark or light variant). */
  microsoft: string;
  microsoftHover: string;
  microsoftText: string;
  microsoftBorder: string;
};

/** Filled pill buttons and the map controls' hover: navy in the dark scheme, light blue in the light one. */
type TonalPalette = {
  background: string;
  hover: string;
  /** Icon and label color on `background` and `hover`. */
  text: string;
};

/** Dim layers drawn over the page. */
type OverlayPalette = {
  /** Behind a full-page loading spinner. */
  backdrop: string;
};

/** Golden accent of the warning `AlertCard`. */
type NoticePalette = {
  glow: string;
  border: string;
};

type Gradients = {
  /** Faint diagonal sheen drawn as the 1px border of pill-shaped inputs and buttons. */
  appBorder: string;
  /** Top-to-bottom fill of the legacy card surface. */
  card: string;
  /** Alpha mask that fades sparkline charts in and out at their edges. */
  sparklineFade: string;
};

declare module '@mui/material/styles' {
  /** The app theme always has CSS variables, so `theme.vars` and the color-scheme API are typed. */
  interface CssThemeVariables {
    enabled: true;
  }

  interface Palette {
    tonal: TonalPalette;
    technology: Record<TechnologyStatus, string>;
    location: LocationPalette;
    border: BorderPalette;
    control: ControlPalette;
    accent: AccentPalette;
    track: TrackPalette;
    notice: NoticePalette;
    brand: BrandPalette;
    overlay: OverlayPalette;
    chip: ChipPalette;
    chart: ChartPalette;
    map: MapPalette;
    globe: GlobePalette;
  }

  interface PaletteOptions {
    tonal?: TonalPalette;
    technology?: Record<TechnologyStatus, string>;
    location?: LocationPalette;
    border?: BorderPalette;
    control?: ControlPalette;
    accent?: AccentPalette;
    track?: TrackPalette;
    notice?: NoticePalette;
    brand?: BrandPalette;
    overlay?: OverlayPalette;
    chip?: ChipPalette;
    chart?: ChartPalette;
    map?: MapPalette;
    globe?: GlobePalette;
  }

  interface TypeBackground {
    table: string;
    /** Surface of modal dialogs. */
    dialog: string;
    /** Fill of the `widget` card variant. */
    widget: string;
    /** Fill of a `widget` card inside another one (the same as `widget` in the dark scheme). */
    nestedWidget: string;
    /** Surface of tooltips and slider value labels. */
    tooltip: string;
  }

  interface TypeText {
    /** Idle label on a dark control surface (tabs, hardware-type buttons). */
    muted: string;
    /** Hovered label or secondary copy on a dark surface. */
    subtle: string;
    /** Label of an inactive (not contained) button. */
    inactive: string;
    /** Pale blue-white secondary readings (weather details). */
    pale: string;
  }

  interface Theme {
    customShadows: CustomShadows;
    gradients: Gradients;
  }

  interface ThemeOptions {
    customShadows?: CustomShadows;
    gradients?: Gradients;
  }

  /**
   * Tokens that differ per color scheme. MUI merges a scheme's keys into the theme while that
   * scheme is active, so `theme.customShadows` & co. follow the scheme like `theme.palette`.
   */
  interface ColorSystemOptions {
    customShadows?: CustomShadows;
    gradients?: Gradients;
    mixins?: MixinsOptions;
  }

  /** The built scheme (`theme.colorSchemes.light`) keeps the same tokens. */
  interface ColorSystem {
    customShadows?: CustomShadows;
    gradients?: Gradients;
    mixins?: MixinsOptions;
  }

  interface TypographyVariants {
    fontWeightSemiBold: CSSProperties['fontWeight'];
    cardTitle: CSSProperties;
    controlLabel: CSSProperties;
    metricValue: CSSProperties;
  }

  interface TypographyVariantsOptions {
    fontWeightSemiBold?: CSSProperties['fontWeight'];
    cardTitle?: CSSProperties;
    controlLabel?: CSSProperties;
    metricValue?: CSSProperties;
  }

  interface Shape {
    /** Fully rounded ends for inputs, buttons and map controls. */
    pill: number;
    /** Corner radius of widget cards. */
    card: number;
    /** Corner radius of table and map panels. */
    panel: number;
    /** Small radius of the login buttons and inline alerts. */
    compact: number;
  }

  interface ShapeOptions {
    pill?: number;
    card?: number;
    panel?: number;
    compact?: number;
  }

  interface ZIndex {
    /** Overlay container that sits above the Google Map tiles. */
    mapOverlay: number;
    /** The deck.gl canvas inside the Google Maps overlay pane. */
    mapCanvas: number;
    /** d3 chart tooltips appended to `<body>`. */
    chartTooltip: number;
  }

  interface Mixins {
    /**
     * The 1px gradient "sheen" ring of pill inputs and contained buttons. Spread it into the
     * element's `'&::before'`; the element needs `position: relative`.
     */
    sheenBorder: CSSObject;
  }

  interface MixinsOptions {
    sheenBorder?: CSSObject;
  }

  interface BreakpointOverrides {
    xxl: true;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    cardTitle: true;
    controlLabel: true;
    metricValue: true;
  }
}

declare module '@mui/material/Paper' {
  /** Card surfaces registered in `src/app/theme/components.ts` (`<Card variant="widget">`). */
  interface PaperPropsVariantOverrides {
    /** Translucent, blurred panel with a glass edge (`GlassCard`, `WidgetWrapper variant="glass"`). */
    glass: true;
    /** Navy-tinted widget card (`AppCard`, `WidgetWrapper`). */
    widget: true;
  }
}
