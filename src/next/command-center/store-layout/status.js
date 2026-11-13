/*
 * status.js: turns each check's number into a colour for each area.
 * No React code in here, so it is easy to read and test.
 */

// A settings box left empty arrives as '', null or undefined. Returns null for
// those, otherwise the number.
export function toNumber(input) {
  if (input === '' || input === null || input === undefined) return null;
  const number = Number(input);
  return Number.isFinite(number) ? number : null;
}

/*
 * Compares a check's number with the check's thresholds.
 * Returns 'outage', 'degraded', 'ok', or null when there is no number.
 *   direction 'above': high numbers are bad (number >= threshold)
 *   direction 'below': low numbers are bad  (number <= threshold)
 */
export function evaluate(value, check) {
  if (value === null || value === undefined) return null;
  const hit = (threshold) => {
    if (threshold === null) return false;
    return check.direction === 'below' ? value <= threshold : value >= threshold;
  };
  if (hit(check.criticalAt)) return 'outage';
  if (hit(check.warningAt)) return 'degraded';
  return 'ok';
}

/*
 * Edge nodes and GRNT (gateways, switches, access points, DHCP): when the data source
 * answers but has nothing for this store, that counts as an outage (red), not
 * "no data" (grey). Matched on the check's name: "Edge Node Down", "Primary/Secondary
 * Firewall Gateway", "Switch Down", "AP Down" and "DHCP Service Failure" all count.
 */
export const MISSING_IS_OUTAGE = /edge|grnt|gateway|switch|\bap\b|access point|dhcp/i;

/*
 * The level for one check's answer: { value, failed }.
 *   failed  the data source itself went wrong (an error or it took too long): stays null
 *           (grey), because we don't know whether anything is down.
 *   value   null with no failure: nothing came back for this store.
 */
export function levelFor(answer, check) {
  if (!answer || answer.failed) return null;
  if ((answer.value === null || answer.value === undefined) && MISSING_IS_OUTAGE.test(String(check.name || ''))) return 'outage';
  return evaluate(answer.value, check);
}

const simplify = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/*
 * Turns the "Impacted areas" text ("KVS, Front counter, Kiosks") into area ids.
 * Upper/lower case, spaces and punctuation don't matter, and the start of a
 * name is enough if only one area starts that way. "All" means every area.
 * Returns { ids: [...], unknown: [...] }.
 */
export function parseAreas(text, areas) {
  const ids = [];
  const unknown = [];
  String(text || '')
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const wanted = simplify(part);
      if (wanted === 'all') {
        areas.forEach((area) => ids.push(area.id));
        return;
      }
      const names = (area) => [area.id, area.short, area.name].concat(area.also || []).map(simplify);
      let matches = areas.filter((area) => names(area).includes(wanted));
      if (matches.length === 0) matches = areas.filter((area) => names(area).some((name) => name.startsWith(wanted)));
      if (matches.length === 1) ids.push(matches[0].id);
      else unknown.push(part);
    });
  return { ids: ids.filter((id, index) => ids.indexOf(id) === index), unknown };
}

/*
 * Tidies the store view's checks (config.js STORE_CHECKS).
 * Returns { checks, problems }. Each check comes out as:
 *   { id, name, direction, criticalAt, warningAt, impacts }
 * where impacts is { areaId: message }.
 */
export function readChecks(rows, areas) {
  const checks = [];
  const problems = [];
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    if (!row) return;
    const name = String(row.name || '').trim() || `Check ${index + 1}`;
    const { ids, unknown } = parseAreas(row.areas, areas);
    if (ids.length === 0 && unknown.length === 0) problems.push(`"${name}" has no impacted areas`);
    unknown.forEach((part) => problems.push(`"${name}": no area called "${part}"`));

    const criticalAt = toNumber(row.criticalAt);
    const warningAt = toNumber(row.warningAt);
    const impacts = {};
    ids.forEach((id) => {
      impacts[id] = String(row.message || '').trim();
    });
    checks.push({
      id: row.id || `check-${index}`,
      name,
      direction: row.direction === 'below' ? 'below' : 'above',
      // With no thresholds, 1 or more is red: the "1 = open, 0 = closed" rule.
      criticalAt: criticalAt === null && warningAt === null ? 1 : criticalAt,
      warningAt,
      impacts,
    });
  });
  return { checks, problems };
}

/*
 * Works out the status of every area.
 *   answers  { checkId: { level, value } }, or null before the first answer.
 *            level is 'outage', 'degraded', 'ok' or null (no number came back).
 * Returns [{ area, status, open, waiting, linked }]
 *   status   'outage', 'degraded', 'healthy', 'unknown' or 'unmonitored'
 *   open     breached checks for this area: [{ check, message, level, value }]
 *   waiting  checks with no answer
 *   linked   every check that lists this area
 */
export function computeStatuses(areas, checks, answers) {
  return areas.map((area) => {
    const linked = checks.filter((check) => check.impacts && area.id in check.impacts);
    if (linked.length === 0) return { area, status: 'unmonitored', open: [], waiting: [], linked };

    const answer = (check) => (answers && answers[check.id]) || { level: null, value: null };
    const waiting = linked.filter((check) => answer(check).level === null);
    const open = linked
      .filter((check) => answer(check).level === 'outage' || answer(check).level === 'degraded')
      .map((check) => ({ check, message: check.impacts[area.id], ...answer(check) }));
    open.sort((a, b) => Number(a.level === 'degraded') - Number(b.level === 'degraded'));

    let status = 'healthy';
    if (open.length > 0) status = open.some((item) => item.level === 'outage') ? 'outage' : 'degraded';
    else if (waiting.length > 0) status = 'unknown';
    return { area, status, open, waiting, linked };
  });
}

export function countByStatus(results) {
  const counts = { outage: 0, degraded: 0, healthy: 0, unknown: 0, unmonitored: 0 };
  results.forEach((result) => {
    counts[result.status] += 1;
  });
  return counts;
}
