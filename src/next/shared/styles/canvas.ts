/**
 * Stretches a third-party canvas (deck.gl, Chart.js, three.js) over its container. The libraries
 * size their canvases with inline styles, so only `!important` can override them. Spread it into
 * the styles of the element that wraps the canvas; it used to be a global `canvas` rule.
 */
export const fillContainerCanvas = {
  '& canvas': {
    width: '100% !important',
    height: '100% !important',
  },
} as const;
