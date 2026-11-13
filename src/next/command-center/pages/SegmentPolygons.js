/*
 * SegmentPolygons.js: the countries on the map, two ways, as grafana-restraurant-custom-widgets:
 *   - SegmentPolygons (the Global page's service layer): each country coloured by its segment's
 *     status, as grafana's service layer (src/shared/components/maps/layers/service.tsx): the
 *     status's colour (theme.palette.location) at the dark map's fill opacity, and a white,
 *     thicker outline for the segment clicked.
 *   - SegmentMarkets (a segment's page): only the segment's countries, outlined as grafana
 *     outlines a user's markets (src/shared/utils/map-countries.ts, highlightMarkets). No fill.
 *
 * Drawn on the app's map through its Data layer (useRmMap, restaurant-map/Index.js), from the
 * same country shapes as grafana (src/shared/const/geojson.json). Taken off the map again when
 * they go away.
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

import geojson from '@/shared/const/geojson.json';
import { RM_BOUNDS, useRmMap } from '../restaurant-map/Index';
import { SEGMENTS, segmentOfCountry, statusColor } from '../segments';

// grafana's dark map: useMapTheme().polygon (fillOpacity 0.2, selectedOutlineWeight 2).
const FILL_OPACITY = 0.2;
const SELECTED_FILL_OPACITY = 0.35;
const SELECTED_OUTLINE_WEIGHT = 2;

// The country shapes on the map: added once, removed when the layer goes away.
function useCountryShapes(map) {
  useEffect(() => {
    if (!map) return undefined;
    const features = map.data.addGeoJson(geojson);
    return () => {
      features.forEach((feature) => map.data.remove(feature));
      map.data.setStyle({});
    };
  }, [map]);
}

// grafana's market outline on the dark map (getHighlightColor, src/shared/utils/map-colors.ts):
// one blue per country, so neighbours stay apart.
const marketColor = (idx) => `hsl(220, ${60 + ((idx * 17) % 30)}%, ${70 + ((idx * 23) % 30)}%)`;
const MARKET_OUTLINE_WEIGHT = 1.5;

// Where the service layer places the map: the land from the Arctic coasts down to Cape Horn, above
// the segments' cards along its bottom (GlobalPage.js), at the closest whole zoom it fits at.
// Google draws only whole zooms, and the cards cover the bottom of the map, so the map may go further
// south here than elsewhere (RM_BOUNDS): what is that far south, Antarctica too, is behind the cards.
const LAND = { north: 72, south: -56, lng: 10 };
const SOUTH_BEHIND_CARDS = -85;
const GAP = 8; // between the land and the cards, in pixels
const MAX_ZOOM = 4;

// Web Mercator: a latitude's distance from the top of the world, in pixels at a zoom, and back.
const TILE = 256;
const yOf = (lat, zoom) => {
  const sin = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE * 2 ** zoom;
};
const latOf = (y, zoom) => (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / (TILE * 2 ** zoom)));

// The land above the cards (inset: how far up the map they reach). When it fits, it is centred in
// the space above them; when even the furthest-out zoom is too close, the south comes first: Cape
// Horn just above the cards, and the far north (no restaurants) off the top.
function placeLand(map, inset) {
  const height = map.getDiv().clientHeight;
  if (!height) return;
  const free = height - inset - GAP;
  // Never so far out that the map would show past its edges (it can't, with strictBounds).
  const outmost = Math.max(0, Math.ceil(Math.log2(height / (yOf(SOUTH_BEHIND_CARDS, 0) - yOf(RM_BOUNDS.north, 0)))));
  let zoom = outmost;
  while (zoom < MAX_ZOOM && yOf(LAND.south, zoom + 1) - yOf(LAND.north, zoom + 1) <= free) zoom += 1;
  const centred = (yOf(LAND.north, zoom) + yOf(LAND.south, zoom)) / 2 + (inset + GAP) / 2;
  const southFirst = yOf(LAND.south, zoom) + height / 2 - free;
  map.setZoom(zoom);
  map.setCenter({ lat: latOf(Math.max(centred, southFirst), zoom), lng: LAND.lng });
}

/**
 * The Global page's service layer.
 * status: 'all', or only the segments in that status are coloured (the service layer's buttons).
 * selectedId / onSelect: the segment clicked.
 * segments: their numbers and status, the U.S. one live (segments.js, liveSegments); the demo's by default.
 * bottomInset: how far up the map the segments' cards reach, in pixels; the land is placed above them.
 */
export default function SegmentPolygons({ segments = SEGMENTS, status = 'all', selectedId, onSelect, bottomInset = 0 }) {
  const map = useRmMap();
  const theme = useTheme();
  const select = useRef(onSelect);
  select.current = onSelect;
  useCountryShapes(map);

  // Further south while the layer is shown, back to the map's own edges when it goes.
  useEffect(() => {
    if (!map) return undefined;
    map.setOptions({ restriction: { latLngBounds: { ...RM_BOUNDS, south: SOUTH_BEHIND_CARDS }, strictBounds: true } });
    return () => map.setOptions({ restriction: { latLngBounds: RM_BOUNDS, strictBounds: true } });
  }, [map]);

  // The land above the cards: when the layer opens, and again when the map or the cards change size.
  const inset = useRef(bottomInset);
  inset.current = bottomInset;
  useEffect(() => {
    if (map) placeLand(map, bottomInset);
  }, [map, bottomInset]);
  useEffect(() => {
    if (!map || typeof ResizeObserver === 'undefined') return undefined;
    let size = '';
    const observer = new ResizeObserver(([entry]) => {
      const next = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
      if (size && next !== size) placeLand(map, inset.current);
      size = next;
    });
    observer.observe(map.getDiv());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const { outline, outlineActive } = theme.palette.map;
    map.data.setStyle((feature) => {
      const id = segmentOfCountry(feature.getProperty('name'));
      const segment = segments.find((item) => item.id === id);
      const coloured = segment && (status === 'all' || segment.status === status);
      if (!coloured) return { strokeColor: outline, strokeWeight: 0.5, fillOpacity: 0, clickable: Boolean(segment), zIndex: 1 };
      const selected = id === selectedId;
      return {
        fillColor: statusColor(theme, segment.status),
        fillOpacity: selected ? SELECTED_FILL_OPACITY : FILL_OPACITY,
        strokeColor: selected ? outlineActive : outline,
        strokeWeight: selected ? SELECTED_OUTLINE_WEIGHT : 1,
        clickable: true,
        zIndex: selected ? 2 : 1,
      };
    });
  }, [map, theme, segments, status, selectedId]);

  useEffect(() => {
    if (!map) return undefined;
    const listener = map.data.addListener('click', (event) => {
      const id = segmentOfCountry(event.feature.getProperty('name'));
      if (id && select.current) select.current(id);
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map]);

  return null;
}

/** A segment's page: its countries outlined, every other country left as the map draws it. */
export function SegmentMarkets({ segmentId }) {
  const map = useRmMap();
  useCountryShapes(map);

  useEffect(() => {
    if (!map) return;
    let index = 0;
    const colors = new Map();
    map.data.forEach((feature) => {
      if (segmentOfCountry(feature.getProperty('name')) === segmentId) colors.set(feature, marketColor(index++));
    });
    map.data.setStyle((feature) => {
      const color = colors.get(feature);
      if (!color) return { strokeOpacity: 0, fillOpacity: 0, clickable: false };
      return { strokeColor: color, strokeWeight: MARKET_OUTLINE_WEIGHT, fillOpacity: 0, clickable: false };
    });
  }, [map, segmentId]);

  return null;
}
