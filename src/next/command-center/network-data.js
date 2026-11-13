/*
 * network-data.js: turns the Network tab's data (data/index.js, fetchNetwork) into rows to draw.
 * No React code in here, so it is easy to read and test.
 */

/*
 * Strips for devices reporting over time: data is { buckets, bySeries: { device: [value per slot] } }.
 * Returns { buckets, devices: [{ name, slots: [true/false], upNow }] }, names sorted.
 * A slot is up when the device sent anything in it. "Now" is the last two slots,
 * because the newest slot is still filling up.
 */
export function readStrips(data) {
  const devices = Object.keys(data.bySeries).sort().map((name) => {
    const values = data.bySeries[name].map((value) => (value !== null && Number.isFinite(value) ? value : 0));
    const slots = values.map((value) => value > 0);
    const n = slots.length;
    // The last two 5-minute slots = about the last 10 minutes (same as "SINCE 10 minutes ago").
    const recent = values.slice(-2).reduce((sum, value) => sum + value, 0);
    return { name, slots, values, recent, upNow: n ? slots[n - 1] || (n > 1 && slots[n - 2]) : false };
  });
  return { buckets: data.buckets, devices };
}

// DHCP pools ([{ name, used, total }]) with how full each is: [{ name, used, total, percent }], fullest first.
export function readPools(pools) {
  return (Array.isArray(pools) ? pools : [])
    .filter((pool) => pool && pool.name)
    .map((pool) => ({ ...pool, percent: pool.total > 0 ? (pool.used / pool.total) * 100 : 0 }))
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
}

// Wi-Fi ({ buckets, tx: { ap: [%] }, rx: { ap: [%] } }): { buckets, aps: [{ name, tx: [..], rx: [..], txNow, rxNow, txPeak }] }
export function readRetries(wifi) {
  const tx = { buckets: wifi.buckets, bySeries: wifi.tx || {} };
  const rx = { buckets: wifi.buckets, bySeries: wifi.rx || {} };
  const last = (values) => {
    for (let i = values.length - 1; i >= 0; i -= 1) if (values[i] !== null && Number.isFinite(values[i])) return values[i];
    return null;
  };
  const aps = Object.keys(tx.bySeries).sort().map((name) => {
    const txValues = tx.bySeries[name];
    const rxValues = rx.bySeries[name] || [];
    const real = txValues.filter((v) => v !== null && Number.isFinite(v));
    return { name, tx: txValues, rx: rxValues, txNow: last(txValues), rxNow: last(rxValues), txPeak: real.length ? Math.max(...real) : null };
  });
  return { buckets: tx.buckets, aps };
}

// 'ok', 'warn' or 'bad' for a number against two limits.
export function level(value, warnAt, badAt) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'none';
  if (value >= badAt) return 'bad';
  if (value >= warnAt) return 'warn';
  return 'ok';
}
