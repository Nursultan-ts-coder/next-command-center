/*
 * menu-data.js: turns today's orders (data/index.js, fetchMenuOrders:
 * [{ id, time, items: [{ qty, text, size, name }] }]) into a menu board.
 * No React code in here, so it is easy to read and test.
 */

// Which menu line an item belongs to, or a line of its own under "Other".
export function placeItem(name, menuItems) {
  const hit = (menuItems || []).find((line) => {
    try { return new RegExp(line.match, 'i').test(name); } catch (error) { return false; }
  });
  return hit ? { key: hit.name, name: hit.name, section: hit.section } : { key: `other:${name.toLowerCase()}`, name, section: 'Other' };
}

// Breakfast until breakfastEnds ("10:30"), in the viewer's own time.
export function isBreakfast(now, breakfastEnds) {
  const [h, m] = String(breakfastEnds || '10:30').split(':').map(Number);
  const at = new Date(now);
  return at.getHours() * 60 + at.getMinutes() < (h || 0) * 60 + (m || 0);
}

/*
 * Everything the board shows:
 *   sections  [{ name, lines: [{ key, name, count, details, latest }] }]  busiest first, 0s greyed
 *   top       the 3 busiest lines
 *   totals    { orders, items, lastTime, biggest }
 *   mix       [{ section, share }]
 *   slots     orders per 15 minutes since the first order: [{ start, count }]
 */
export function buildBoard(orders, { menuItems, sections, now, breakfastEnds }) {
  const breakfast = isBreakfast(now, breakfastEnds);
  const lines = {};
  const add = (key, base) => { if (!lines[key]) lines[key] = { ...base, count: 0, sizes: {}, latest: 0 }; return lines[key]; };

  (menuItems || []).forEach((line) => {
    const showToday = line.when === 'all' || (line.when === 'breakfast' ? breakfast : !breakfast);
    if (showToday) add(line.name, { key: line.name, name: line.name, section: line.section });
  });

  let items = 0;
  let biggest = 0;
  orders.forEach((order) => {
    let inOrder = 0;
    order.items.forEach((item) => {
      const place = placeItem(item.name, menuItems);
      const line = add(place.key, place);
      line.count += item.qty;
      if (item.size) line.sizes[item.size] = (line.sizes[item.size] || 0) + item.qty;
      if ((order.time || 0) > line.latest) line.latest = order.time || 0;
      items += item.qty;
      inOrder += item.qty;
    });
    biggest = Math.max(biggest, inOrder);
  });

  const all = Object.values(lines).map((line) => ({
    ...line,
    details: Object.keys(line.sizes).sort().map((size) => `${size} ×${line.sizes[size]}`).join(' · '),
  }));
  const bySection = (sections || []).map((name) => ({
    name,
    lines: all.filter((line) => line.section === name).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  })).filter((section) => section.lines.some((line) => line.count > 0) || (section.name !== 'Other' && section.lines.length));

  const top = all.filter((line) => line.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  const sectionTotals = {};
  all.forEach((line) => { if (line.count) sectionTotals[line.section] = (sectionTotals[line.section] || 0) + line.count; });
  const mix = Object.keys(sectionTotals).map((section) => ({ section, share: sectionTotals[section] / (items || 1) })).sort((a, b) => b.share - a.share);

  const times = orders.map((order) => order.time).filter(Boolean);
  const slots = [];
  if (times.length) {
    const quarter = 15 * 60 * 1000;
    const first = Math.floor(Math.min(...times) / quarter) * quarter;
    const last = Math.floor(Math.max(now, ...times) / quarter) * quarter;
    for (let at = Math.max(first, last - quarter * 31); at <= last; at += quarter) slots.push({ start: at, count: 0 });
    times.forEach((time) => {
      const slot = slots.find((s) => time >= s.start && time < s.start + quarter);
      if (slot) slot.count += 1;
    });
  }

  return {
    breakfast,
    sections: bySection,
    top,
    mix,
    slots,
    totals: { orders: orders.length, items, lastTime: times.length ? Math.max(...times) : null, biggest },
  };
}
