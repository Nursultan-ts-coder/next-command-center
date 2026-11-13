/*
 * theme.js: grafana-restraurant-custom-widgets' MUI theme (src/next/app/theme) around the whole
 * app, so the parts it uses (cards, charts) and the MUI drop-downs look as they do there. It
 * follows Grafana's light or dark theme (there is no switch in the app); nothing is stored
 * (storageManager={null}). MUI marks the page with "cc-mui-light" or "cc-mui-dark" for its
 * colours. It adds no CssBaseline and no global styles: those would restyle Grafana's page and
 * the store view, and the map styles its own pop-up.
 */
import React, { useEffect } from 'react';
import { useTheme2 } from '@grafana/ui';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';

import { createAppTheme, themeProviderProps } from '@/app/theme';

const appTheme = createAppTheme({ colorSchemeSelector: '.cc-mui-%s' });

/** Keeps MUI's scheme on Grafana's light or dark theme. */
function FollowGrafanaTheme() {
  const { isDark } = useTheme2();
  const { setMode } = useColorScheme();
  useEffect(() => setMode(isDark ? 'dark' : 'light'), [isDark, setMode]);
  return null;
}

export default function GrafanaTheme({ children }) {
  const { isDark } = useTheme2();
  return (
    <ThemeProvider theme={appTheme} {...themeProviderProps} defaultMode={isDark ? 'dark' : 'light'} storageManager={null} disableTransitionOnChange>
      <FollowGrafanaTheme />
      {children}
    </ThemeProvider>
  );
}
