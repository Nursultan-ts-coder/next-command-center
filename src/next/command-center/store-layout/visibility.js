import { useEffect, useState } from 'react';

/*
 * Pause while nobody can see the page.
 *
 * The browser marks the page hidden when its tab is in the background or the
 * window is minimised. While hidden, nothing is asked of the data sources. When the page
 * shows again, anything that missed a refresh while hidden asks once straight
 * away, then carries on at its usual pace. The last numbers stay on screen the
 * whole time, so nothing blanks out.
 */

export function pageHidden() {
  return typeof document !== 'undefined' && document.hidden === true;
}

/*
 * Runs load() now and then every ms milliseconds on the clock, but only while the page is showing
 * and isActive() says yes (for example: "is this tab the one that is open?").
 * A refresh that falls while paused is skipped and remembered; the moment the
 * page shows again (or poke() is called after isActive() turns true), load() runs once.
 * Returns { stop, poke }. Call stop() in the effect's clean-up.
 */
export function repeatWhileShowing(load, ms, isActive) {
  const active = () => !pageHidden() && (!isActive || isActive());
  let missed = false;
  const tick = () => {
    if (!active()) {
      missed = true;
      return;
    }
    missed = false;
    load();
  };
  const poke = () => {
    if (missed && active()) {
      missed = false;
      load();
    }
  };
  tick();
  // Shared clock: after the first run, refreshes fall on the clock (every whole minute
  // for a one-minute refresh), so every part of the page refreshes at the same moment
  // and the data layer is asked once per refresh.
  let timer = null;
  const firstWait = ms - (Date.now() % ms);
  const starter = setTimeout(() => {
    tick();
    timer = setInterval(tick, ms);
  }, firstWait);
  const onVisibility = () => poke();
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  return {
    poke,
    stop() {
      clearTimeout(starter);
      clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
