/*
 * PillTabs.js: grafana-restraurant-custom-widgets' tabs (src/shared/components/tabs, its
 * StyledTabs and StyledTab), in its dark scheme: a 48px pill of blurred glass with its inset edge,
 * and a sliding 40px pill under the chosen tab; the labels in its control-label type
 * (15px semi-bold), white at 55% that rises to 80% on hover. Command Center hook: the chosen tab's
 * pill is tinted the brand yellow with a yellow edge, and its label is yellow, so it stands out
 * (grafana's nearly clear raised pill was hard to see).
 * Used by the map's layers (pages/GlobalPage.js), the map's status buttons (restaurant-map/Index.js,
 * pages/GlobalPage.js) and the tabs below the map (pages/DetailTabs.js). An item may have an icon
 * before its label.
 *
 * The colours are written out rather than read from the theme, and with !important on the
 * tabs: each tab is a button, and the host page's button look (a white box, grey text) beats MUI's.
 * Dark or light as the app's theme is (app/theme.js): in the light one, ink in place of white
 * and a stronger yellow pill under an ink label.
 */
import React from 'react';
import { Tab, Tabs } from '@mui/material';

// grafana's dark palette and tokens (src/app/theme/palette.ts, tokens.ts).
const DARK = {
  muted: 'rgba(255, 255, 255, 0.55)',
  subtle: 'rgba(255, 255, 255, 0.8)',
  selected: '#ffbc0d',
  glassInset: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -1px 1px rgba(0, 0, 0, 0.35)',
  selectedPill: 'rgba(255, 188, 13, 0.18)',
  selectedEdge: '0 1px 2px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 188, 13, 0.6)',
  focus: '#ffbc0d',
};

// grafana's light palette and tokens: its text at 87%, muted at 55%.
const LIGHT = {
  muted: 'rgba(0, 0, 0, 0.55)',
  subtle: 'rgba(0, 0, 0, 0.75)',
  selected: 'rgba(0, 0, 0, 0.87)',
  glassInset: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  selectedPill: 'rgba(255, 188, 13, 0.4)',
  selectedEdge: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(148, 104, 0, 0.5)',
  focus: '#946800',
};
const colorsFor = (theme) => (theme.palette.mode === 'light' ? LIGHT : DARK);

export default function PillTabs({ value, onChange, items, label, className, hasBorder = true }) {
  return (
    <Tabs
      value={value}
      onChange={(event, next) => onChange(next)}
      aria-label={label}
      variant="scrollable"
      scrollButtons="auto"
      className={className}
      sx={(theme) => ({
        minHeight: 'unset',
        height: 48,
        maxWidth: 'fit-content',
        minWidth: 0,
        flex: 'none',
        borderRadius: `${theme.shape.pill}px`,
        background: 'transparent',
        backdropFilter: 'blur(12px)',
        ...(hasBorder && { boxShadow: colorsFor(theme).glassInset }),
        '& .MuiTabs-scroller': { padding: theme.spacing(0, 0.625) },
        '& .MuiTabs-scrollButtons': { color: colorsFor(theme).subtle },
        '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
        '& .MuiTabs-indicator': {
          height: 40,
          margin: theme.spacing(0.5, 0),
          borderRadius: `${theme.shape.pill}px`,
          background: colorsFor(theme).selectedPill,
          boxShadow: colorsFor(theme).selectedEdge,
          backdropFilter: 'blur(8px)',
        },
        '& .MuiTabs-flexContainer': { height: '100%', position: 'relative', zIndex: 1 },
      })}
    >
      {items.map((item) => (
        <Tab
          key={item.key}
          value={item.key}
          label={item.label}
          icon={item.icon}
          iconPosition="start"
          disableRipple
          sx={(theme) => ({
            minWidth: 0,
            minHeight: 48,
            height: '48px !important',
            maxWidth: 'fit-content',
            padding: '12px 16px !important',
            border: '0 !important',
            borderRadius: `${theme.shape.pill}px !important`,
            background: 'transparent !important',
            boxShadow: 'none !important',
            textTransform: 'none',
            fontFamily: 'Inter, "Open Sans", "Segoe UI", system-ui, sans-serif',
            gap: '6px',
            '& .MuiTab-icon': { margin: 0 },
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.01em',
            lineHeight: 1.25,
            color: `${colorsFor(theme).muted} !important`,
            position: 'relative',
            zIndex: 1,
            transition: theme.transitions.create('color'),
            '&:hover': { color: `${colorsFor(theme).subtle} !important`, background: 'transparent !important' },
            '&.Mui-selected': { color: `${colorsFor(theme).selected} !important` },
            '&:focus-visible': { outline: `2px solid ${colorsFor(theme).focus}`, outlineOffset: -2 },
          })}
        />
      ))}
    </Tabs>
  );
}
