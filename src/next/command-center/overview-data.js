/*
 * overview-data.js: how the overview cards write their numbers.
 * No React code in here, so it is easy to read and test.
 */

// 57.6 -> "0:58", 168 -> "2:48".
export function minutesSeconds(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '–';
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// 100 -> "100%", 99.9812 -> "99.98%".
export function percentText(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  if (value >= 100) return '100%';
  return `${(Math.floor(value * 100) / 100).toFixed(2)}%`;
}

// The change from before to now, as a fraction (0.115 = 11.5% more). Null when it can't be worked out.
export function change(now, before) {
  if (!Number.isFinite(now) || !Number.isFinite(before) || before === 0) return null;
  return (now - before) / before;
}
