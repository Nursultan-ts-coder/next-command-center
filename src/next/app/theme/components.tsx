import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import type { CSSObject, Theme, ThemeOptions } from '@mui/material/styles';

import { fieldClasses } from '../../shared/const/field';

/**
 * Field looks, opted into with `fieldClasses` on a `TextField` or `Autocomplete` root. `:where()`
 * keeps the class out of the selector's specificity, so these rules cascade exactly like the
 * component-level `styled()` rules they replaced; a component's own styles can still override them.
 */
const pillField = (theme: Theme): CSSObject => ({
  [`& .${outlinedInputClasses.root}`]: {
    background: theme.palette.control.background,
    color: theme.palette.text.primary,
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.fontWeightSemiBold,
    textTransform: 'none',
    borderRadius: theme.shape.pill,
    border: '1px solid transparent',
    transition: theme.transitions.create('border-color', { duration: 200, easing: 'ease-in-out' }),
    '&:hover': {
      borderColor: theme.palette.text.primary,
    },
    // A disabled pill keeps its text color instead of dimming to text.disabled.
    [`&.${outlinedInputClasses.disabled}`]: {
      color: theme.palette.text.primary,
    },
    [`& .${outlinedInputClasses.notchedOutline}`]: {
      border: 0,
    },
    '&::before': theme.mixins.sheenBorder,
  },
});

const formField = (theme: Theme): CSSObject => ({
  [`& .${outlinedInputClasses.root}`]: {
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.control.border}`,
    transition: theme.transitions.create('border-color', { duration: 200, easing: 'ease-in-out' }),
    '&:hover': {
      borderColor: theme.palette.text.primary,
    },
    [`& .${outlinedInputClasses.notchedOutline}`]: {
      border: 0,
    },
  },
});

const fieldLooks = (theme: Theme): CSSObject => ({
  [`&:where(.${fieldClasses.pill})`]: pillField(theme),
  [`&:where(.${fieldClasses.form})`]: formField(theme),
});

export const components: ThemeOptions['components'] = {
  // With CSS variables, MUI's dark-only AppBar colors (`AppBar.darkBg`/`darkColor`) become a
  // nested `*:where(.dark) &` rule that outranks a component's own `styled()` background. The theme
  // without CSS variables never emitted them, so this keeps the AppBar on its `color` palette and
  // lets `StyledAppBar` own its background, as before.
  MuiAppBar: {
    defaultProps: {
      enableColorOnDark: true,
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: ({ theme }) => fieldLooks(theme),
    },
  },
  // Every Autocomplete in the app is a pill or form picker (shared `Select`, `SelectSearch`).
  MuiAutocomplete: {
    defaultProps: {
      popupIcon: <KeyboardArrowDownIcon />,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        ...fieldLooks(theme),
        '& .MuiSvgIcon-root': {
          color: theme.palette.text.primary,
        },
      }),
      popupIndicator: ({ theme }) => ({
        '& .MuiSvgIcon-root': {
          fontSize: theme.typography.pxToRem(18),
        },
      }),
      paper: ({ theme }) => ({
        marginTop: theme.spacing(1),
      }),
    },
  },
  // Custom card surfaces. Paper's own look (paper background, text.primary, clipped overflow) is
  // reset so a card renders exactly like the plain panel it replaced.
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        variants: [
          {
            props: { variant: 'widget' },
            style: {
              width: '100%',
              overflow: 'visible',
              color: 'inherit',
              borderRadius: theme.shape.card,
              backgroundColor: theme.palette.background.widget,
              // A widget card nested in another (e.g. the device counts in a trends panel).
              // `:where()` keeps it weaker than a nested card's own styled background.
              '& :where(.MuiPaper-widget)': {
                backgroundColor: theme.palette.background.nestedWidget,
              },
            },
          },
          {
            props: { variant: 'glass' },
            style: {
              width: '100%',
              overflow: 'visible',
              color: 'inherit',
              borderRadius: theme.shape.card,
              background: 'transparent',
              backdropFilter: 'blur(5px)',
              boxShadow: theme.customShadows.glassInset,
            },
          },
        ],
      }),
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      '@font-face': undefined, // Prevent MUI from loading Roboto from Google Fonts
    },
  },
  // error.main text is under 4.5:1 on the paper and modal surfaces; error.light passes on
  // every app surface. Fills and borders keep error.main.
  MuiFormHelperText: {
    styleOverrides: {
      root: ({ theme }) => ({ '&.Mui-error': { color: theme.palette.error.light } }),
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: ({ theme }) => ({ '&.Mui-error': { color: theme.palette.error.light } }),
    },
  },
  // Tooltips and slider labels share one look: an ink card with a blue glow in the dark scheme, a
  // white card with a hairline and MUI's elevation 2 in the light one (like the chart tooltips).
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.background.tooltip,
        color: theme.palette.text.primary,
        fontSize: theme.typography.caption.fontSize,
        lineHeight: 1.4, // Compact tooltip line-height; looser than caption default (1.66)
        fontWeight: theme.typography.fontWeightBold,
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(1.5, 2),
        backdropFilter: 'blur(10px) saturate(100%)',
        boxShadow: theme.customShadows.glow,
        border: `1px solid ${theme.palette.border.glow}`,
      }),
      arrow: ({ theme }) => ({
        color: theme.palette.background.tooltip,
        '&:before': {
          border: `1px solid ${theme.palette.border.glow}`,
        },
      }),
    },
    defaultProps: { arrow: true, placement: 'top' },
  },
  MuiSlider: {
    styleOverrides: {
      valueLabel: ({ theme }) => ({
        backgroundColor: theme.palette.background.tooltip,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.border.glow}`,
        backdropFilter: 'blur(10px) saturate(100%)',
        boxShadow: theme.customShadows.glow,
        '&:before': {
          borderTopColor: theme.palette.background.tooltip,
          border: `1px solid ${theme.palette.border.glow}`,
        },
      }),
    },
    defaultProps: { valueLabelDisplay: 'auto' },
  },
};
