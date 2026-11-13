import type { TypographyVariantsOptions } from '@mui/material/styles';

/** MUI's default root size (`htmlFontSize: 16`), so the custom variants line up with the built-in ones. */
const pxToRem = (px: number) => `${px / 16}rem`;

export const typography: TypographyVariantsOptions = {
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  fontWeightSemiBold: 600,
  /** 18px: card and widget titles, between subtitle1 (16px) and h6 (20px). */
  cardTitle: { fontSize: pxToRem(18) },
  /** 15px semi-bold: tab and toggle-button labels. */
  controlLabel: { fontSize: pxToRem(15), fontWeight: 600 },
  /** 22px semi-bold: the headline number of a stat tile. */
  metricValue: { fontSize: pxToRem(22), fontWeight: 600 },
};
