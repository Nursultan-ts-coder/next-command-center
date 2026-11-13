import { blue, blueGrey, common, green, grey, lightBlue, orange, red } from '@mui/material/colors';
import type { PaletteOptions } from '@mui/material/styles';
import { alpha, darken } from '@mui/material/styles';

import { TechnologyStatus } from '../../api/generated';

/**
 * The raw colors of the dark scheme. This file is the only place colors are defined: components
 * read them through the theme (`theme.palette.*`, `useChartTheme`, `useMapTheme`). Exported for the
 * other theme modules (`tokens.ts`), never for components.
 */
export const darkColors = {
  white: 'rgba(255, 255, 255, 1)',
  black: 'rgba(0, 0, 0, 1)',
  navy: 'rgba(11, 22, 76, 1)',
  navyLight: 'rgba(21, 41, 140, 1)',
  navyDeep: 'rgba(16, 29, 94, 1)',
  green: 'rgba(34, 197, 93, 1)',
  greenLight: 'rgba(74, 222, 128, 1)',
  greenDark: 'rgba(21, 128, 61, 1)',
  red: 'rgba(226, 70, 70, 1)',
  redLight: 'rgba(248, 113, 113, 1)',
  redDark: 'rgba(185, 28, 28, 1)',
  orange: 'rgba(251, 146, 60, 1)',
  orangeLight: 'rgba(253, 186, 116, 1)',
  orangeDark: 'rgba(234, 88, 12, 1)',
  blue: 'rgba(59, 130, 246, 1)',
  blueLight: 'rgba(96, 165, 250, 1)',
  ink: 'rgba(6, 12, 41, 1)',
  slate: 'rgba(15, 23, 42, 1)',
  tableInk: 'rgba(10, 15, 44, 1)',
  steel: 'rgba(147, 162, 183, 1)',
  silver: '#e3e3e3',
  borderLight: 'rgba(226, 232, 240, 1)',
  borderDefault: 'rgba(51, 65, 85, 1)',
} as const;

const c = darkColors;

// What MUI derives as a color's `dark` shade when none is given (`createPalette`); spelled out so
// both schemes list the same keys.
const muiDark = (color: string) => darken(color, 0.3);

/** Palette of the `dark` color scheme, the app's default. */
export const darkPalette = {
  primary: { main: c.navy, light: c.navyLight, dark: muiDark(c.navy) },
  secondary: { main: c.navyDeep, light: c.navy },
  success: { main: c.green, light: c.greenLight, dark: c.greenDark },
  error: { main: c.red, light: c.redLight, dark: c.redDark },
  warning: { main: c.orange, light: c.orangeLight, dark: c.orangeDark },
  info: { main: c.blue, light: c.blueLight, dark: muiDark(c.blue) },
  background: {
    default: c.ink,
    paper: c.slate,
    table: c.tableInk,
    dialog: c.navy,
    widget: alpha(c.navy, 0.2),
    nestedWidget: alpha(c.navy, 0.2),
    tooltip: c.ink,
  },
  // The filled pill buttons (refresh, theme, "Go home") and the map controls' hover. In the dark
  // scheme these are MUI's contained-primary colors: `primary.main` and its computed `dark`.
  tonal: {
    background: c.navy,
    hover: muiDark(c.navy),
    text: c.white,
  },
  text: {
    primary: c.white,
    secondary: c.steel,
    disabled: alpha(c.steel, 0.5),
    muted: alpha(c.white, 0.55),
    subtle: alpha(c.white, 0.8),
    inactive: 'rgba(163, 164, 169, 1)',
    pale: '#dfe6ff',
  },
  border: {
    light: c.borderLight,
    default: c.borderDefault,
    glow: alpha(c.blue, 0.8),
    divider: alpha(c.white, 0.55),
  },
  control: {
    background: alpha(c.white, 0.05),
    border: alpha(c.white, 0.23),
  },
  map: {
    outline: 'hsla(221, 65%, 24%, 1.00)',
    outlineActive: '#ffffff',
    dimmedFill: '#000000ff',
    clusterHealthy: 'rgb(37, 244, 102)',
    clusterWarning: 'rgb(255, 152, 0)',
    clusterCritical: 'rgb(252, 42, 42)',
    clusterDefault: 'rgb(33, 144, 235)',
    clusterLabel: '#ffffff',
  },
  globe: {
    surface: '#101530',
    countryFill: 'rgba(11, 24, 98, 1)',
    edge: 'blue',
    particles: '#5786F5',
  },
  chart: {
    grid: 'rgba(217, 217, 217, 0.1)',
    fadeEnd: 'rgba(0, 0, 0, 0)',
    donutFade: '#030815ff',
    tooltipBackground: alpha(c.black, 0.8),
    tooltipTitle: alpha(c.white, 0.9),
    tooltipBody: alpha(c.white, 0.7),
    tooltipBorder: alpha(c.white, 0.1),
    needle: '#0169fa',
    neutral: '#374151',
    node: '#2052AF',
    highlight: '#194b9bff',
    emptyText: '#888',
  },
  chip: {
    background: alpha(c.white, 0.08),
    border: alpha(c.white, 0.16),
    counter: alpha(c.white, 0.16),
    counterHover: alpha(c.white, 0.24),
  },
  brand: {
    loginCta: '#fdc82f',
    // Microsoft's sign-in button colors, required by their branding guidelines (dark variant).
    microsoft: '#2f2f2f',
    microsoftHover: '#1f1f1f',
    microsoftText: c.white,
    // The dark variant has no outline.
    microsoftBorder: 'transparent',
  },
  overlay: {
    backdrop: alpha(c.black, 0.5),
  },
  notice: {
    glow: 'rgb(172, 132, 63)',
    border: 'rgb(106, 79, 29)',
  },
  accent: {
    main: 'rgba(0, 117, 255, 1)',
    light: 'rgba(48, 143, 232, 1)',
    amber: '#FF9900',
  },
  track: {
    progress: grey[800],
    list: 'rgba(30, 41, 59, 1)',
    slider: 'rgba(50, 80, 129, 1)',
  },
  location: {
    healthy: c.green,
    warning: c.orange,
    critical: c.red,
    unmanaged: c.silver,
  },
  technology: {
    [TechnologyStatus['Full-Meraki']]: c.orange,
    [TechnologyStatus.Hybrid]: c.blue,
    [TechnologyStatus.Partial]: 'rgba(160, 32, 240, 1)',
    [TechnologyStatus['Full-Juniper']]: c.green,
    [TechnologyStatus['Non-standard']]: c.red,
    [TechnologyStatus.Unmanaged]: c.steel,
  },
} satisfies PaletteOptions;

/**
 * The raw colors of the light scheme, taken from MUI: its color constants (`@mui/material/colors`)
 * and the defaults of MUI's own light palette. Not a design deliverable yet (see GNI-871 in
 * `docs/mui-theming-roadmap.md`).
 */
export const lightColors = {
  white: common.white,
  black: common.black,
  // MUI's default light text colors.
  textPrimary: alpha(common.black, 0.87),
  textSecondary: alpha(common.black, 0.6),
  textDisabled: alpha(common.black, 0.38),
} as const;

const l = lightColors;

/**
 * Palette of the `light` color scheme. It has every key of `darkPalette` (a test enforces it).
 * Status colors are MUI's light defaults, except `error.light`: it is the app's error *text*
 * color, so here it is a darker red that stays readable on white. Filled controls are light blue
 * (`tonal`), MUI's accent controls (switches, sliders, focus) its default blue `primary`.
 */
export const lightPalette = {
  primary: { main: blue[700], light: blue[100], dark: blue[800] },
  secondary: { main: blue[900], light: blue[700] },
  success: { main: green[800], light: green[500], dark: green[900] },
  error: { main: red[700], light: red[800], dark: red[900] },
  warning: { main: '#ed6c02', light: orange[500], dark: orange[900] },
  info: { main: lightBlue[700], light: lightBlue[500], dark: lightBlue[900] },
  background: {
    default: grey[100],
    paper: l.white,
    table: l.white,
    dialog: l.white,
    widget: l.white,
    // A card inside a white card would vanish, so it takes the page grey.
    nestedWidget: grey[100],
    tooltip: l.white,
  },
  tonal: {
    background: blue[50],
    hover: blue[100],
    text: blue[800],
  },
  text: {
    primary: l.textPrimary,
    secondary: l.textSecondary,
    disabled: l.textDisabled,
    muted: l.textSecondary,
    subtle: alpha(common.black, 0.8),
    inactive: grey[600],
    pale: grey[700],
  },
  border: {
    light: grey[300],
    default: grey[400],
    // The tooltip frame: a neutral hairline, like the chart tooltip's.
    glow: grey[300],
    divider: grey[300],
  },
  control: {
    background: alpha(common.black, 0.04),
    border: alpha(common.black, 0.23),
  },
  map: {
    outline: blueGrey[400],
    outlineActive: blue[900],
    // A white veil over the countries around the selected one, the light twin of the dark mask.
    dimmedFill: common.white,
    clusterHealthy: darkPalette.map.clusterHealthy,
    clusterWarning: darkPalette.map.clusterWarning,
    clusterCritical: darkPalette.map.clusterCritical,
    clusterDefault: darkPalette.map.clusterDefault,
    clusterLabel: l.white,
  },
  globe: {
    surface: l.white,
    countryFill: blue[200],
    edge: blue[700],
    particles: blue[400],
  },
  chart: {
    grid: alpha(common.black, 0.08),
    fadeEnd: alpha(l.white, 0),
    donutFade: l.white,
    tooltipBackground: alpha(l.white, 0.95),
    tooltipTitle: l.textPrimary,
    tooltipBody: l.textSecondary,
    tooltipBorder: alpha(common.black, 0.12),
    needle: darkPalette.chart.needle,
    neutral: darkPalette.chart.neutral,
    node: darkPalette.chart.node,
    highlight: darkPalette.chart.highlight,
    emptyText: grey[600],
  },
  chip: {
    background: alpha(common.black, 0.08),
    border: alpha(common.black, 0.12),
    counter: alpha(common.black, 0.08),
    counterHover: alpha(common.black, 0.16),
  },
  brand: {
    loginCta: darkPalette.brand.loginCta,
    // Microsoft's light sign-in button variant.
    microsoft: l.white,
    microsoftHover: '#f3f3f3',
    microsoftText: '#5e5e5e',
    microsoftBorder: '#8c8c8c',
  },
  overlay: {
    backdrop: alpha(l.white, 0.6),
  },
  notice: darkPalette.notice,
  accent: {
    main: blue[700],
    light: blue[400],
    amber: darkPalette.accent.amber,
  },
  track: {
    progress: grey[300],
    list: grey[200],
    slider: grey[300],
  },
  // Data colors stay the same in both schemes, except the near-white "unmanaged".
  location: { ...darkPalette.location, unmanaged: grey[400] },
  technology: darkPalette.technology,
} satisfies PaletteOptions;
