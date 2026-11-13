/*
 * details.js: the lists that unfold under a row in the map's pop-up, for
 * example the names of the edge nodes behind "Edge Node Availability 3/3".
 * The lists themselves come from the data layer (data/index.js, fetchRowDetail).
 * No React code in here, so it is easy to read and test.
 */

// True when a pop-up row's label is the one a detail is meant for. Capital letters and extra spaces don't matter.
export function sameRow(label, wanted) {
  const tidy = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return Boolean(tidy(wanted)) && tidy(label).indexOf(tidy(wanted)) !== -1;
}

/*
 * Compares what is reporting now with what has been seen over a longer time.
 *   now   [{ name, note }] reporting now
 *   seen  [{ name, note }] seen over the longer time, or null if unknown
 * Returns { outOf, missing } where missing are names seen before but not now.
 */
export function compareWithSeen(now, seen) {
  if (!Array.isArray(seen)) return { outOf: 0, missing: [] };
  const nowNames = now.map((item) => item.name);
  const missing = seen.filter((item) => !nowNames.includes(item.name));
  return { outOf: now.length + missing.length, missing };
}

/*
 * Every list in ROW_DETAILS as one flat list, so they can all be loaded the same way.
 * Each entry is { id, part, row, name, outOf, outOfSince, things, window }.
 *   id    '0' for a simple row, '1.0' for the first part of a group row
 *   part  the list's id in the data layer
 */
export function listDetailQueries(details) {
  const list = [];
  (details || []).forEach((detail, i) => {
    if (Array.isArray(detail.parts)) {
      detail.parts.forEach((part, j) => list.push({ ...part, part: part.id, id: `${i}.${j}`, row: detail.showAs || detail.row }));
    } else {
      list.push({ ...detail, part: detail.id, id: `${i}`, name: detail.showAs || detail.row, row: detail.showAs || detail.row });
    }
  });
  return list;
}
