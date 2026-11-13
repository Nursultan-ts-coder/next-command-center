import { createTheme } from '@mui/material/styles';

import { components } from './components';
import { darkPalette, lightPalette } from './palette';
import { breakpoints, darkTokens, lightTokens, shape, zIndex } from './tokens';
import { typography } from './typography';

const DEFAULT_COLOR_SCHEME = 'dark';

/**
 * Props for every `ThemeProvider` that renders the app theme (the app and the test helpers):
 * - `defaultMode`: start dark. With two schemes MUI would otherwise follow the OS setting.
 * - `forceThemeRerender`: re-render with the new scheme's values when it changes. With CSS
 *   variables MUI otherwise only swaps the variables, but components, Chart.js, d3, deck.gl and
 *   three.js read `theme.palette` values.
 * - `noSsr`: apply the stored scheme on the first render instead of flashing dark first.
 */
export const themeProviderProps = {
  defaultMode: DEFAULT_COLOR_SCHEME,
  forceThemeRerender: true,
  noSsr: true,
} as const;

/**
 * Builds the app's MUI theme with a `dark` (default) and a `light` color scheme. CSS variables
 * (`--mui-*`) are switched by a class on `<html>`; `theme.palette` and the per-scheme tokens
 * (`customShadows`, `gradients`, `mixins`) follow the active scheme on re-render.
 * colorSchemeSelector: that class, `.light` / `.dark` by default (`'class'`); `'.x-%s'` names it.
 */
export function createAppTheme({ colorSchemeSelector = 'class' }: { colorSchemeSelector?: string } = {}) {
  return createTheme({
    cssVariables: {
      colorSchemeSelector,
      // MUI would add `color-scheme: dark` to :root, which turns native scrollbars and form
      // controls dark. The app never set it, so it stays off.
      disableCssColorScheme: true,
    },
    colorSchemes: {
      dark: { palette: darkPalette, ...darkTokens },
      light: { palette: lightPalette, ...lightTokens },
    },
    defaultColorScheme: DEFAULT_COLOR_SCHEME,
    shape,
    breakpoints,
    zIndex,
    typography,
    // The default scheme's tokens also sit at the top level, where a theme without a provider
    // (tests, `createAppTheme()` itself) reads them.
    ...darkTokens,
    components,
  });
}
