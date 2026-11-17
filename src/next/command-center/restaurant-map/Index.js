import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '@mui/material/styles';
import { createStorePins, POPUP_OFFSET_Y } from './store-pins';
import { RM_ICON_PATHS, rmIconSvg, rmRowIconPath } from './row-icons';
import PillTabs from '../components/PillTabs';
import mapStylesDark from './map-styles/map-styles.json';
import mapStylesLightCountry from './map-styles/map-styles-light-country.json';
import { repeatWhileShowing } from '../store-layout/visibility';
import { StatusIcon } from '@/shared/components/icons';
import { fetchMapStores } from '../data';
import { mockCorrelation } from '../data/agent-mock';

// The Google Maps browser key: the one saved on the app's Configuration page, or (development
// builds only) GOOGLE_MAPS_API_KEY from the plugin's .env (webpack.config.ts).
const GOOGLE_MAPS_API_KEY = (typeof window !== 'undefined' && window.__NEXT_CC_CONFIG__ && window.__NEXT_CC_CONFIG__.googleMapsApiKey) || process.env.GOOGLE_MAPS_API_KEY || '';

// Rows where a store that is missing from the query's answer counts as critical (red),
// instead of being skipped: edge nodes and GRNT (gateways). Matched on the row's label,
// so it follows the labels set in the map tile's settings.
const RM_MISSING_IS_CRITICAL = /edge|grnt|gateway/i;

// The map's colours, one style per theme, copied from grafana-restraurant-custom-widgets
// (src/shared/components/maps/const). Google takes these styles only when the map has no
// Map ID, which is why the pins are drawn by store-pins.js and not as Google markers.
// map-styles-light.json is the other project's softer, slate-tinted light map for a
// whole-world view; this map zooms in to stores, so it uses the "country" light map.
function rmMapStyles(dark) {
return dark ? mapStylesDark : mapStylesLightCountry;
}

// Command Center hook: dark mode. The app sets rmDark on the map; the map then takes its
// dark style (above), the store pop-up and the zoom buttons take their dark colours, and the
// other boxes drawn over it (title, legend, Google's buttons) show their colors flipped,
// as the rest of the page does.
const RmThemeContext = createContext(false);
// Command Center hook: the map's layer (rmLayer), as on grafana's global map.
//   name: 'locations' (the default) shows the store pins; 'service' hides them, and the app's
//     `controls` take the place of the status buttons.
//   content: what the app draws on the map, in any layer. It gets the map from useRmMap().
//   pinFilter: when set, only the stores it accepts get a pin; pinFilterKey names it, so the
//     pins are drawn again (and the map zooms to fit them) when it changes.
//   detailKey / onDetail: onDetail is told what that store's pop-up says (rmStoreDetail),
//     whenever it changes; null while the store is not on the map.
const RM_DEFAULT_LAYER = { name: 'locations' };
const RmLayerContext = createContext(RM_DEFAULT_LAYER);
// Command Center hook: the Google map, for the app's own layers (null until it has loaded).
const RmMapContext = createContext(null);
// Command Center hook: how far the map may be moved: nothing south of 60°S, so Antarctica (no
// restaurants) is never shown; Cape Horn, the southernmost land with stores nearby, is at 56°S.
// The Global page's service layer moves the south edge down behind its cards (SegmentPolygons.js).
export const RM_BOUNDS = { north: 85, south: -60, west: -180, east: 180 };
export function useRmMap() {
return useContext(RmMapContext);
}

// Command Center hook: how big the map's own buttons and boxes are, by the size of the map.
//   small (a laptop): 26px buttons, medium: 32px, large: Google's usual 40px.
function rmSizeFor(width, height) {
if (width < 760 || height < 560) return { name: 'small', control: 26 };
if (width < 1000 || height < 700) return { name: 'medium', control: 32 };
return { name: 'large', control: 40 };
}

// Icons for the zoom and full-screen buttons (Material icons, as on the grafana map).
const RM_ICON_ZOOM_IN = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z';
const RM_ICON_ZOOM_OUT = 'M19 13H5v-2h14v2z';
const RM_ICON_FULLSCREEN = 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z';
const RM_ICON_FULLSCREEN_EXIT = 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z';

function injectPulseAnimation() {
if (document.getElementById('rm-pulse-style')) return;
const style = document.createElement('style');
style.id = 'rm-pulse-style';
style.textContent = `
@keyframes rmPulse {
0% { transform: scale(1); opacity: 0.55; }
100% { transform: scale(2.6); opacity: 0; }
}
@keyframes rmSpin {
to { transform: rotate(360deg); }
}
/* Command Center hook: dark mode (see RmThemeContext). The map itself has a dark style, so
   only Google's own controls over it are flipped. */
.rm-dark .gm-style-mtc,
.rm-dark .gm-svpc { filter: invert(1) hue-rotate(180deg); }
/* Command Center hook: every box over the map (legend, title, Street View, Agent C&R) is the
   glass card of grafana-restraurant-custom-widgets (Card variant "glass"): see-through,
   blurred, its inset edge, 8px corners, in the map theme's colours (.rm-theme below). */
.rm-glass-card {
  box-sizing: border-box; background: transparent; color: var(--rm-text); border-radius: 8px;
  -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); box-shadow: var(--rm-glass-edge);
}
.rm-glass-card.rm-card { background: var(--rm-card); }
/* The Street View button wipes the host page's button look with an inline "all: unset", which would
   wipe these too. */
button.rm-glass-card {
  background: transparent !important; color: var(--rm-text) !important; box-shadow: var(--rm-glass-edge) !important;
  -webkit-backdrop-filter: blur(5px) !important; backdrop-filter: blur(5px) !important;
}
button.rm-glass-card:hover { background: var(--rm-surface) !important; }
/* Zoom and full-screen buttons: frosted glass, as on the map in grafana-restraurant-custom-widgets
   (control-buttons). Not flipped: each theme has its own colors here. */
.rm-glass {
  all: unset; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #27251F; border-radius: 999px;
  background: rgba(255,255,255,0.72); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  border: 1px solid rgba(39,37,31,0.16); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 4px rgba(0,0,0,0.18);
}
.rm-glass:hover { background: rgba(255,255,255,0.92); }
/* The icon's size is set on each svg (rmIcon), so other styles on the page can't shrink it. */
.rm-glass svg { flex: none; fill: currentColor; }
.rm-dark .rm-glass {
  color: #ffffff; background: rgba(10,27,57,0.55);
  border-color: rgba(255,255,255,0.23); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 4px rgba(0,0,0,0.4);
}
.rm-dark .rm-glass:hover { background: rgba(33,144,235,0.35); }
.rm-controls { margin: 10px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.rm-controls-row { display: flex; flex-direction: row; align-items: center; gap: 12px; }
.rm-zoom { display: flex; flex-direction: column; }
.rm-zoom .rm-glass:first-child { border-radius: 999px 999px 0 0; border-bottom: none; }
.rm-zoom .rm-glass:last-child { border-radius: 0 0 999px 999px; }
/* Command Center hook: no Google text box (map data, Terms, Report a map error) or keyboard
   shortcuts button in the bottom-right corner; the Google logo stays. */
.rm-container .gm-style-cc,
.rm-container .gm-style button[aria-label="Keyboard shortcuts"] { display: none !important; }
/* --- Store pop-up: the glass card of grafana-restraurant-custom-widgets ---
   Its app/theme/global-styles.tsx turns Google's white info window into a see-through,
   blurred card with an inset edge, with no tail and no Google close button (the card
   has its own). The colours are the theme's: light map below, dark map with .rm-dark.
   NOTE: these target Google's internal class names; if a future Maps update renames
   them, the pop-up reverts to Google's white bubble (cosmetic only). */
.rm-theme {
  --rm-text: rgba(0,0,0,0.87);
  --rm-muted: rgba(0,0,0,0.6);
  --rm-faint: rgba(0,0,0,0.42);
  --rm-line: rgba(0,0,0,0.1);
  --rm-surface: rgba(0,0,0,0.03);
  --rm-ring: #ffffff;
  --rm-accent: #8a6400;
  --rm-warn-text: #8a6400;
  --rm-bad-text: #A21D13;
  --rm-good-text: #2f6b32;
  /* Command Center hook: white glass, not grafana's nearly clear one, so the pop-up reads over the
     light map's colours. */
  --rm-card: linear-gradient(to bottom, rgba(255,255,255,0.84), rgba(255,255,255,0.92));
  --rm-glass-edge: inset 0 0 0 1px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.6);
  /* The store pop-up (.rm-seg): white glass on the light map, see-through on the dark one. */
  --rm-seg-bg: rgba(255,255,255,0.88);
}
.rm-theme.rm-dark {
  --rm-text: #ffffff;
  --rm-muted: rgb(147,162,183);
  --rm-faint: rgba(147,162,183,0.6);
  --rm-line: rgba(255,255,255,0.12);
  --rm-surface: rgba(255,255,255,0.04);
  --rm-ring: rgba(6,12,41,0.9);
  --rm-accent: #FFBC0D;
  --rm-warn-text: #FFD54F;
  --rm-bad-text: #FF8A80;
  --rm-good-text: #81C784;
  --rm-card: linear-gradient(to bottom, rgba(11,22,76,0.2), rgba(6,12,41,0.5));
  --rm-glass-edge: inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.35);
  --rm-seg-bg: transparent;
}
.gm-style .gm-style-iw.gm-style-iw-c {
  padding: 0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: transparent !important;
  color: var(--rm-text);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  box-shadow: var(--rm-glass-edge) !important;
}
.gm-style .gm-style-iw-d {
  overflow: hidden !important;
  padding: 0 !important;
}
.gm-style-iw-d::-webkit-scrollbar { display: none; }
.gm-style .gm-style-iw-ch,
.gm-style .gm-style-iw-tc,
.gm-style .gm-style-iw button.gm-ui-hover-effect { display: none !important; }
/* Command Center: Google fixes the pop-up's height when it opens, so rows that
   unfold later were cut off. Our card sets its own height limit instead, and
   the rows scroll inside it while the header and the Agent button stay put. */
.gm-style-iw.gm-style-iw-c, .gm-style-iw-d { max-height: none !important; }
.rm-scroll { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--rm-line) transparent; }
.rm-scroll::-webkit-scrollbar { width: 8px; }
.rm-scroll::-webkit-scrollbar-thumb { background: var(--rm-line); border-radius: 8px; }
.rm-scroll::-webkit-scrollbar-track { background: transparent; }
.rm-card { background: var(--rm-card); color: var(--rm-text); }
.rm-card-close {
  all: unset; box-sizing: border-box; flex: none; width: 28px; height: 28px; margin: -6px -8px -6px 0;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;
  background: none; color: var(--rm-muted); cursor: pointer;
}
.rm-card-close:hover { background: none; color: var(--rm-text); }
/* Command Center hook: the store's name opens its page in the app (window.__rmOpenStorePage). */
.rm-card-link { all: unset; cursor: pointer; font-weight: 700; font-size: 18px; line-height: 1.25; color: var(--rm-text); text-decoration: underline; text-underline-offset: 3px; }
.rm-card-link:hover, .rm-card-link:focus-visible { color: var(--rm-accent); }
.rm-card-close svg { width: 18px; height: 18px; fill: currentColor; }
/* the host page's button look beats "all: unset" and gave the X and the store's name a grey box. */
.rm-card button.rm-card-close, .rm-card button.rm-card-link {
  background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; min-width: 0 !important; height: auto !important;
}
.rm-card button.rm-card-close { width: 28px !important; height: 28px !important; color: var(--rm-muted) !important; }
.rm-card button.rm-card-close:hover { color: var(--rm-text) !important; }
.rm-card button.rm-card-link { color: var(--rm-text) !important; }
.rm-card button.rm-card-link:hover, .rm-card button.rm-card-link:focus-visible { color: var(--rm-accent) !important; }
.rm-card-agent { color: var(--rm-accent); transition: background 0.15s ease; }
.rm-card-agent:hover { background: var(--rm-line) !important; }
.rm-seg { width: 360px; box-sizing: border-box; font-family: Inter, "Open Sans", "Segoe UI", system-ui, sans-serif; font-size: 16px; line-height: 1.4; background: var(--rm-seg-bg); }
.rm-seg-top { flex: none; padding: 10px 20px 0; }
.rm-seg-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.rm-seg .rm-card-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 0 2px !important; font-size: 19px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
/* The store's name opens its page: drawn as a link, in the accent colour with the open icon. */
.rm-seg button.rm-card-link { color: var(--rm-accent) !important; }
.rm-seg button.rm-card-link:hover, .rm-seg button.rm-card-link:focus-visible { color: var(--rm-text) !important; }
.rm-seg .rm-card-link svg { flex: none; width: 18px; height: 18px; fill: currentColor; }
.rm-seg-sub { margin-bottom: 14px; font-size: 15px; color: var(--rm-muted); }
.rm-seg-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.rm-seg-label { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--rm-text); }
.rm-seg-label > svg { flex: none; width: 24px; height: 24px; fill: #aab2bd; }
.rm-seg-value { margin-left: 20px; font-weight: 600; font-size: 16px; color: var(--rm-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.rm-seg-rows { flex: 1 1 auto; min-height: 0; padding: 0 20px; }
.rm-seg .rm-acc > summary { margin-bottom: 12px; }
.rm-seg-open { all: unset; flex: none; cursor: pointer; margin: 4px 20px 16px; font-size: 15px; font-weight: 600; color: var(--rm-accent); }
.rm-seg-open:hover, .rm-seg-open:focus-visible { text-decoration: underline; }
/* the host page's button look beats "all: unset" and gave the footer a white box. */
.rm-seg button.rm-seg-open { height: auto !important; min-width: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; color: var(--rm-accent) !important; text-align: left; line-height: 1.4; }
.rm-seg button.rm-seg-open:hover { background: transparent !important; }
.rm-seg button.rm-card-close { width: 30px !important; height: 30px !important; margin: 0 -6px 0 0; color: var(--rm-text) !important; border-radius: 50%; }
.rm-seg button.rm-card-close:hover { background: var(--rm-line) !important; }
.rm-seg .rm-card-close svg { width: 20px; height: 20px; }
.rm-pill { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border-radius: 999px; padding: 4px 11px; }
.rm-pill-normal { background: rgba(67,160,71,0.18); color: #2f6b32; }
.rm-pill-warning { background: rgba(224,168,0,0.2); color: #8a6400; }
.rm-pill-critical { background: rgba(218,41,28,0.18); color: #A21D13; }
.rm-pill-nodata { background: rgba(66,133,244,0.18); color: #1a56b8; }
.rm-dark .rm-pill-normal { color: #81C784; }
.rm-dark .rm-pill-warning { color: #FFD54F; }
.rm-dark .rm-pill-critical { color: #FF8A80; }
.rm-dark .rm-pill-nodata { color: #90CAF9; }
`;
document.head.appendChild(style);
}

// Command Center hook: when a row in the pop-up unfolds, make sure the card still fits.
if (typeof window !== 'undefined' && !window.__rmToggleListener) {
window.__rmToggleListener = true;
document.addEventListener('toggle', (event) => {
const target = event.target;
if (!target || !target.closest || !target.closest('.rm-scroll')) return;
requestAnimationFrame(() => {
if (typeof window.__rmFitPopup === 'function') window.__rmFitPopup();
if (target.open) {
// Bring the newly opened list into view inside the scrolling area.
const box = target.closest('.rm-scroll');
const over = target.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
if (over > 0) box.scrollTop += Math.min(over + 8, target.getBoundingClientRect().top - box.getBoundingClientRect().top);
}
});
}, true);
}

// Registers a global click handler that the popup footer invokes via inline
// onclick. We have to use the window namespace because infoWindow.setContent()
// renders a static HTML string outside React's event system — there's no way
// to attach a React onClick to elements inside it. Idempotent: safe to call
// multiple times.
//
// Behavior: opens the configured Copilot agent conversation URL in a new tab
// (with the store-specific question appended as a query parameter when the URL
// supports it), AND copies the question to the clipboard as a fallback so the
// context is never lost even if the agent URL can't pre-fill it. The agent URL
// is read from window.__rmAgentUrl, which the component sets from config on each
// render. If no URL is configured, it degrades to clipboard-only.
function registerAskAIHandler() {
if (typeof window === 'undefined') return;
if (window.__rmAskAI) return;
window.__rmAskAI = function (storeKey, storeLabel, el) {
const safeLabel = storeLabel && storeLabel !== storeKey ? ` (${storeLabel})` : '';
const question = `Was an incident raised today, or a change implemented today, related to store ${storeKey}${safeLabel}? Please correlate any changes and incidents.`;
const agentUrl = window.__rmAgentUrl || '';

const showFeedback = (msg) => {
if (!el) return;
const original = el.innerHTML;
el.innerHTML = msg;
el.style.color = '#2f6b32';
setTimeout(() => {
el.innerHTML = original;
el.style.color = '#b9912e';
}, 1800);
};

// Copy the question to the clipboard (fallback so context is never lost).
const copyToClipboard = () => {
try {
if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(question);
} else {
const ta = document.createElement('textarea');
ta.value = question;
ta.style.position = 'fixed';
ta.style.opacity = '0';
document.body.appendChild(ta);
ta.select();
try { document.execCommand('copy'); } catch (e) { /* ignore */ }
document.body.removeChild(ta);
}
} catch (e) { /* ignore clipboard errors */ }
};

if (agentUrl) {
// Append the question as a query parameter. Many Copilot Studio
// conversation URLs accept a pre-filled message; if this particular URL
// ignores the param, the agent still opens and the clipboard fallback
// covers the context.
let target = agentUrl;
try {
const u = new URL(agentUrl);
u.searchParams.set('q', question);
target = u.toString();
} catch (e) {
// agentUrl wasn't a fully-qualified URL; append manually as a fallback.
const sep = agentUrl.indexOf('?') === -1 ? '?' : '&';
target = `${agentUrl}${sep}q=${encodeURIComponent(question)}`;
}
copyToClipboard();
window.open(target, '_blank', 'noopener,noreferrer');
showFeedback('Opening agent &mdash; question copied &check;');
} else {
// No agent URL configured: clipboard-only, like before.
copyToClipboard();
showFeedback('Question copied to clipboard &check;');
}
};
}

function EmptyState({ title, message }) {
return (
<div className="cc-empty" role="status">
<h3 style={{ margin: '0 0 6px' }}>{title}</h3>
<p style={{ margin: 0 }}>{message}</p>
</div>
);
}


function loadGoogleMaps(apiKey) {
return new Promise((resolve, reject) => {
if (window.google && window.google.maps) {
resolve(window.google);
return;
}
const existingScript = document.getElementById('google-maps-script');
if (existingScript) existingScript.remove();
const script = document.createElement('script');
script.id = 'google-maps-script';
const encodedKey = encodeURIComponent(String(apiKey || '').trim());
script.src = `https://maps.googleapis.com/maps/api/js?key=${encodedKey}`;
script.async = true;
script.defer = true;
script.onload = () => resolve(window.google);
script.onerror = () => reject(new Error('Google Maps failed to load'));
document.head.appendChild(script);
});
}

function normalizeStoreKey(value) {
if (value === null || value === undefined) return null;
const raw = String(value).trim();
if (!raw) return null;
const stripped = raw.replace(/^0+/, '');
return stripped || '0';
}

// ---- Command Center hook: pop-up rows that unfold into lists --------------
// Used only when a surrounding app supplies window.__rmRowDetail (the Command
// Center does; a dashboard tile does not, so the dashboard map is unchanged).
//   A simple row shows "3/3" in place of "3" and unfolds into a list of names.
//   A group row (for example GRNT) unfolds into parts, and each part unfolds
//   into its own list.
// Green "healthy" icons are drawn only when the app sets window.__rmShowHealthyDots.
function rmEscapeHtml(value) {
return String(value === null || value === undefined ? '' : value)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const RM_GREEN = '#43A047';
const RM_AMBER = '#E0A800';

function rmHealthyDotsOn() {
return typeof window !== 'undefined' && window.__rmShowHealthyDots === true;
}

// True when a row has thresholds or a match word set on the map tile. Only
// such rows can be called healthy; a row with no rule gets no green icon.
function rmRowHasRule(threshold) {
if (!threshold) return false;
if (Number.isFinite(Number(threshold.warning)) && threshold.warning !== '' && threshold.warning !== null) return true;
if (Number.isFinite(Number(threshold.critical)) && threshold.critical !== '' && threshold.critical !== null) return true;
return Boolean(threshold.criticalMatch && String(threshold.criticalMatch).trim());
}

// The colour of an ordinary row's icon: the map's colour when a threshold is
// breached, green when the row has a rule and passes it, else the icon's own grey.
function rmLeadColor(mapColor, threshold, rawVal) {
if (mapColor) return mapColor;
if (!rmHealthyDotsOn() || rawVal === null || rawVal === undefined) return '';
return rmRowHasRule(threshold) ? RM_GREEN : '';
}

// The list inside an unfolded row. `part` is { outOf, things, window, status, items }.
function rmListHtml(part) {
const outOf = Number(part.outOf) > 0 ? Number(part.outOf) : 0;
const items = Array.isArray(part.items) ? part.items : [];
const things = rmEscapeHtml(part.things || 'items');
const when = part.window ? ` ${rmEscapeHtml(part.window)}` : '';
if (part.status === 'loading') return `<div style="color:var(--rm-faint);font-size:15px;">Still loading. Close this pop-up and open it again.</div>`;
if (part.status === 'failed') return `<div style="color:var(--rm-bad-text);font-size:15px;">The list could not be loaded. See the setup check.</div>`;
if (items.length === 0 && !(Array.isArray(part.missing) && part.missing.length)) return `<div style="color:var(--rm-muted);font-size:15px;">No ${things} reported${when}.</div>`;
const rows = items.map((item) => {
const name = item && typeof item === 'object' ? item.name : item;
const note = item && typeof item === 'object' && item.note ? `<span style="margin-left:8px;color:var(--rm-faint);">${rmEscapeHtml(item.note)}</span>` : '';
return `
<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">
<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;line-height:1.4;color:var(--rm-text);overflow-wrap:anywhere;">${rmEscapeHtml(name)}${note}</span>
</div>`;
}).join('');
const missing = (Array.isArray(part.missing) ? part.missing : []).map((item) => `
<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">
<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;line-height:1.4;color:var(--rm-warn-text);overflow-wrap:anywhere;">${rmEscapeHtml(item && typeof item === 'object' ? item.name : item)}<span style="margin-left:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">not reporting</span></span>
</div>`).join('');
const short = outOf && items.length < outOf
? `<div style="margin-top:4px;color:var(--rm-warn-text);font-size:15px;font-weight:600;">${outOf - items.length} of ${outOf} not reporting</div>`
: '';
return `<div style="color:var(--rm-muted);font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px;">Reporting${when}</div>${rows}${missing}${short}`;
}

const RM_ACC_STYLE = '<style>.rm-acc > summary { list-style: none; } .rm-acc > summary::-webkit-details-marker { display: none; } .rm-acc[open] > summary .rm-chev { transform: rotate(90deg); }</style>';
const RM_CHEVRON = '<span class="rm-chev" style="display:inline-block;margin-left:7px;color:var(--rm-accent);font-size:15px;transition:transform 0.15s ease;">&#9654;</span>';

// A top-level row that unfolds. `leadColor` is its icon's status colour, `shown` the value on the right.
function rmUnfoldingRowHtml(leadColor, name, shown, bodyHtml) {
return `
<details class="rm-acc">
${RM_ACC_STYLE}
<summary class="rm-seg-row" style="cursor:pointer;user-select:none;outline-offset:2px;">
<span class="rm-seg-label">${rmIconSvg(rmRowIconPath(name), leadColor)}<span style="display:inline-flex;align-items:center;">${rmEscapeHtml(name)}${RM_CHEVRON}</span></span>
<span class="rm-seg-value">${shown}</span>
</summary>
${bodyHtml}
</details>`;
}

// A simple row: "Edge Node Availability 3/3" that unfolds into the node names.
// The number before the slash is the map's own number for the row.
function rmDetailRowHtml(label, mapColor, display, val, rawVal, detail) {
const outOf = Number(detail.outOf) > 0 ? Number(detail.outOf) : 0;
const full = !outOf || Number(val) >= outOf;
let lead = mapColor;
if (!lead && !full) lead = RM_AMBER;
if (!lead && rmHealthyDotsOn() && rawVal !== null && rawVal !== undefined) lead = RM_GREEN;
const body = `<div style="margin:0 0 12px;padding:9px 11px;background:var(--rm-surface);border:1px solid var(--rm-line);border-radius:9px;">${rmListHtml(detail)}</div>`;
return rmUnfoldingRowHtml(lead, detail.showAs || label, outOf ? `${display}/${outOf}` : `${display}`, body);
}

// A group row: "GRNT 2/2" that unfolds into parts ("Firewall Gateways 2/2",
// "Switches 2/2", ...). Each part with a query unfolds into its own list.
// A part's number is how many names its query returned for this store.
function rmGroupRowHtml(label, mapColor, detail) {
const parts = Array.isArray(detail.parts) ? detail.parts : [];
let have = 0;
let expected = 0;
let known = 0;
let anyShort = false;

const partRows = parts.map((part, index) => {
const outOf = Number(part.outOf) > 0 ? Number(part.outOf) : 0;
const divider = index === 0 ? '' : 'border-top:1px solid var(--rm-line);';
const nameHtml = rmEscapeHtml(part.name);
const labelStyle = 'display:inline-flex;align-items:center;color:var(--rm-muted);font-size:15px;font-weight:500;';
const valueStyle = 'font-weight:600;font-size:15px;font-variant-numeric:tabular-nums;';

if (part.status !== 'ok') {
const why = part.status === 'loading' ? 'Loading' : part.status === 'failed' ? 'Could not load' : part.status === 'nodata' ? 'No data' : 'No query yet';
return `
<div style="${divider}display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
<span style="${labelStyle}">${nameHtml}<span style="margin-left:8px;color:var(--rm-faint);font-size:15px;font-weight:500;">${why}</span></span>
<span style="${valueStyle}color:var(--rm-faint);">&ndash;${outOf ? `/${outOf}` : ''}</span>
</div>`;
}

const count = Array.isArray(part.items) ? part.items.length : 0;
const full = !outOf || count >= outOf;
known += 1;
have += count;
expected += outOf;
if (!full) anyShort = true;
// The part's number in its status colour: amber when some are missing, green when all report.
const tone = !full ? RM_AMBER : rmHealthyDotsOn() ? RM_GREEN : 'var(--rm-text)';
return `
<details class="rm-acc" style="${divider}">
<summary style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;cursor:pointer;user-select:none;outline-offset:2px;">
<span style="${labelStyle}">${nameHtml}${RM_CHEVRON}</span>
<span style="${valueStyle}color:${tone};">${count}${outOf ? `/${outOf}` : ''}</span>
</summary>
<div style="margin:0 0 10px;padding:8px 10px;background:var(--rm-surface);border:1px solid var(--rm-line);border-radius:8px;">${rmListHtml(part)}</div>
</details>`;
}).join('');

// The icon's colour follows the parts, not the map tile's own query for this row. The tile's
// query is only used while the parts are still loading or have no query.
let lead;
if (anyShort) lead = RM_AMBER;
else if (known > 0 && known === parts.length) lead = rmHealthyDotsOn() ? RM_GREEN : '';
else lead = mapColor || (known > 0 && rmHealthyDotsOn() ? RM_GREEN : '');
const shown = known > 0 ? `${have}${expected ? `/${expected}` : ''}` : '&ndash;';
const body = `<div style="margin:0 0 12px;padding:2px 11px;background:var(--rm-surface);border:1px solid var(--rm-line);border-radius:9px;">${partRows}</div>`;
return rmUnfoldingRowHtml(lead, detail.showAs || label, shown, body);
}
// ---- end of Command Center hook ------------------------------------------

function formatMetric(value) {
if (value === null || value === undefined) return '-';
if (typeof value === 'number') {
return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}
return String(value);
}
function toThreshold(value) {
if (value === '' || value === null || value === undefined) return NaN;
const n = Number(value);
return Number.isFinite(n) ? n : NaN;
}

// Evaluates all metric values against their per-query thresholds and returns the worst status.
// Q2 (i=0) drives color even without thresholds (presence/absence). Q3+ only affect
// marker color when their thresholds are explicitly configured.
// Returns true if the metric's value (coerced to string) contains the
// configured criticalMatch string (case-insensitive). Returns false when no
// match string is configured, when the value is empty, or when there's no
// substring hit. Pure helper — separated so the rule can be tweaked in one
// place if needed (e.g. switch from contains to exact match).
function matchesCriticalString(value, threshold) {
if (!threshold) return false;
const needle = threshold.criticalMatch;
if (needle === null || needle === undefined) return false;
const needleStr = String(needle).trim().toLowerCase();
if (!needleStr) return false;
if (value === null || value === undefined) return false;
const haystack = String(value).toLowerCase();
return haystack.includes(needleStr);
}

// Command Center hook: the words the pop-up's status pill uses.
const RM_STATUS_WORD = { normal: 'Normal', warning: 'Warning', critical: 'Critical', nodata: 'No data' };

function computeStoreStatus(store, config) {
const { queryThresholds, zeroBehavior, noDataBehavior } = config;
// rank includes 'nodata' as its own band BELOW warning, so a real
// threshold breach always wins over a "no data" classification, but
// "no data" can still be surfaced distinctly when nothing else fired.
const rank = { normal: 0, nodata: 1, warning: 2, critical: 3 };
let worst = 'normal';
const elevate = (s) => { if ((rank[s] ?? 0) > rank[worst]) worst = s; };

// How a metric that RETURNED a real 0 should be treated. A real 0 is not
// the same as missing data: "DoorDash failures = 0" may be healthy (no
// failures) or, for some metrics, suspicious. Configurable per use case.
const zeroElevation =
zeroBehavior === 'critical' ? 'critical'
: zeroBehavior === 'warning' ? 'warning'
: null; // 'healthy' / default: a real 0 elevates nothing

// How a store ABSENT from all configured metric queries (null, not 0)
// should show. 'nodata' uses a distinct marker color; the others fold it
// into an existing band. Default 'nodata' so missing reporting is visible.
const noDataElevation =
noDataBehavior === 'critical' ? 'critical'
: noDataBehavior === 'warning' ? 'warning'
: noDataBehavior === 'normal' ? null
: 'nodata'; // default

let configuredCount = 0;
let nullCount = 0; // truly absent from the query results

(queryThresholds || []).forEach((thr, i) => {
const val = store.metrics[`m${i + 1}`];
const wNum = Number(thr.warning);
const cNum = Number(thr.critical);
const hasNumericThresholds = Number.isFinite(wNum) || Number.isFinite(cNum);
const hasMatchString = thr && thr.criticalMatch && String(thr.criticalMatch).trim() !== '';
const isConfigured = hasNumericThresholds || hasMatchString;
if (isConfigured) {
configuredCount += 1;
if (val === null || val === undefined) nullCount += 1;
}

// Optional string-match check (additive). If configured and the value
// contains the match string, this row is critical regardless of numbers.
if (matchesCriticalString(val, thr)) {
elevate('critical');
return;
}

// Truly absent (null) is handled by the no-data rule after the loop, not
// here. A present value of 0, however, is real data and is evaluated.
if ((val === null || val === undefined) && config.missingCritical && config.missingCritical[i]) {
elevate('critical'); // edge / GRNT: no answer for this store is treated as down
return;
}
if (val === null || val === undefined) return;

const num = Number(val);
// A real zero gets the configurable zeroBehavior treatment, but ONLY for
// slots that are configured (we don't infer meaning for unconfigured ones).
if (isConfigured && Number.isFinite(num) && num === 0 && zeroElevation) {
elevate(zeroElevation);
}

if (!hasNumericThresholds) return;
if (!Number.isFinite(num)) return;
const lowerIsWorse = thr.direction === 'below';
if (lowerIsWorse) {
if (Number.isFinite(cNum) && num <= cNum) elevate('critical');
else if (Number.isFinite(wNum) && num <= wNum) elevate('warning');
} else {
if (Number.isFinite(cNum) && num >= cNum) elevate('critical');
else if (Number.isFinite(wNum) && num >= wNum) elevate('warning');
}
});

// No-data rule: only when at least one slot is configured AND every
// configured slot was truly absent (null). elevate() never downgrades, so
// if any real breach fired above, that wins over the no-data classification.
if (configuredCount > 0 && nullCount === configuredCount && noDataElevation) {
elevate(noDataElevation);
}

return worst;
}

function normalizeColorChoice(value, fallback = 'green') {
const v = String(value || '').trim().toLowerCase();
if (v === 'red' || v === 'critical') return 'critical';
if (v === 'yellow' || v === 'warning') return 'warning';
if (v === 'green' || v === 'normal' || v === 'healthy') return 'normal';
if (fallback === 'red') return 'critical';
if (fallback === 'yellow') return 'warning';
return 'normal';
}

// Evaluates a SINGLE metric (by index) against its threshold and returns
// 'normal' | 'warning' | 'critical'. This is used ONLY for popup row
// highlighting and intentionally mirrors the same threshold rules as
// computeStoreStatus so the row dot and the store pill never disagree.
// Pure read of existing config; does not alter store-level status calculation.
function computeMetricStatus(value, threshold, config, metricIndex) {
// Status comes ONLY from configured thresholds and string matches on
// queries 2-5. Query 1 (the base location query) plots the store; it
// does not contribute to health. metricIndex/config remain in the
// signature for backward compatibility but no longer drive behavior.
if (value === null || value === undefined) return 'normal';
// Optional string-match check (additive). Same semantics as in
// computeStoreStatus so the row dot and store pill always agree.
if (matchesCriticalString(value, threshold)) return 'critical';
if (!threshold) return 'normal';
const wNum = Number(threshold.warning);
const cNum = Number(threshold.critical);
const hasThresholds = Number.isFinite(wNum) || Number.isFinite(cNum);
if (!hasThresholds) return 'normal';
const num = Number(value);
if (!Number.isFinite(num)) return 'normal';
const lowerIsWorse = threshold.direction === 'below';
if (lowerIsWorse) {
if (Number.isFinite(cNum) && num <= cNum) return 'critical';
if (Number.isFinite(wNum) && num <= wNum) return 'warning';
} else {
if (Number.isFinite(cNum) && num >= cNum) return 'critical';
if (Number.isFinite(wNum) && num >= wNum) return 'warning';
}
return 'normal';
}

function getMarkerColor(status, config) {
const { normalColor, warningColor, criticalColor, noDataColor } = config;
if (status === 'critical') return criticalColor || '#d93025';
if (status === 'warning') return warningColor || '#fbbc04';
if (status === 'nodata') return noDataColor || '#4285f4';
return normalColor || '#34a853';
}

// Command Center hook: what a store's pop-up says, as data, for the app's store page
// (rmLayer.onDetail): the store, its status, and one row per metric in use, with the same
// value and status as the pop-up's row.
function rmStoreDetail(store, status, metricLabels, metricConfigured, markerConfig) {
const rows = [];
(metricLabels || []).forEach((label, i) => {
if (!label || (metricConfigured && !metricConfigured[i])) return;
const raw = store.metrics[`m${i + 1}`];
const val = (raw === null || raw === undefined) ? 0 : raw;
const missingRed = (raw === null || raw === undefined) && Boolean(markerConfig.missingCritical && markerConfig.missingCritical[i]);
const threshold = (markerConfig.queryThresholds || [])[i];
const hasRule = Boolean(threshold) && (Number.isFinite(toThreshold(threshold.warning)) || Number.isFinite(toThreshold(threshold.critical)) || Boolean(threshold.criticalMatch && String(threshold.criticalMatch).trim()));
rows.push({
label,
value: missingRed ? 'No data' : formatMetric(val),
raw: raw === undefined ? null : raw,
status: missingRed ? 'critical' : computeMetricStatus(val, threshold, markerConfig, i),
hasRule,
});
});
return { key: String(store.key), label: store.label, country: store.country || '', lat: store.lat, lng: store.lng, status, rows };
}

function GoogleMapCanvas({
width,
height,
stores,
mapId,
initialLat,
initialLng,
initialZoom,
metricLabels,
markerConfig,
mapTitle,
metricConfigured,
}) {
const mapRef = useRef(null);
const mapInstanceRef = useRef(null);
// Command Center hook: the pins and clusters (store-pins.js), each store's newest
// numbers, and what a click on a pin does.
const rmStorePinsRef = useRef(null);
const rmPinDataRef = useRef({});
const rmOpenPinRef = useRef(null);
// Where the zoom and full-screen buttons go: a box handed to Google's top-right button corner.
const [rmSlots, setRmSlots] = useState(null);
const rmBoxRef = useRef(null);
const [rmFullscreen, setRmFullscreen] = useState(false);
const infoWindowRef = useRef(null);
const streetViewRef = useRef(null);
const [loadError, setLoadError] = useState(null);
const [mapsLoaded, setMapsLoaded] = useState(false);
const [selectedStore, setSelectedStore] = useState(null);
const [streetViewOpen, setStreetViewOpen] = useState(false);
// Command Center hook: dark mode (see RmThemeContext), and sizes.
const rmDark = useContext(RmThemeContext);
const rmSize = rmSizeFor(width, height);
// The zoom and full-screen icons fill most of their button, so they read even on a small map.
const rmIcon = Math.round(rmSize.control * 0.8);
// Command Center hook: the status buttons in the top-right corner (All · Normal · Warning ·
// Critical, MUI's toggle button group) show only the stores in the chosen status ('all' or a status).
const rmMuiTheme = useTheme();
const [rmStatusFilter, setRmStatusFilter] = useState('all');
// Command Center hook: the layer (see RmLayerContext).
const rmLayer = useContext(RmLayerContext);
const rmService = rmLayer.name === 'service';
const [streetViewAvailable, setStreetViewAvailable] = useState(true);
// Agent C&R panel state. The footer click (static HTML, outside React) opens
// this panel via a window bridge; an effect then POSTs to the configured Power
// Automate flow and renders the plain-text answer it returns.
const [agentStore, setAgentStore] = useState(null);
const [agentOpen, setAgentOpen] = useState(false);
const [agentLoading, setAgentLoading] = useState(false);
const [agentResult, setAgentResult] = useState(null);
const [agentError, setAgentError] = useState('');
const agentRequestId = useRef(0);
// Remembers which store we've already sent a flow POST for while the panel is
// open, so a re-render can't fire a second POST (and a second email) for the
// same invoke. Reset when the panel closes.
const agentSentKeyRef = useRef(null);

// Content signature of the store data. The `stores` array gets a brand-new
// reference on every parent render (mergeStoreData builds fresh objects each
// time the stores are loaded), so depending on the
// array reference directly causes the marker effect to fire on EVERY keystroke
// in the config panel — even when the underlying data is unchanged. By keying
// the effect on a cheap string signature of the actual values instead, the
// markers only redraw when real data changes, not on incidental re-renders.
// This is the single biggest lever for both the "markers refresh while typing"
// jank and the cost of redrawing up to ~1,500 markers needlessly.
// Command Center hook: the stores the map last zoomed to fit (see the pin redraw below).
const rmLastPlacesRef = useRef('');
const storesSignature = useMemo(() => {
if (!Array.isArray(stores)) return '';
// key|m1|m2|m3|m4 per store, joined. Cheap relative to a marker rebuild.
let sig = `${stores.length}`;
for (let i = 0; i < stores.length; i += 1) {
const st = stores[i];
const m = st.metrics || {};
sig += `;${st.key}:${st.lat},${st.lng}:${m.m1}|${m.m2}|${m.m3}|${m.m4}|${m.m5}`;
}
return sig;
}, [stores]);

// Bridge: the popup footer (static HTML) calls window.__rmAgentRequest on click.
// We register it here so it can flip React state and open the agent panel. We
// keep it in sync every render so it always closes over the latest setters.
useEffect(() => {
if (typeof window === 'undefined') return undefined;
window.__rmAgentRequest = (storeKey, storeLabel, storeCountry) => {
const shown = (window.__rmPopupStatus && window.__rmPopupStatus[String(storeKey)]) || null;
const country = String(storeCountry || '').trim() || window.__rmDefaultCountry || null;
setAgentStore({ key: storeKey, label: storeLabel || storeKey, country, status: shown ? shown.status : null, reasons: shown ? shown.reasons : [] });
setAgentResult(null);
setAgentError('');
setAgentOpen(true);
};
return () => { try { delete window.__rmAgentRequest; } catch (e) { /* noop */ } };
}, []);

// When the agent panel opens for a store, POST to the configured Power Automate
// flow and show the plain-text answer it returns. Synchronous pattern: we wait
// for the flow's HTTP Response. A request id guards against a stale response
// landing after the user has moved to a different store or closed the panel.
useEffect(() => {
if (!agentOpen || !agentStore) {
// Panel closed (or no store): clear the guard so the next invoke can send.
agentSentKeyRef.current = null;
return;
}
const flowUrl = (typeof window !== 'undefined' && window.__rmAgentFlowUrl) || '';
const baseQuestion = `Was an incident raised today, or a change implemented today, related to store ${agentStore.key}${agentStore.country ? ` (${agentStore.country})` : ''}? Please correlate any changes and incidents.`;
const why = (agentStore.reasons || []).map((r) => `${r.metric} is ${r.value} (${r.level.toLowerCase()})`).join('; ');
const question = agentStore.status
? `${baseQuestion} The restaurant status shown in the Command Center pop-up is ${agentStore.status.toUpperCase()}${why ? ` because ${why}` : ''}. Your overallHealth must be exactly "${agentStore.status}", the same as the pop-up. Do not raise or lower it based on what you find; put any concerns in the summary instead.`
: baseQuestion;

// Command Center hook: no flow address set: an example answer built from the mock data.
if (!flowUrl) {
const sendKeyMock = `${agentStore.key}`;
if (agentSentKeyRef.current === sendKeyMock) return;
agentSentKeyRef.current = sendKeyMock;
agentRequestId.current += 1;
const mockId = agentRequestId.current;
setAgentLoading(true);
setAgentResult(null);
setAgentError('');
mockCorrelation(agentStore).then((result) => {
if (mockId !== agentRequestId.current) return;
setAgentResult(result);
setAgentLoading(false);
});
return;
}

// Guard: only POST once per opened store. If this effect re-runs for the same
// store while the panel is already open (e.g. a re-render), skip the duplicate
// send so the flow (and its email) fires exactly once per invoke.
const sendKey = `${agentStore.key}`;
if (agentSentKeyRef.current === sendKey) return;
agentSentKeyRef.current = sendKey;

agentRequestId.current += 1;
const myId = agentRequestId.current;
setAgentLoading(true);
setAgentResult(null);
setAgentError('');

(async () => {
try {
// Build a dynamic snapshot of THIS store's metric values, keyed by their
// configured labels (e.g. { "DoorDash Failures": 6, "GrubHub Failures": 6 }).
// Nothing is hardcoded: labels come from the Query 2-6 config, so a UK store
// with UK vendor queries sends UK labels automatically. We look the store up
// in the current stores array by key and pair each label with its m-value.
// This is additive — it only enriches the request; it changes nothing shown
// on the map.
const metricsSnapshot = {};
try {
const matched = (stores || []).find((s) => s && String(s.key) === String(agentStore.key));
if (matched && matched.metrics) {
(metricLabels || []).forEach((label, i) => {
if (!label) return;
const raw = matched.metrics[`m${i + 1}`];
metricsSnapshot[label] = (raw === null || raw === undefined) ? 0 : raw;
});
}
} catch (e) { /* metrics are best-effort; never block the request */ }
// Safety net: abort the request if the flow never delivers a response to the
// browser. Without this the spinner can run forever even when the flow itself
// completed successfully on the Power Automate side.
const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
const timeoutId = setTimeout(() => { try { if (controller) controller.abort(); } catch (e) { /* noop */ } }, 180000);
let resp;
try {
resp = await fetch(flowUrl, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
signal: controller ? controller.signal : undefined,
body: JSON.stringify({
storeNumber: agentStore.key,
storeLabel: agentStore.label,
country: agentStore.country || null,
restaurantStatus: agentStore.status || null,
statusReasons: agentStore.reasons || [],
metrics: metricsSnapshot,
question,
}),
});
} finally {
clearTimeout(timeoutId);
}
if (myId !== agentRequestId.current) return; // stale; ignore
if (!resp.ok) {
setAgentError(`The flow returned an error (HTTP ${resp.status}). Check the flow URL and that it returns a response.`);
setAgentLoading(false);
return;
}
const text = await resp.text();
if (myId !== agentRequestId.current) return; // stale; ignore
if (!text || !text.trim()) {
setAgentResult({ __plain: 'The flow returned an empty response.' });
setAgentLoading(false);
return;
}
// Prefer structured JSON. Agents often wrap JSON in a ```json fence or add a
// sentence before it, which breaks a naive JSON.parse. So we try the raw text
// first, then progressively: strip code fences, then extract the outermost
// {...} block. If all fail, fall back to showing the text so nothing is lost.
const tryParse = (raw) => {
try {
const v = JSON.parse(raw);
return v && typeof v === 'object' ? v : null;
} catch (e) {
return null;
}
};
let parsed = tryParse(text);
if (!parsed) {
// Strip ```json ... ``` or ``` ... ``` fences.
const fenced = text.replace(/```(?:json)?/gi, '').trim();
parsed = tryParse(fenced);
}
if (!parsed) {
// Grab the outermost { ... } block from surrounding prose.
const first = text.indexOf('{');
const last = text.lastIndexOf('}');
if (first !== -1 && last !== -1 && last > first) {
parsed = tryParse(text.slice(first, last + 1));
}
}
if (parsed) {
setAgentResult(parsed);
} else {
setAgentResult({ __plain: text });
}
setAgentLoading(false);
} catch (err) {
if (myId !== agentRequestId.current) return; // stale; ignore
const aborted = err && (err.name === 'AbortError');
setAgentError(aborted
? 'The flow did not return a response in time. The flow may have completed on the Power Automate side without delivering a reply to the browser. Check the flow run and its Response step.'
: 'Could not reach the flow. This is often a CORS or network restriction; see the browser console for the exact error.');
setAgentLoading(false);
} finally {
// Guarantee the spinner never sticks: if this is still the active request,
// clear loading regardless of which path we exited through.
if (myId === agentRequestId.current) setAgentLoading(false);
}
})();
}, [agentOpen, agentStore]);

useEffect(() => {
let cancelled = false;
async function initMap() {
try {
injectPulseAnimation();
registerAskAIHandler();
const google = await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
if (google.maps.importLibrary) {
try {
await google.maps.importLibrary('maps');
} catch (e) {
console.warn('Maps library import failed.', e);
}
}
if (cancelled || !mapRef.current) return;
const hasRealMapId = mapId && mapId !== 'DEMO_MAP_ID';
mapInstanceRef.current = new google.maps.Map(mapRef.current, {
center: { lat: initialLat, lng: initialLng },
zoom: initialZoom,
maxZoom: 20,
// Only the glass zoom and full screen buttons below (as on the grafana map); all of
// Google's own buttons are off.
disableDefaultUI: true,
// Command Center hook: inside RM_BOUNDS (above). strictBounds keeps the whole view inside, so
// zooming out can't show what is outside either.
restriction: { latLngBounds: RM_BOUNDS, strictBounds: true },
// A real Map ID takes its colours from the Google Cloud console and ignores `styles`.
...(hasRealMapId ? { mapId } : { styles: rmMapStyles(rmDark) }),
});
infoWindowRef.current = new google.maps.InfoWindow();
// The card's own X (Google's is hidden, as on the grafana map) closes it here.
window.__rmClosePopup = () => {
if (infoWindowRef.current) infoWindowRef.current.close();
window.__rmOpenStoreKey = null;
if (rmStorePinsRef.current) rmStorePinsRef.current.setSelected(null);
};
infoWindowRef.current.addListener('closeclick', window.__rmClosePopup);
rmStorePinsRef.current = createStorePins(mapInstanceRef.current, (store) => {
const latest = rmPinDataRef.current[String(store.key)];
if (latest && typeof rmOpenPinRef.current === 'function') rmOpenPinRef.current(latest.store, latest.status);
});
const topRight = document.createElement('div');
mapInstanceRef.current.controls[google.maps.ControlPosition.RIGHT_TOP].push(topRight);
setRmSlots({ topRight });
setMapsLoaded(true);
} catch (err) {
if (!cancelled) setLoadError(err);
}
}
initMap();
return () => {
cancelled = true;
try { delete window.__rmClosePopup; } catch (e) { /* noop */ }
try { delete window.__rmFocusStore; } catch (e) { /* noop */ }
if (rmStorePinsRef.current) {
try { rmStorePinsRef.current.destroy(); } catch (e) { /* already gone */ }
rmStorePinsRef.current = null;
}
rmPinDataRef.current = {};
};
// SPA reuse contract — DO NOT widen this dependency array.
// The Google Maps JS API bills per `new google.maps.Map()` call (one
// "Dynamic Maps load" each). Keeping this dep array empty guarantees the
// map instance is created exactly once per browser tab/session, no matter
// how often parent props change (time picker, refresh, panel resize, etc.).
// Marker updates happen in a separate effect below that mutates the existing
// map. If you ever need center/zoom to react to prop changes at runtime, do
// it imperatively (map.setCenter / map.setZoom) — do NOT add deps here.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Command Center hook: a new theme only swaps the map's style. The map is not made again.
useEffect(() => {
if (!mapsLoaded || !mapInstanceRef.current || (mapId && mapId !== 'DEMO_MAP_ID')) return;
mapInstanceRef.current.setOptions({ styles: rmMapStyles(rmDark) });
}, [mapsLoaded, rmDark, mapId]);

// The full-screen button shows the whole map box (title, legend and pop-ups included).
useEffect(() => {
const update = () => setRmFullscreen(Boolean(rmBoxRef.current) && document.fullscreenElement === rmBoxRef.current);
document.addEventListener('fullscreenchange', update);
return () => document.removeEventListener('fullscreenchange', update);
}, []);

useEffect(() => {
if (!mapsLoaded || !window.google || !mapInstanceRef.current || !infoWindowRef.current) {
return undefined;
}
// 150ms debounce: when config-panel typing fires rapid prop changes, we
// want to skip the expensive 14k-marker redraw until the burst settles.
// On normal data refresh (no typing burst) the user sees a single 150ms
// delay, which is invisible. On a typing burst, only the last keystroke
// triggers the redraw.
const timeoutId = setTimeout(() => {
const google = window.google;
const map = mapInstanceRef.current;
const infoWindow = infoWindowRef.current;
if (!map || !infoWindow) return;

// Command Center hook: the app asks the map to show a store (picked in the store
// drop-down, or opened from the page's address): zoom to it and open its pop-up.
// Gives back false while the store is not on the map (yet).
window.__rmFocusStore = (key) => {
const latest = rmPinDataRef.current[String(key)];
if (!latest || typeof rmOpenPinRef.current !== 'function') return false;
map.panTo({ lat: latest.store.lat, lng: latest.store.lng });
map.setZoom(Math.max(map.getZoom() || 0, 12));
rmOpenPinRef.current(latest.store, latest.status);
return true;
};

// What a click on a pin does: open its pop-up with that store's newest numbers.
// The pop-up stays open across refreshes; it sits on the map, not on the pin.
rmOpenPinRef.current = (store, status) => {
window.__rmOpenStoreKey = store.key;
if (rmStorePinsRef.current) rmStorePinsRef.current.setSelected(store.key);
setSelectedStore(store);
// Command Center hook: tell the surrounding app which store was clicked.
if (typeof window !== 'undefined' && typeof window.__rmOnStoreSelect === 'function') {
try { window.__rmOnStoreSelect({ key: store.key, label: store.label, country: store.country, status }); } catch (e) { /* never block the popup */ }
}
setStreetViewOpen(false);
setStreetViewAvailable(true);

const statusColor = getMarkerColor(status, markerConfig);

// The Status row is the only place the card shows the store's status, in its rm-pill-* colour.

// Command Center hook: remember what this pop-up says (its status and the rows
// that caused it), so "Invoke Agent C&R" can send exactly that to the agent.
try {
const reasons = [];
(metricLabels || []).forEach((label, i) => {
if (!label || (metricConfigured && !metricConfigured[i])) return;
const raw = store.metrics[`m${i + 1}`];
const v = (raw === null || raw === undefined) ? 0 : raw;
if ((raw === null || raw === undefined) && markerConfig.missingCritical && markerConfig.missingCritical[i]) {
reasons.push({ metric: label, value: 'no data', level: RM_STATUS_WORD.critical });
return;
}
const level = computeMetricStatus(v, (markerConfig.queryThresholds || [])[i], markerConfig, i);
if (level === 'warning' || level === 'critical') reasons.push({ metric: label, value: v, level: RM_STATUS_WORD[level] });
});
window.__rmPopupStatus = window.__rmPopupStatus || {};
window.__rmPopupStatus[String(store.key)] = { status: RM_STATUS_WORD[status] || 'Normal', reasons };
} catch (e) { /* never block the pop-up */ }

const metricsRows = (metricLabels || [])
.map((label, i) => {
// Hide rows for metric slots that aren't in use, so a map configured with
// only one or two metrics doesn't show placeholder "Metric 3"/"Metric 4"
// rows. When metricConfigured isn't provided, default to showing all rows
// so nothing silently disappears.
if (metricConfigured && !metricConfigured[i]) return '';
const rawVal = store.metrics[`m${i + 1}`];
// Missing values render as 0 so every configured label is always visible
// in the popup. The 0 is also fed through computeMetricStatus, so any
// numeric threshold ('critical at >= 5') correctly evaluates 0 as normal.
const val = (rawVal === null || rawVal === undefined) ? 0 : rawVal;
// Edge / GRNT rows with no answer for this store: shown as "No data" in red (see RM_MISSING_IS_CRITICAL).
const rmMissingRed = (rawVal === null || rawVal === undefined) && Boolean(markerConfig.missingCritical && markerConfig.missingCritical[i]);
const display = rmMissingRed ? 'No data' : formatMetric(val);

// Per-row status: the row's icon takes the colour of a breached threshold.
const rowThreshold = (markerConfig.queryThresholds || [])[i];
const rowStatus = rmMissingRed ? 'critical' : computeMetricStatus(val, rowThreshold, markerConfig, i);
const dotColor = rowStatus === 'critical'
? (markerConfig.criticalColor || '#DA291C')
: rowStatus === 'warning'
? (markerConfig.warningColor || '#FFBC0D')
: '';

// Command Center hook: if the surrounding app has a list for this row, draw
// the row so it unfolds: a simple "value/expected" row, or a group of parts.
if (typeof window !== 'undefined' && typeof window.__rmRowDetail === 'function') {
let detail = null;
try { detail = window.__rmRowDetail(label, store.key); } catch (e) { detail = null; }
if (detail && Array.isArray(detail.parts)) return rmGroupRowHtml(label, dotColor, detail);
if (detail) return rmDetailRowHtml(label, dotColor, display, val, rawVal, detail);
}
// Command Center hook: a green icon on rows that have a rule and pass it.
const leadColor = rmLeadColor(dotColor, rowThreshold, rawVal);

// The segment card's row: its icon (in the row's status colour) and label on the left,
// the value on the right.
return `
<div class="rm-seg-row">
<span class="rm-seg-label">${rmIconSvg(rmRowIconPath(label), leadColor)}${label}</span>
<span class="rm-seg-value">${display}</span>
</div>`;
})
.join('');

const metricsSection = metricsRows
? `<div class="rm-scroll rm-seg-rows">${metricsRows}</div>`
: `<div class="rm-seg-rows" style="color:var(--rm-faint);font-size:12px;margin-bottom:10px;">No metrics configured.</div>`;

// The glass card of grafana-restraurant-custom-widgets (see .rm-card in the styles):
// header with the store and its status pill, the rows, then the Agent C&R button.
// Command Center hook: the tallest the card may be, so it always fits inside the map.
const rmMapHeight = (map.getDiv && map.getDiv().clientHeight) || 600;
const rmMapWidth = (map.getDiv && map.getDiv().clientWidth) || 800;
// On a small map (a laptop) the whole card is drawn smaller, so it doesn't cover the map.
// The card is drawn in proportion to the map: full size on a big map, smaller on a small
// one (never below 72%, so it stays readable).
const rmZoom = Math.round(Math.max(0.72, Math.min(1, rmMapWidth / 860, rmMapHeight / 700)) * 100) / 100;
const rmCardMax = Math.max(240, (rmMapHeight - 96) / rmZoom);
const rmStatusText = { normal: 'Normal', warning: 'Warning', critical: 'Critical', nodata: 'No data' }[status] || status;
const rmSub = [`Store ${rmEscapeHtml(store.key)}`, store.country ? rmEscapeHtml(store.country) : ''].filter(Boolean).join(' · ');
infoWindow.setContent(`
<div class="rm-card rm-seg" style="
${rmZoom < 1 ? `zoom:${rmZoom};` : ''}
display:flex;flex-direction:column;
max-height:${rmCardMax}px;
">
<div class="rm-seg-top">
<div class="rm-seg-head">
<button type="button" class="rm-card-link" title="Open this store's page" onclick="window.__rmOpenStorePage && window.__rmOpenStorePage('${String(store.key).replace(/'/g, "\\'")}')">${store.label}${rmIconSvg(RM_ICON_PATHS.open)}</button>
<button type="button" class="rm-card-close" aria-label="Close" onclick="window.__rmClosePopup && window.__rmClosePopup()">${rmIconSvg(RM_ICON_PATHS.close)}</button>
</div>
<div class="rm-seg-sub">${rmSub}</div>
<div class="rm-seg-row">
<span class="rm-seg-label">${rmIconSvg(RM_ICON_PATHS.status, statusColor)}Status</span>
<span class="rm-seg-value rm-pill-${status}" style="background:none;">${rmStatusText}</span>
</div>
</div>
${metricsSection}
<button
type="button"
id="rm-ai-footer-${store.key}"
class="rm-card-agent rm-seg-open"
onclick="window.__rmAgentRequest && window.__rmAgentRequest('${store.key}', '${(store.label || '').replace(/'/g, "\\'")}', '${String(store.country || '').replace(/'/g, "\\'")}')"
>
Invoke Agent C&amp;R to correlate changes/incidents &rsaquo;
</button>
</div>
`);
infoWindow.setOptions({ position: { lat: store.lat, lng: store.lng }, pixelOffset: new google.maps.Size(0, POPUP_OFFSET_Y) });
infoWindow.open({ map });
// Command Center hook: when a row unfolds and the card grows, keep it inside the map.
window.__rmFitPopup = () => {
try {
const card = document.querySelector('.gm-style-iw.gm-style-iw-c');
if (!card) return;
const mapBox = map.getDiv().getBoundingClientRect();
const cardBox = card.getBoundingClientRect();
const gap = cardBox.top - (mapBox.top + 8);
if (gap < 0) map.panBy(0, gap);
} catch (e) { /* cosmetic only */ }
};
};

// Command Center hook: hand the stores to the pins (store-pins.js), coloured by status.
rmPinDataRef.current = {};
const rmPins = stores.map((store) => {
const status = computeStoreStatus(store, markerConfig);
rmPinDataRef.current[String(store.key)] = { store, status };
return { key: store.key, lat: store.lat, lng: store.lng, status, store };
});
// The service layer has no pins (and no open pop-up); a pin filter leaves out the stores it doesn't accept.
const rmInLayer = rmService ? [] : stores.filter((store) => !rmLayer.pinFilter || rmLayer.pinFilter(store));
const rmInLayerKeys = new Set(rmInLayer.map((store) => String(store.key)));
if (rmService && window.__rmOpenStoreKey && typeof window.__rmClosePopup === 'function') window.__rmClosePopup();
if (rmStorePinsRef.current) {
rmStorePinsRef.current.setStores(rmPins.filter((pin) => rmInLayerKeys.has(String(pin.key)) && (rmStatusFilter === 'all' || pin.status === rmStatusFilter)), {
normal: getMarkerColor('normal', markerConfig),
warning: getMarkerColor('warning', markerConfig),
critical: getMarkerColor('critical', markerConfig),
nodata: getMarkerColor('nodata', markerConfig),
});
}

// Command Center hook: only zoom to fit the stores when the stores themselves
// change (first load, a store added or removed, or another layer or pin filter).
// A once-a-minute refresh of the numbers must not undo the user's own zooming and
// panning. The service layer places the map itself; coming back from it, the map
// zooms to the stores again. No stores in the layer: the app's content places it.
if (rmService) {
rmLastPlacesRef.current = '';
return;
}
const rmPlaces = `${rmLayer.pinFilterKey || ''}|${rmInLayer.map((store) => `${store.key}@${store.lat},${store.lng}`).join(';')}`;
if (rmPlaces === rmLastPlacesRef.current) return;
rmLastPlacesRef.current = rmPlaces;

if (rmInLayer.length > 1) {
const bounds = new google.maps.LatLngBounds();
rmInLayer.forEach((store) => bounds.extend({ lat: store.lat, lng: store.lng }));
map.fitBounds(bounds);
} else if (rmInLayer.length === 1) {
map.setCenter({ lat: rmInLayer[0].lat, lng: rmInLayer[0].lng });
map.setZoom(Math.max(initialZoom, 12));
}
}, 150);

// Cleanup: if deps change again before the timeout fires (e.g. another
// keystroke landed), cancel the pending redraw. This is what coalesces
// a typing burst into a single redraw after the user settles.
return () => clearTimeout(timeoutId);
// metricLabels intentionally excluded: labels only appear inside the popup
// (via closure over the click handler), never on the marker itself. Including
// labels here would cause 14k markers to redraw on every keystroke in a
// label field. Tradeoff: in the config builder, a freshly-typed label won't
// show in a popup until another change triggers a redraw. On a saved
// dashboard (where labels never change), this is invisible.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [storesSignature, mapsLoaded, markerConfig, initialZoom, rmStatusFilter, rmService, rmLayer.pinFilterKey]);

// Street View: when a store is selected and the user opens street view, look
// up the nearest panorama and show it. Requires the Maps JavaScript API's
// Street View service (a separate Google API entitlement from the base map).
useEffect(() => {
if (!mapsLoaded || !window.google || !mapInstanceRef.current) return;
if (!selectedStore || !streetViewOpen) return;
const google = window.google;
const map = mapInstanceRef.current;
if (!streetViewRef.current) streetViewRef.current = map.getStreetView();
const streetView = streetViewRef.current;
const svService = new google.maps.StreetViewService();
svService.getPanorama(
{
location: { lat: selectedStore.lat, lng: selectedStore.lng },
radius: 100,
source: google.maps.StreetViewSource.OUTDOOR,
},
(data, status) => {
if (status === 'OK' && data && data.location && data.location.latLng) {
streetView.setPosition(data.location.latLng);
streetView.setPov({ heading: 0, pitch: 0 });
streetView.setVisible(true);
setStreetViewAvailable(true);
} else {
streetView.setVisible(false);
setStreetViewAvailable(false);
}
}
);
}, [mapsLoaded, selectedStore, streetViewOpen]);

useEffect(() => {
if (!mapInstanceRef.current) return;
if (!streetViewOpen) mapInstanceRef.current.getStreetView().setVisible(false);
}, [streetViewOpen]);

// Command Center hook: tell the app what the pop-up of its open store (rmLayer.detailKey) says,
// each time that changes, so its store page can show it without the map.
const rmDetailSentRef = useRef('');
useEffect(() => {
if (!rmLayer.onDetail || !rmLayer.detailKey) return;
const store = (stores || []).find((item) => String(item.key) === String(rmLayer.detailKey));
const detail = store ? rmStoreDetail(store, computeStoreStatus(store, markerConfig), metricLabels, metricConfigured, markerConfig) : null;
const signature = `${rmLayer.detailKey}:${JSON.stringify(detail)}`;
if (signature === rmDetailSentRef.current) return;
rmDetailSentRef.current = signature;
rmLayer.onDetail(detail);
});

if (loadError) {
return (
<EmptyState
title="Couldn't load Google Maps"
message={`Error: ${loadError.message}. Double-check your Google Maps API key, billing, and restrictions.`}
/>
);
}

const statusCounts = { normal: 0, warning: 0, critical: 0, nodata: 0 };
const rmStoreList = [];
stores.forEach((store) => {
const s = computeStoreStatus(store, markerConfig);
statusCounts[s] = (statusCounts[s] || 0) + 1;
rmStoreList.push({ key: String(store.key), label: store.label, country: store.country, status: s });
});
// Command Center hook: share the store counts for the tiles above the map.
if (typeof window !== 'undefined' && typeof window.__rmOnStatusCounts === 'function') {
try { window.__rmOnStatusCounts(statusCounts); } catch (e) { /* never block the map */ }
}
// Command Center hook: share which stores are on the map, so the app's pop-up
// lists only ask about these stores.
if (typeof window !== 'undefined' && typeof window.__rmOnStoreKeys === 'function') {
try { window.__rmOnStoreKeys(stores.map((store) => store.key)); } catch (e) { /* never block the map */ }
}
// Command Center hook: share the stores themselves (number, name, status), for the app's
// store drop-down on the store page.
if (typeof window !== 'undefined' && typeof window.__rmOnStores === 'function') {
try { window.__rmOnStores(rmStoreList); } catch (e) { /* never block the map */ }
}

// Command Center hook: the boxes on the map are sized by the map (see rmSizeFor), so on a
// laptop they stay small and out of the way.
const rmSmall = rmSize.name !== 'large';
// Command Center hook: the status buttons, with grafana's status colours for the dots.
// No data only when there are some.
const rmStatusOptions = [
{ key: 'all', label: 'All' },
{ key: 'normal', label: 'Normal', color: rmMuiTheme.palette.success.main },
{ key: 'warning', label: 'Warning', color: rmMuiTheme.palette.warning.main },
{ key: 'critical', label: 'Critical', color: rmMuiTheme.palette.error.main },
...(statusCounts.nodata ? [{ key: 'nodata', label: 'No data', color: rmMuiTheme.palette.info.main }] : []),
];
// A button that went away (No data, once every store reports) falls back to All.
if (rmStatusFilter !== 'all' && !rmStatusOptions.some((tab) => tab.key === rmStatusFilter)) setRmStatusFilter('all');
const rmZoomBy = (step) => {
const map = mapInstanceRef.current;
if (map && typeof map.getZoom() === 'number') map.setZoom(map.getZoom() + step);
};
const rmToggleFullscreen = () => {
const box = rmBoxRef.current;
if (!box || !box.requestFullscreen) return;
const done = document.fullscreenElement ? document.exitFullscreen() : box.requestFullscreen();
if (done && done.catch) done.catch((e) => console.warn('Full screen is not available here.', e));
};

return (
<div ref={rmBoxRef} className={rmDark ? 'rm-theme rm-dark' : 'rm-theme'} style={{ width, height, position: 'relative' }}>
<div ref={mapRef} className="rm-container" style={{ width: '100%', height: '100%' }} />

{/* Command Center hook: zoom and full-screen buttons in the top-right corner, with the status
    buttons before the full-screen button and the zoom buttons under it. */}
{rmSlots && ReactDOM.createPortal(
<div className="rm-controls">
<div className="rm-controls-row">
{/* Command Center hook: on the service layer, the app's own buttons (rmLayer.controls) instead. */}
{rmService ? rmLayer.controls : (
// Command Center hook: grafana's tabs (components/PillTabs.js), as the app's other tabs.
<PillTabs
value={rmStatusFilter}
onChange={setRmStatusFilter}
label="Show stores by status"
items={rmStatusOptions.map((tab) => ({ key: tab.key, label: tab.label, icon: tab.color ? <StatusIcon color={tab.color} size={16} /> : undefined }))}
/>
)}
<button
type="button"
className="rm-glass"
style={{ width: rmSize.control, height: rmSize.control }}
onClick={rmToggleFullscreen}
title={rmFullscreen ? 'Exit full screen' : 'Full screen'}
aria-label={rmFullscreen ? 'Exit full screen' : 'Full screen'}
>
<svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: rmIcon, height: rmIcon }}><path d={rmFullscreen ? RM_ICON_FULLSCREEN_EXIT : RM_ICON_FULLSCREEN} /></svg>
</button>
</div>
<div className="rm-zoom">
<button type="button" className="rm-glass" style={{ width: rmSize.control, height: rmSize.control }} onClick={() => rmZoomBy(1)} title="Zoom in" aria-label="Zoom in">
<svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: rmIcon, height: rmIcon }}><path d={RM_ICON_ZOOM_IN} /></svg>
</button>
<button type="button" className="rm-glass" style={{ width: rmSize.control, height: rmSize.control }} onClick={() => rmZoomBy(-1)} title="Zoom out" aria-label="Zoom out">
<svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: rmIcon, height: rmIcon }}><path d={RM_ICON_ZOOM_OUT} /></svg>
</button>
</div>
</div>,
rmSlots.topRight,
)}

{/* Title (not on a smaller map, where it would cover the buttons) */}
{mapTitle && !rmSmall && !rmService && (
// Command Center hook: a glass card (.rm-glass-card) shaped as a pill.
<div className="rm-glass-card" style={{
position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 2, whiteSpace: 'nowrap',
borderRadius: 30,
height: rmSize.control, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
padding: '0 24px',
fontSize: 13,
fontWeight: 700,
letterSpacing: '0.06em',
textTransform: 'uppercase',
fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}}>
{mapTitle}
</div>
)}


{selectedStore && !rmService && !streetViewOpen && (
// Command Center hook: one small glass button instead of a box, so it doesn't cover the map.
<button
type="button"
className="rm-glass-card"
onClick={() => { setStreetViewOpen(true); setStreetViewAvailable(true); }}
title={`See ${selectedStore.label} at street level`}
style={{
all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
position: 'absolute', left: 10, bottom: 26, zIndex: 2,
display: 'inline-flex', alignItems: 'center', gap: 6,
height: rmSize.control, maxWidth: 'calc(100% - 140px)', padding: `0 ${rmSmall ? 9 : 12}px`,
borderRadius: rmSize.control / 2,
font: `600 ${rmSmall ? 11.5 : 13}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
whiteSpace: 'nowrap',
}}
>
<svg width={rmSmall ? 12 : 14} height={rmSmall ? 12 : 14} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}><circle cx="12" cy="4.5" r="2.5" fill="#f2a900" /><path d="M8.5 9.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V15h-1.5l-.5 7h-3l-.5-7H8.5z" fill="#f2a900" /></svg>
<span>Street view</span>
<span style={{ fontWeight: 500, color: 'var(--rm-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedStore.label}</span>
</button>
)}

{selectedStore && !rmService && streetViewOpen && (
<div
className="rm-glass-card"
style={{
position: 'absolute', left: 10, top: 10, zIndex: 2,
display: 'inline-flex', alignItems: 'center', gap: 8,
height: rmSize.control, boxSizing: 'border-box', padding: '0 4px 0 12px', maxWidth: 'calc(100% - 80px)',
borderRadius: rmSize.control / 2,
font: `600 ${rmSmall ? 11.5 : 13}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
whiteSpace: 'nowrap',
}}
>
<span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
{selectedStore.label}{!streetViewAvailable ? ' · no Street View here' : ''}
</span>
<button
type="button"
onClick={() => setStreetViewOpen(false)}
style={{ all: 'unset', cursor: 'pointer', height: rmSize.control - 8, padding: '0 10px', display: 'inline-flex', alignItems: 'center', borderRadius: (rmSize.control - 8) / 2, background: '#5f6368', color: '#fff', fontSize: rmSmall ? 11 : 12.5 }}
>
Back to map
</button>
</div>
)}

{agentOpen && agentStore && (
<div
className="rm-glass-card rm-card"
style={{
position: 'absolute', right: 12, top: 12, zIndex: 3,
width: 360, maxWidth: 'calc(100% - 24px)', maxHeight: 'calc(100% - 24px)',
display: 'flex', flexDirection: 'column',
overflow: 'hidden',
fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}}
>
<div style={{ height: 4, background: 'linear-gradient(90deg,#DA291C 0%,#FFBC0D 100%)' }} />
<div style={{
display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px',
background: 'transparent',
borderBottom: '1px solid var(--rm-line)',
}}>
<div>
<div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#DA291C' }}>AGENT C&amp;R</div>
{(() => {
const res = (agentResult && !agentResult.__plain) ? agentResult : null;
const storeId = (res && (res.storeNumber || res.store)) || (agentStore && agentStore.key) || '';
const health = (res && res.overallHealth) ? String(res.overallHealth) : '';
const healthColor = (() => {
const h = health.toLowerCase();
// Recognize severity words AND traffic-light color words (red/yellow/amber/green).
if (/degrad|critical|down|major|outage|red/.test(h)) return '#DA291C';
if (/warn|yellow|amber|partial|elevated/.test(h)) return '#E8820C';
if (/healthy|operational|normal|good|green|stable|ok/.test(h)) return '#2f7d32';
return 'var(--rm-muted)';
})();
if (storeId) {
return (
<div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rm-text)' }}>Store {storeId}</div>
);
}
// No store (system / app-failure response): show overall health instead.
return (
<div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rm-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
{health && (
<span style={{ width: 11, height: 11, borderRadius: '50%', background: healthColor, boxShadow: `0 0 0 3px ${healthColor}2e`, flex: '0 0 auto' }} />
)}
{health ? `System \u2014 ${health}` : 'System'}
</div>
);
})()}
<div style={{ fontSize: 11.5, color: 'var(--rm-muted)', marginTop: 2 }}>Correlated by Enterprise Change &amp; Release</div>
</div>
<button
type="button"
onClick={() => { setAgentOpen(false); setAgentLoading(false); }}
aria-label="Close"
style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--rm-text)', lineHeight: 1, padding: 4 }}
>
&times;
</button>
</div>
<div style={{ padding: '12px 14px 16px', overflowY: 'auto', background: 'transparent' }}>
{agentLoading && (
<div style={{ fontSize: 12, color: 'var(--rm-muted)', marginBottom: 10 }}>
Correlating today&rsquo;s changes and incidents for this store&hellip;
</div>
)}
{agentLoading && (
<div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--rm-text)', fontSize: 13, padding: '8px 0' }}>
<span
style={{
width: 16, height: 16, borderRadius: '50%',
border: '2px solid #FFBC0D', borderTopColor: '#DA291C',
display: 'inline-block', animation: 'rmSpin 0.8s linear infinite',
}}
/>
Asking Agent C&amp;R&hellip;
</div>
)}
{!agentLoading && agentError && (
<div style={{ fontSize: 13, color: 'var(--rm-bad-text)', background: 'rgba(218,41,28,0.12)', border: '1px solid rgba(218,41,28,0.35)', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
{agentError}
</div>
)}
{!agentLoading && !agentError && agentResult && agentResult.__plain && (
<div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--rm-text)', whiteSpace: 'pre-wrap' }}>
{agentResult.__plain}
</div>
)}
{!agentLoading && !agentError && agentResult && !agentResult.__plain && (() => {
const data = agentResult;
// possiblyRelated changed from string IDs to objects ({type, entity, detail,
// timestamps}). Normalize: keep the raw items for the banner, and build a set
// of any string-like identifiers we can still cross-match against rows.
const relatedRaw = Array.isArray(data.possiblyRelated) ? data.possiblyRelated : [];
const related = relatedRaw.map((r) => (typeof r === 'string' ? { detail: r } : (r || {})));
const relatedSet = new Set();
relatedRaw.forEach((r) => {
if (typeof r === 'string') relatedSet.add(r.toUpperCase());
else if (r && r.entity) relatedSet.add(String(r.entity).toUpperCase());
});
// Incidents: flow renamed `incidents` -> `ServiceNowincidents`. Accept both.
const incidents = Array.isArray(data.ServiceNowincidents)
? data.ServiceNowincidents
: (Array.isArray(data.incidents) ? data.incidents : []);
const changes = Array.isArray(data.ServiceNowchanges)
? data.ServiceNowchanges
: (Array.isArray(data.changes) ? data.changes : []);
const alerts = Array.isArray(data.monitoringAlerts) ? data.monitoringAlerts : (Array.isArray(data.alerts) ? data.alerts : []);
const deployments = Array.isArray(data.deployments) ? data.deployments : [];
const vendors = Array.isArray(data.externalVendorHealth) ? data.externalVendorHealth : [];
const recommendedActions = Array.isArray(data.recommendedActions) ? data.recommendedActions : [];
const agentHealth = (data.overallHealth || '').toString();
// Command Center hook: the pop-up is the source of truth for the restaurant's status.
const overallHealth = (agentStore && agentStore.status) ? agentStore.status : agentHealth;
const healthDiffers = Boolean(agentStore && agentStore.status && agentHealth && agentHealth.trim().toLowerCase() !== agentStore.status.toLowerCase());
// JIRA DGI is US-ONLY. Gate the section on the store's country so a non-US
// market (Germany, France, etc.) never shows it — showing "All clear" there
// would wrongly imply DGI applies. Country comes from the selected store
// (captured from the base query); fall back to a country/market field in the
// response if present. Works for coordinate-only app-failure points too, since
// those still carry a country even without a store number.
// JIRA DGI is US-relevant. Gating philosophy (per product decision): show the
// section BY DEFAULT — including the "All clear" empty state — and hide it ONLY
// when we have positive evidence the context is a non-US market. This avoids the
// failure mode where a real US store wrongly hid DGI because country wasn't
// flowing through. Sources of truth, in order:
//   1. The selected store's country (from the base query) if present.
//   2. The response's own country/market field if present.
//   3. Otherwise, infer from the markets named on deployments/incidents.
const usValues = ['US', 'USA', 'UNITED STATES'];
const nonUsValues = ['DE', 'FR', 'AU', 'NZ', 'AU/NZ', 'CA', 'UK', 'GB', 'JP', 'CN', 'GERMANY', 'FRANCE', 'CANADA'];
const explicitCountry = String((agentStore && agentStore.country) || data.country || data.market || '').trim().toUpperCase();
// Collect any market labels the response mentions (deployments + incidents).
const responseMarkets = [];
(Array.isArray(data.deployments) ? data.deployments : []).forEach((d) => { if (d && d.market) responseMarkets.push(String(d.market).toUpperCase()); });
(Array.isArray(data.ServiceNowincidents) ? data.ServiceNowincidents : []).forEach((x) => { if (x && x.market) responseMarkets.push(String(x.market).toUpperCase()); });
const mentionsUs = explicitCountry && usValues.includes(explicitCountry)
? true
: responseMarkets.includes('US');
// Hide DGI only when we are confident the context is non-US: i.e. the explicit
// country is a known non-US value, OR the response names markets and none are US.
const explicitlyNonUs = (explicitCountry && nonUsValues.includes(explicitCountry))
|| (!mentionsUs && responseMarkets.length > 0 && !responseMarkets.includes('US'));
const showJiraDgi = !explicitlyNonUs; // show by default, including all-clear
// Accept both the new "JIRA" field name and the legacy "JIRAdgi" name, so the
// agent can be renamed (e.g. to cover multiple JIRA project keys, not just DGI)
// without breaking this section during the transition. Prefer "JIRA".
const jiraDgi = Array.isArray(data.JIRA)
? data.JIRA
: (Array.isArray(data.JIRAdgi) ? data.JIRAdgi : []);
const explanations = Array.isArray(data.explanations) ? data.explanations : [];

// Boost/NEXT status. Preferred source is a dedicated field if the flow adds
// one (data.boostNext / data['Boost/Next']); otherwise we parse the summary
// prose. Rule: "Enabled" ONLY if the text affirmatively says the store is
// classified as Boost or NEXT. Anything else — unknown, indeterminate, not
// confirmed, no store provided — is "Not Enabled".
const boostNextEnabled = (() => {
const field = (data.Next || data.boostNext || data['Boost/Next'] || data.storeClassification || '').toString().toLowerCase();
if (field) {
if (/(^|[^a-z])(enabled|boost|next)([^a-z]|$)/.test(field)
&& !/not|indeterm|unconfirm|unknown|no specific|could not/.test(field)) return true;
return false;
}
const text = (data.summary || '').toLowerCase();
if (!text) return false;
// Negative signals win.
if (/(not|could not|cannot|couldn't|unable to|indetermin|unconfirm|not confirmed|unknown|no.{0,6}classif)/.test(text)
&& /(boost|next|classif)/.test(text)) return false;
// Affirmative: "classified as Boost", "is a NEXT store", "found ... Boost"
if (/(classified as|is a|identified as|confirmed as|found as).{0,20}(boost|next)/.test(text)) return true;
return false;
})();

const swatchColors = { incident: '#DA291C', change: '#C98A00', jira: '#0052CC', alert: '#1CE783', deployment: '#E8820C', vendor: '#7A5AF8' };

const renderRow = (item, kind, idx) => {
const it = item || {};
const isDeploy = kind === 'deployment';
const isJira = kind === 'jira';
const isIncident = kind === 'incident';
// ID/key: incidents use `number`; JIRA uses `key`; deployments have no id.
const id = (it.id || it.key || it.number) ? String(it.id || it.key || it.number) : '';
// Deployments may send entity as `entity` or `entity.name`; version as
// `version` or `release`.
const depEntity = it.entity || it['entity.name'];
const depVersion = it.version || it.release;
// Title resolution. Known field names are tried first. If the agent renames a
// field (its response shape has drifted several times), fall back to the first
// sensible text value on the object instead of showing "(untitled)" — metadata
// keys like status/market/priority are skipped so we pick a real headline.
const resolveTitle = () => {
const known = it.title || it.short_description || it.shortDescription
|| it.summary || it.message || it.name || it.incident || it.condition
|| it.alert || it.description;
if (known) return String(known);
const skip = ['meta', 'market', 'country', 'status', 'state', 'priority', 'id', 'key',
'number', 'timestamp', 'openedAt', 'opened_at', 'relevance', 'correlation',
'impact', 'version', 'release', 'entity.name', 'subCategory', 'closeCode',
'account', 'host', 'module', 'level'];
const vals = Object.keys(it)
.filter((k) => skip.indexOf(k) === -1)
.map((k) => it[k])
.filter((v) => typeof v === 'string' && v.trim().length > 2);
return vals.length ? String(vals[0]) : '(untitled)';
};
const title = isDeploy
? [depEntity, depVersion].filter(Boolean).join(' \u00b7 ')
: resolveTitle();
const sub = isDeploy ? (it.changelog || it.description) : null;
// JIRA DGI tickets carry reporter, technology impact, and a description.
const jiraReporter = isJira ? (it.reporter || it.reporterName) : null;
const jiraTechImpact = isJira ? (it.technologyImpact || it.technology_impact || it.techImpact) : null;
const jiraDescription = isJira ? it.description : null;
// ServiceNow incident detail line: store · market · state · time.
let incidentMeta = null;
if (isIncident) {
const bits = [];
if (it.store) bits.push(`Store ${it.store}`);
if (it.market) bits.push(it.market);
const state = it.state;
if (state) bits.push(state);
const openedAt = it.opened_at || it.openedAt;
if (openedAt) bits.push(String(openedAt).replace(/^\d{4}-/, '').slice(0, 11));
const sub = it.subCategory || it.sub_category;
if (sub) bits.push(sub);
incidentMeta = bits.join(' \u00b7 ');
}
// Generic meta fallback: when an item has no `meta` string (e.g. monitoring
// alerts that arrive as {account, host, module, level, message, timestamp}),
// assemble useful triage context from the technical fields instead of showing
// nothing under the title.
const metaLine = it.meta || (() => {
const bits = [];
if (it.host) bits.push(it.host);
if (it.module) bits.push(it.module);
if (it.level) bits.push(it.level);
if (it.timestamp) bits.push(String(it.timestamp).replace('T', ' ').replace('Z', ' UTC'));
return bits.join(' \u00b7 ');
})();
const priority = isIncident ? (it.priority != null ? String(it.priority) : '') : '';
// Related matching: by id, title, or (for deployments) entity.
const candidates = [id, it.title, it.entity, it['entity.name'], it.key, it.summary, it.short_description, it.shortDescription]
.filter(Boolean).map((v) => String(v).toUpperCase());
const isRelated = candidates.some((v) => relatedSet.has(v));
return (
<div
key={`${kind}-${idx}`}
style={{
display: 'flex', gap: 10, padding: '8px 2px',
borderBottom: '1px solid var(--rm-line)',
background: isRelated ? 'rgba(255,188,13,0.12)' : 'transparent',
borderRadius: isRelated ? 6 : 0,
}}
>
{isDeploy && (
<span title="Deployment" style={{ flex: '0 0 auto', fontSize: 13, lineHeight: 1.3, paddingTop: 1 }}>&#9888;</span>
)}
{!isDeploy && id && (
<span style={{
fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
fontSize: 11, color: 'var(--rm-text)', flex: '0 0 auto', paddingTop: 1,
}}>
{/* Long IDs (e.g. INC18795649) show as a short tail to save width */}
{id.length > 8 ? `\u2026${id.slice(-3)}` : id}
</span>
)}
<div style={{ minWidth: 0 }}>
<div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--rm-text)', lineHeight: 1.3, marginBottom: 2 }}>
{title}
{priority && (
<span style={{
marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
verticalAlign: 'middle',
color: (priority === '1' || priority === '2') ? 'var(--rm-bad-text)' : 'var(--rm-muted)',
background: (priority === '1' || priority === '2') ? 'rgba(218,41,28,0.18)' : 'var(--rm-surface)',
}}>P{priority}</span>
)}
{isRelated && (
<span style={{
marginLeft: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
color: 'var(--rm-warn-text)', background: 'rgba(224,168,0,0.2)', padding: '1px 5px', borderRadius: 999,
verticalAlign: 'middle',
}}>RELATED</span>
)}
</div>
{incidentMeta && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4 }}>{incidentMeta}</div>
)}
{sub && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4, marginBottom: 2 }}>{sub}</div>
)}
{isJira && jiraReporter && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4 }}>
<span style={{ fontWeight: 700, color: 'var(--rm-text)' }}>Reporter:</span> {jiraReporter}
</div>
)}
{isJira && jiraTechImpact && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4 }}>
<span style={{ fontWeight: 700, color: 'var(--rm-text)' }}>Tech impact:</span> {jiraTechImpact}
</div>
)}
{isJira && jiraDescription && (
<div style={{ fontSize: 11.5, color: 'var(--rm-muted)', lineHeight: 1.45, marginTop: 3 }}>{jiraDescription}</div>
)}
{metaLine && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4 }}>{metaLine}</div>
)}
</div>
</div>
);
};

const renderSection = (label, items, kind) => {
const list = Array.isArray(items) ? items : [];
const empty = list.length === 0;
return (
<div key={kind} style={{
background: 'var(--rm-surface)', border: '1px solid var(--rm-line)', borderRadius: 13,
boxShadow: 'none',
marginBottom: 11, overflow: 'hidden',
}}>
<div style={{
display: 'flex', alignItems: 'center', gap: 9,
padding: '10px 13px',
background: 'transparent',
borderBottom: '1px solid var(--rm-line)',
}}>
<span style={{ width: 4, height: 16, borderRadius: 2, background: swatchColors[kind], flex: '0 0 auto' }} />
<h3 style={{
margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.07em',
textTransform: 'uppercase', color: 'var(--rm-text)',
}}>{label}</h3>
<span style={{
marginLeft: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
fontSize: 11, color: 'var(--rm-muted)', background: 'var(--rm-surface)',
border: '1px solid var(--rm-line)', padding: '1px 8px', borderRadius: 999,
}}>{list.length}</span>
</div>
<div style={{ padding: '9px 13px 11px' }}>
{empty ? (
<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2f7d32', fontSize: 12, fontWeight: 600 }}>
<span style={{
width: 16, height: 16, borderRadius: '50%', background: '#2f7d32',
display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
}}>
<svg viewBox="0 0 10 10" width="10" height="10" fill="none" aria-hidden="true">
<path d="M1 5l2.5 2.5L9 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
</svg>
</span>
All clear &mdash; none today
</div>
) : (
list.map((it, i) => renderRow(it, kind, i))
)}
</div>
</div>
);
};

return (
<div>
{related.length > 0 && (
<div style={{
margin: '0 0 11px', borderRadius: 13,
background: 'linear-gradient(160deg,#2E2B24,#1E1C17)', color: '#fff',
border: '1px solid #3A362D', borderLeft: '4px solid #FFC72C',
boxShadow: '0 6px 16px rgba(39,37,31,.28)',
padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
}}>
<span style={{
flex: '0 0 auto', width: 30, height: 30, borderRadius: 8,
background: 'linear-gradient(135deg,#DA291C,#FFBC0D)',
display: 'flex', alignItems: 'center', justifyContent: 'center',
fontWeight: 900, color: '#fff', fontSize: 15,
}}>!</span>
<div style={{ minWidth: 0 }}>
<div style={{ fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#FFBC0D', fontWeight: 800 }}>
Possibly related
</div>
{related.map((r, i) => {
const ts = Array.isArray(r.timestamps) ? r.timestamps : [];
const tsText = ts.map((t) => {
const d = new Date(t);
return Number.isNaN(d.getTime()) ? t : `${d.toISOString().slice(5, 16).replace('T', ' ')} UTC`;
}).join(', ');
return (
<div key={i} style={{ marginTop: i === 0 ? 4 : 8 }}>
{r.entity && (
<span style={{
fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
background: 'rgba(255,255,255,.14)', padding: '2px 6px',
borderRadius: 5, fontSize: 11.5, wordBreak: 'break-word', maxWidth: '100%',
display: 'inline-block',
}}>{r.entity}</span>
)}
{r.detail && (
<div style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: r.entity ? 3 : 0 }}>{r.detail}</div>
)}
{tsText && (
<div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{tsText}</div>
)}
</div>
);
})}
</div>
</div>
)}
<div style={{
display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 11px',
background: 'var(--rm-surface)', border: '1px solid var(--rm-line)', borderRadius: 11,
padding: '9px 13px', boxShadow: 'none',
}}>
<span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--rm-muted)' }}>
NEXT
</span>
<span style={{
marginLeft: 'auto',
fontSize: 11, fontWeight: 700, padding: '3px 11px', borderRadius: 999,
color: boostNextEnabled ? 'var(--rm-good-text)' : 'var(--rm-muted)',
background: boostNextEnabled ? 'rgba(67,160,71,0.18)' : 'var(--rm-surface)',
border: `1px solid ${boostNextEnabled ? 'rgba(67,160,71,0.35)' : 'var(--rm-line)'}`,
}}>
{boostNextEnabled ? 'Enabled' : 'Not Enabled'}
</span>
</div>
{overallHealth && (() => {
// Classify the health string into a severity so both severity words
// (Degraded, Critical, Healthy) AND traffic-light color words
// (Red, Yellow/Amber, Green) render with the right pill color.
const h = overallHealth.toLowerCase();
let sev = 'neutral';
if (/degrad|critical|down|major|outage|sev|red/.test(h)) sev = 'critical';
else if (/warn|yellow|amber|partial|elevated|caution/.test(h)) sev = 'warning';
else if (/healthy|operational|normal|good|green|stable|\bok\b/.test(h)) sev = 'healthy';
const palette = {
critical: { bg: 'rgba(218,41,28,0.12)', border: 'rgba(218,41,28,0.35)', pillText: 'var(--rm-bad-text)', pillBg: 'rgba(218,41,28,0.2)', rail: '#DA291C' },
warning: { bg: 'rgba(232,130,12,0.12)', border: 'rgba(232,130,12,0.35)', pillText: 'var(--rm-warn-text)', pillBg: 'rgba(232,130,12,0.2)', rail: '#E8820C' },
healthy: { bg: 'rgba(67,160,71,0.12)', border: 'rgba(67,160,71,0.35)', pillText: 'var(--rm-good-text)', pillBg: 'rgba(67,160,71,0.2)', rail: '#2f7d32' },
neutral: { bg: 'var(--rm-surface)', border: 'var(--rm-line)', pillText: 'var(--rm-muted)', pillBg: 'var(--rm-surface)', rail: '#B9B2A6' },
}[sev];
return (
<>
<div style={{
margin: '0 0 11px', borderRadius: 13, padding: '11px 14px',
display: 'flex', alignItems: 'center', gap: 10,
background: palette.bg, border: `1px solid ${palette.border}`,
borderLeft: `4px solid ${palette.rail}`,
boxShadow: 'none',
}}>
<span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--rm-muted)' }}>
Overall health
</span>
<span style={{
marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase',
padding: '4px 11px', borderRadius: 999, textAlign: 'right', lineHeight: 1.3,
color: palette.pillText, background: palette.pillBg,
}}>
{overallHealth}
</span>
</div>
{healthDiffers && (
<div style={{ margin: '-6px 2px 11px', fontSize: 11, color: 'var(--rm-muted)' }}>
Shown as on the map. The agent's own reading was &ldquo;{agentHealth}&rdquo;.
</div>
)}
</>
);
})()}
{data.summary && (
<div style={{
margin: '0 0 11px', borderRadius: 13, background: 'var(--rm-surface)',
boxShadow: 'none',
border: '1px solid var(--rm-line)', padding: '11px 13px',
fontSize: 12.5, lineHeight: 1.5, color: 'var(--rm-muted)',
}}>
{data.summary}
</div>
)}
{renderSection('ServiceNow Incidents', incidents, 'incident')}
{renderSection('ServiceNow Changes', changes, 'change')}
{showJiraDgi && renderSection('JIRA', jiraDgi, 'jira')}
{renderSection('Deployments', deployments, 'deployment')}
{vendors.length > 0 && (
<div>
<div style={{
display: 'flex', alignItems: 'center', gap: 8,
margin: '14px 0 6px', paddingBottom: 6, borderBottom: '2px solid var(--rm-line)',
}}>
<span style={{ width: 10, height: 10, borderRadius: 3, background: swatchColors.vendor }} />
<h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--rm-text)' }}>
Delivery Vendors
</h3>
<span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: 'var(--rm-muted)' }}>
{vendors.length}
</span>
</div>
{vendors.map((v, i) => {
const vv = v || {};
const name = vv.vendor || vv.name || vv.vendorName || vv.service || 'Vendor';
const status = vv.status || '';
const ok = /operational|all systems|healthy|up|no issues/i.test(status);
// incidents may be a count (number) or a list (array). Normalize to a count.
let incidentsN = null;
if (Array.isArray(vv.incidents)) incidentsN = vv.incidents.length;
else if (typeof vv.incidents === 'number') incidentsN = vv.incidents;
return (
<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--rm-line)' }}>
<span style={{ width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto', background: ok ? '#2f7d32' : '#E8820C' }} />
<div style={{ minWidth: 0 }}>
<div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--rm-text)', lineHeight: 1.3 }}>{name}</div>
{incidentsN != null && (
<div style={{ fontSize: 11, color: 'var(--rm-muted)', lineHeight: 1.4 }}>{incidentsN} incident{incidentsN === 1 ? '' : 's'}</div>
)}
</div>
<span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: ok ? '#2f7d32' : '#E8820C' }}>
{ok ? 'Operational' : (status || 'Issue')}
</span>
</div>
);
})}
</div>
)}
{renderSection('Monitoring alerts', alerts, 'alert')}
{recommendedActions.length > 0 && (
<div style={{ marginTop: 12, borderRadius: 12, background: 'rgba(67,160,71,0.12)', border: '1px solid rgba(67,160,71,0.35)', padding: '11px 13px' }}>
<div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--rm-good-text)', marginBottom: 6 }}>
Recommended actions
</div>
<ul style={{ margin: 0, paddingLeft: 18 }}>
{recommendedActions.map((a, i) => (
<li key={i} style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--rm-text)', marginBottom: 5 }}>{a}</li>
))}
</ul>
</div>
)}
{explanations.length > 0 && (
<details style={{ marginTop: 14 }}>
<summary style={{
cursor: 'pointer', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
textTransform: 'uppercase', color: 'var(--rm-text)', listStyle: 'revert',
padding: '6px 0', borderTop: '1px solid var(--rm-line)',
}}>
Why &mdash; reasoning
</summary>
<ul style={{ margin: '6px 0 2px', paddingLeft: 18 }}>
{explanations.map((ex, i) => (
<li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--rm-muted)', marginBottom: 6 }}>{ex}</li>
))}
</ul>
</details>
)}
</div>
);
})()}
</div>
</div>
)}

{/* Command Center hook: the app's own layer on the map (rmLayer.content), e.g. the segments. */}
{mapsLoaded && rmLayer.content && (
<RmMapContext.Provider value={mapInstanceRef.current}>{rmLayer.content}</RmMapContext.Provider>
)}

</div>
);
}


// The number of metric rows a store's pop-up can have (m1 … m5).
const MAX_METRIC_SLOTS = 5;
const RM_POLL_MS = 60000;

// Command Center hook: the stores and their numbers (data/index.js, fetchMapStores), every
// minute, paused while the page is hidden. Keeps the last answer if a refresh fails, so the
// map never blanks out.
function useMapStores() {
const [state, setState] = useState({ stores: null, loading: true, error: null });
useEffect(() => {
let cancelled = false;
const load = () => fetchMapStores()
.then((stores) => { if (!cancelled) setState({ stores, loading: false, error: null }); })
.catch((error) => { if (!cancelled) setState((before) => ({ ...before, loading: false, error })); });
const repeat = repeatWhileShowing(load, RM_POLL_MS);
return () => {
cancelled = true;
repeat.stop();
};
}, []);
return state;
}

// The size of the box the map fills, kept up to date as it changes.
function AutoSizer({ children }) {
const ref = useRef(null);
const [size, setSize] = useState({ width: 0, height: 0 });
useEffect(() => {
const el = ref.current;
if (!el) return undefined;
const measure = () => setSize((before) => (before.width === el.clientWidth && before.height === el.clientHeight ? before : { width: el.clientWidth, height: el.clientHeight }));
measure();
if (typeof ResizeObserver === 'undefined') {
window.addEventListener('resize', measure);
return () => window.removeEventListener('resize', measure);
}
const observer = new ResizeObserver(measure);
observer.observe(el);
return () => observer.disconnect();
}, []);
return (
<div ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }}>
{size.width > 0 && size.height > 0 ? children(size) : null}
</div>
);
}


function StoreMap({
width,
height,
mapId,
initialLat,
initialLng,
initialZoom,
metricLabels,
markerConfig,
mapTitle,
metricConfigured,
}) {
const { stores, loading, error } = useMapStores();
if (!stores) {
return loading
? <EmptyState title="Loading stores…" message="Getting the stores and their numbers." />
: <EmptyState title="Couldn't load the stores" message={(error && error.message) || 'Retrying every minute.'} />;
}
if (!stores.length) {
return <EmptyState title="No mappable stores" message="No stores with a location came back." />;
}
return (
<GoogleMapCanvas
width={width}
height={height}
stores={stores}
mapId={mapId || 'DEMO_MAP_ID'}
initialLat={initialLat}
initialLng={initialLng}
initialZoom={initialZoom}
metricLabels={metricLabels}
markerConfig={markerConfig}
mapTitle={mapTitle}
metricConfigured={metricConfigured}
/>
);
}


/*
 * The store map. Its props are the map's settings (data/index.js MAP_SETTINGS): what each
 * pop-up row (query2 … query6, the store's m1 … m5) is called and the thresholds that colour
 * a pin, the pin colours, and where the map starts. Plus the Command Center's hooks: rmDark
 * and rmLayer.
 */
function RestaurantMapVisualization(props) {
const {
mapId,
mapTitle,
query2Label,
query2WarningThreshold,
query2CriticalThreshold,
query2Direction,
query2CriticalMatch,
query3Label,
query3WarningThreshold,
query3CriticalThreshold,
query3Direction,
query3CriticalMatch,
query4Label,
query4WarningThreshold,
query4CriticalThreshold,
query4Direction,
query4CriticalMatch,
query5Label,
query5WarningThreshold,
query5CriticalThreshold,
query5Direction,
query5CriticalMatch,
query6Label,
query6WarningThreshold,
query6CriticalThreshold,
query6Direction,
query6CriticalMatch,
normalColor,
warningColor,
criticalColor,
noDataColor,
zeroBehavior,
noDataBehavior,
initialLat,
initialLng,
initialZoom,
aiAgentUrl,
agentFlowUrl,
} = props;

// Make the configured agent URLs available to the popup footer's global click
// handler (window.__rmAskAI) and to the agent panel, both of which run outside
// React's normal data flow because the popup is a static HTML string.
if (typeof window !== 'undefined') {
window.__rmAgentUrl = (aiAgentUrl || '').trim();
window.__rmAgentFlowUrl = (agentFlowUrl || '').trim();
}

// useMemo so these objects keep stable identity across re-renders; otherwise the
// marker-update effect would redraw every pin on each render.
const explicitLabels = [query2Label, query3Label, query4Label, query5Label, query6Label];
const metricLabels = useMemo(() => [
query2Label || 'Metric 1',
query3Label || 'Metric 2',
query4Label || 'Metric 3',
query5Label || 'Metric 4',
query6Label || 'Metric 5',
], [query2Label, query3Label, query4Label, query5Label, query6Label]);

const markerConfig = useMemo(() => ({
normalColor: normalColor || '#34a853',
warningColor: warningColor || '#fbbc04',
criticalColor: criticalColor || '#d93025',
noDataColor: noDataColor || '#4285f4',
zeroBehavior: zeroBehavior || 'healthy',
noDataBehavior: noDataBehavior || 'nodata',
queryThresholds: [
{ warning: toThreshold(query2WarningThreshold), critical: toThreshold(query2CriticalThreshold), direction: query2Direction || 'above', criticalMatch: query2CriticalMatch || '' },
{ warning: toThreshold(query3WarningThreshold), critical: toThreshold(query3CriticalThreshold), direction: query3Direction || 'above', criticalMatch: query3CriticalMatch || '' },
{ warning: toThreshold(query4WarningThreshold), critical: toThreshold(query4CriticalThreshold), direction: query4Direction || 'above', criticalMatch: query4CriticalMatch || '' },
{ warning: toThreshold(query5WarningThreshold), critical: toThreshold(query5CriticalThreshold), direction: query5Direction || 'above', criticalMatch: query5CriticalMatch || '' },
{ warning: toThreshold(query6WarningThreshold), critical: toThreshold(query6CriticalThreshold), direction: query6Direction || 'above', criticalMatch: query6CriticalMatch || '' },
],
}), [
normalColor, warningColor, criticalColor,
noDataColor, zeroBehavior, noDataBehavior,
query2WarningThreshold, query2CriticalThreshold, query2Direction, query2CriticalMatch,
query3WarningThreshold, query3CriticalThreshold, query3Direction, query3CriticalMatch,
query4WarningThreshold, query4CriticalThreshold, query4Direction, query4CriticalMatch,
query5WarningThreshold, query5CriticalThreshold, query5Direction, query5CriticalMatch,
query6WarningThreshold, query6CriticalThreshold, query6Direction, query6CriticalMatch,
]);

const startLat = Number.isFinite(Number(initialLat)) ? Number(initialLat) : 39.8283;
const startLng = Number.isFinite(Number(initialLng)) ? Number(initialLng) : -98.5795;
const startZoom = Number.isFinite(Number(initialZoom)) ? Number(initialZoom) : 4;

// A row is in use when it has a label: unused rows ("Metric 4") are left out of the pop-up.
const metricConfigured = [0, 1, 2, 3, 4].slice(0, MAX_METRIC_SLOTS).map((i) => Boolean(explicitLabels[i] && String(explicitLabels[i]).trim() !== ''));

// Which rows turn red when a store has no number for them (edge / GRNT, by label).
const rmMissingKey = metricConfigured.map((used, i) => (used && RM_MISSING_IS_CRITICAL.test(String(metricLabels[i] || '')) ? '1' : '0')).join('');
const markerConfigFull = useMemo(() => ({ ...markerConfig, missingCritical: rmMissingKey.split('').map((flag) => flag === '1') }), [markerConfig, rmMissingKey]);

return (
<RmLayerContext.Provider value={props.rmLayer || RM_DEFAULT_LAYER}>
<RmThemeContext.Provider value={Boolean(props.rmDark)}>
<AutoSizer>
{({ width, height }) => (
<StoreMap
width={width}
height={height}
mapId={mapId || 'DEMO_MAP_ID'}
initialLat={startLat}
initialLng={startLng}
initialZoom={startZoom}
metricLabels={metricLabels}
markerConfig={markerConfigFull}
mapTitle={mapTitle}
metricConfigured={metricConfigured}
/>
)}
</AutoSizer>
</RmThemeContext.Provider>
</RmLayerContext.Provider>
);
}


export default RestaurantMapVisualization;
