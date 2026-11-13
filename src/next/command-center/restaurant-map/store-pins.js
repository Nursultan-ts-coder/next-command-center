/*
 * store-pins.js: the store pins and the clusters (round bubbles with a count) on the map.
 *
 * Drawn with deck.gl on top of the Google map, the same way as the map in
 * grafana-restraurant-custom-widgets (src/shared/components/maps: layers/cluster-layers.ts,
 * hooks/use-supercluster.ts and utils/map-viewport.ts). Pins and clusters are not Google
 * markers, so the map needs no Map ID and can take its colours from the map-styles files.
 *
 * Usage:
 *   const pins = createStorePins(map, (store) => openPopup(store));
 *   pins.setStores([{ key, lat, lng, status, store }], { normal: '#34a853', ... });
 *   pins.setSelected(key);   // the open store's pin is drawn larger
 *   pins.destroy();
 */
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import Supercluster from 'supercluster';
import PIN_SVG from './pin-svg';

// Sizes in pixels, as in the other project (src/shared/const/map.ts).
const PIN_SIZE = 40;
const SELECTED_PIN_SIZE = 48;
const CLUSTER_TEXT_SIZE = 12;
const CLUSTER_CORE_RADIUS = 13;
const CLUSTER_AURA_RADIUS = 24;
const CLUSTER_FILL_ALPHA = 158; // ~62%, as the cluster artwork
const CLUSTER_AURA_ALPHA = 40;
const CLUSTER_LABEL_COLOR = [255, 255, 255, 255];
const MAX_ZOOM = 20;

// Nearby stores within 100px share a bubble. Past zoom 16 every store has its own pin,
// so two stores at the same address can still be clicked one by one.
const CLUSTER_OPTIONS = {
  radius: 100,
  minZoom: 0,
  maxZoom: 16,
  map: (props) => ({ severity: SEVERITY[props.status] || 0 }),
  reduce: (total, props) => { total.severity = Math.max(total.severity, props.severity); },
};

// Worst first. A bubble takes the colour of the worst store inside it.
const SEVERITY = { normal: 0, nodata: 1, warning: 2, critical: 3 };
const STATUS_BY_SEVERITY = ['normal', 'nodata', 'warning', 'critical'];

// The pin picture is 40 x 37 with its tip at the bottom: drawn 8x so it stays sharp.
const PIN_ICON = { width: 320, height: 296, anchorX: 160, anchorY: 296 };
// How far above the store the middle of the pin's round head is, for a pin PIN_SIZE tall.
const PIN_HEAD_HEIGHT = 23;
const PIN_HEAD_SIZE = 25;
// How far above the store a pop-up opens, so it clears the (enlarged) pin.
export const POPUP_OFFSET_Y = -44;

// Critical and warning stores pulse, as they did before the move to deck.gl:
// one ring grows from the pin to 2.6x and fades out, every 1.4s (critical) or 2.2s (warning).
const PULSE_MS = { critical: 1400, warning: 2200 };
const PULSE_GROWTH = 1.6;
const PULSE_ALPHA = 140;
const PULSE_FRAME_MS = 33; // ~30 frames a second is smooth enough and cheap
const PULSE_ICON = {
  url: svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#fff"/></svg>'),
  width: 64,
  height: 64,
  mask: true,
};

function svgUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Any CSS colour as [r, g, b], read back through a canvas. Grey when it can't be read.
const rgbCache = new Map();
function toRgb(color) {
  const text = String(color || '');
  if (rgbCache.has(text)) return rgbCache.get(text);
  let rgb = [128, 128, 128];
  try {
    const context = document.createElement('canvas').getContext('2d');
    context.fillStyle = '#808080';
    context.fillStyle = text;
    const read = String(context.fillStyle);
    const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(read);
    const parts = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(read);
    if (hex) rgb = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
    else if (parts) rgb = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  } catch (error) { /* grey */ }
  rgbCache.set(text, rgb);
  return rgb;
}

// One pin picture per colour.
const pinIcons = new Map();
function pinIcon(rgb) {
  const fill = `rgb(${rgb.join(',')})`;
  if (!pinIcons.has(fill)) pinIcons.set(fill, { ...PIN_ICON, id: fill, url: svgUri(PIN_SVG.replace('{{fill}}', fill)) });
  return pinIcons.get(fill);
}

function pulseMs(item) {
  return item.properties.cluster ? PULSE_MS.critical : PULSE_MS[item.properties.status];
}

export function createStorePins(map, onPinClick) {
  const overlay = new GoogleMapsOverlay({ interleaved: false, pickingRadius: 8 });
  overlay.setMap(map);
  let index = new Supercluster(CLUSTER_OPTIONS);
  let hasStores = false;
  let colors = {};
  let visible = [];
  let selectedKey = null;
  let frame = null;
  let lastFrame = 0;

  const colorOf = (status) => toRgb(colors[status]);
  const pointer = (info) => map.setOptions({ draggableCursor: info && info.object ? 'pointer' : null });

  // Zooms in until the clicked bubble breaks apart (utils/map-viewport.ts, onClusterClick).
  const openCluster = (feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const zoom = index.getClusterExpansionZoom(feature.properties.cluster_id);
    map.panTo({ lat, lng });
    map.setZoom(Math.min(zoom + 1, MAX_ZOOM));
  };

  const layers = (now) => {
    const clusters = visible.filter((item) => item.properties.cluster);
    const pins = visible.filter((item) => !item.properties.cluster);
    const clusterRgb = (item) => colorOf(STATUS_BY_SEVERITY[item.properties.severity]);
    const pulsing = visible.filter((item) => (item.properties.cluster
      ? item.properties.severity === SEVERITY.critical
      : Boolean(PULSE_MS[item.properties.status])));
    const phase = (item) => ((now % pulseMs(item)) / pulseMs(item));
    const position = (item) => item.geometry.coordinates;

    return {
      pulsing: pulsing.length > 0,
      list: [
        new ScatterplotLayer({
          id: 'store-cluster-aura',
          data: clusters,
          getPosition: position,
          getRadius: CLUSTER_AURA_RADIUS,
          radiusUnits: 'pixels',
          getFillColor: (item) => [...clusterRgb(item), CLUSTER_AURA_ALPHA],
          updateTriggers: { getFillColor: colors },
        }),
        new IconLayer({
          id: 'store-pulse',
          data: pulsing,
          getPosition: position,
          getIcon: () => PULSE_ICON,
          getSize: (item) => (item.properties.cluster ? CLUSTER_CORE_RADIUS * 2 : PIN_HEAD_SIZE) * (1 + PULSE_GROWTH * phase(item)),
          getPixelOffset: (item) => (item.properties.cluster ? [0, 0] : [0, -PIN_HEAD_HEIGHT]),
          getColor: (item) => [...(item.properties.cluster ? clusterRgb(item) : colorOf(item.properties.status)), PULSE_ALPHA * (1 - phase(item))],
          updateTriggers: { getSize: now, getColor: [now, colors] },
        }),
        new ScatterplotLayer({
          id: 'store-cluster-core',
          data: clusters,
          pickable: true,
          getPosition: position,
          getRadius: CLUSTER_CORE_RADIUS,
          radiusUnits: 'pixels',
          getFillColor: (item) => [...clusterRgb(item), CLUSTER_FILL_ALPHA],
          updateTriggers: { getFillColor: colors },
          onClick: (info) => { if (info.object) openCluster(info.object); },
          onHover: pointer,
        }),
        new IconLayer({
          id: 'store-pins',
          data: pins,
          pickable: true,
          getPosition: position,
          getIcon: (item) => pinIcon(colorOf(item.properties.status)),
          getSize: (item) => (item.properties.key === selectedKey ? SELECTED_PIN_SIZE : PIN_SIZE),
          updateTriggers: { getIcon: colors, getSize: selectedKey },
          onClick: (info) => { if (info.object) onPinClick(info.object.properties.store); },
          onHover: pointer,
        }),
        new TextLayer({
          id: 'store-cluster-count',
          data: clusters,
          getPosition: position,
          getText: (item) => String(item.properties.point_count),
          getSize: CLUSTER_TEXT_SIZE,
          getColor: CLUSTER_LABEL_COLOR,
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontWeight: 'bold',
        }),
      ],
    };
  };

  const draw = () => {
    if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const next = layers(now);
    overlay.setProps({ layers: next.list });
    if (!next.pulsing) return;
    const tick = (time) => {
      frame = null;
      if (time - lastFrame < PULSE_FRAME_MS) { frame = requestAnimationFrame(tick); return; }
      lastFrame = time;
      draw();
    };
    frame = requestAnimationFrame(tick);
  };

  // Which bubbles and pins are in view at this zoom (hooks/use-supercluster.ts).
  const recluster = () => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (!hasStores || !bounds || typeof zoom !== 'number') {
      visible = [];
    } else {
      const south = bounds.getSouthWest();
      const north = bounds.getNorthEast();
      let west = south.lng();
      let east = north.lng();
      if (west > east) { west = -180; east = 180; } // the view crosses the date line
      visible = index.getClusters([west, south.lat(), east, north.lat()], Math.floor(zoom));
    }
    draw();
  };
  const idle = map.addListener('idle', recluster);

  return {
    setStores(stores, statusColors) {
      colors = { ...statusColors };
      index = new Supercluster(CLUSTER_OPTIONS);
      index.load(stores.map((item) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
        properties: { key: String(item.key), status: item.status, store: item.store },
      })));
      hasStores = stores.length > 0;
      recluster();
    },
    setSelected(key) {
      const next = key === null || key === undefined ? null : String(key);
      if (next === selectedKey) return;
      selectedKey = next;
      draw();
    },
    destroy() {
      if (frame !== null) cancelAnimationFrame(frame);
      idle.remove();
      overlay.finalize();
    },
  };
}
