import GlobalStyles from '@mui/material/GlobalStyles';

/**
 * Global CSS for third-party DOM the app cannot style through components: the Google Maps info
 * window. Google Maps sets most of these properties itself, often inline, hence `!important`.
 */
export function AppGlobalStyles() {
  return (
    <GlobalStyles
      styles={(theme) => ({
        // Glass card instead of Google's white bubble.
        '.gm-style .gm-style-iw-c': {
          width: '100%',
          minWidth: 'min-content',
          background: 'transparent !important',
          color: theme.palette.text.primary,
          borderRadius: theme.shape.card,
          backdropFilter: 'blur(5px)',
          boxShadow: theme.customShadows.glassInset,
        },
        // The app renders its own header and close button (`CustomInfoWindow`).
        '.gm-style-iw-ch': {
          display: 'none',
        },
        '.gm-style-iw-c': {
          maxHeight: 'none !important',
        },
        '.gm-style .gm-style-iw-d': {
          overflow: 'visible !important',
          maxHeight: 'none !important',
        },
        // The bubble's tail.
        '.gm-style .gm-style-iw-tc': {
          display: 'none !important',
        },
        '.gm-style .gm-ui-hover-effect': {
          display: 'none !important',
        },
        '.gm-style .gm-ui-hover-effect img': {
          width: '18px !important',
          height: '18px !important',
          opacity: '0.8 !important',
          margin: 0,
        },
        '.gm-style .gm-style-iw': {
          paddingInlineEnd: '10px !important',
        },
      })}
    />
  );
}
