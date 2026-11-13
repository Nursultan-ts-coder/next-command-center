/*
 * records.js: how the incident and case lists write their times.
 * The records themselves come from the data layer (data/index.js, fetchRecords).
 */

// "3:42 PM" for today, "Oct 5, 3:42 PM" for earlier days.
export function formatSeen(ms, now) {
  if (!ms) return '';
  const when = new Date(ms);
  const today = new Date(now);
  const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (when.toDateString() === today.toDateString()) return time;
  return `${when.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}
