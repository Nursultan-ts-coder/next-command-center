/*
 * navigation.js: which page is open. Three levels, as the Archy demo's drill-down:
 *   - Global: every segment, on a world map (no segment chosen).
 *   - Segment: one of McDonald's segments (segments.js), chosen on the Global page's map.
 *   - Site: one store, chosen on the map or in the store drop-down. It sits under its segment.
 *
 * The chosen segment and store are kept in the page address (?segment=us&store=844), so the
 * browser's Back button and a copied link both work. An address with only a store opens the
 * store under the U.S.
 */
import { locationService } from '@grafana/runtime';
import { useLocation } from 'react-router-dom';

export const PAGES = { GLOBAL: 'global', SEGMENT: 'segment', SITE: 'site' };

export function useNavigation() {
  // Read from the address on every change of it (useLocation re-renders the page).
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const where = { segment: params.get('segment') || '', store: params.get('store') || '' };
  const storeKey = where.store;
  const segmentId = where.segment || (storeKey ? 'us' : '');

  const go = (next) => {
    if (next.segment === where.segment && next.store === where.store) return;
    locationService.partial({ segment: next.segment || null, store: next.store || null });
  };

  // A store opened from a segment stays under it; one opened from the Global page goes under its own.
  const goToSite = (key, ownSegment) => go({ segment: segmentId || ownSegment || 'us', store: String(key) });
  const goToSegment = (id) => go({ segment: String(id), store: '' });
  const goToGlobal = () => go({ segment: '', store: '' });

  const page = storeKey ? PAGES.SITE : segmentId ? PAGES.SEGMENT : PAGES.GLOBAL;
  return { page, segmentId, storeKey, goToSite, goToSegment, goToGlobal };
}
