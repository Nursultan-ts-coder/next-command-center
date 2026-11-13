/*
 * cars.js: turns car arrival and departure times into positions in the lane.
 * The cars come from the data layer (data/index.js, fetchCars): [{ key, arrival, departure, inLane }].
 * No React code in here, so it is easy to read and test.
 *
 * What the data can and cannot tell us:
 *   - We KNOW when each car arrived and when it left.
 *   - We do NOT know where a car is in between. So a car's position is an
 *     estimate: it moves up the lane at the pace of a typical visit, never
 *     passes the car in front, and waits at the present window until its
 *     departure shows up in the data.
 */

// ---------------------------------------------------------------------------
// The lane, as points on the picture from the entrance (bottom) to the exit
// (top). x and y are percentages of the picture, like the dots in config.js.
// ---------------------------------------------------------------------------
export const LANE = [
  { x: 71.55, y: 108.0 }, // below the bottom edge, fully out of sight
  { x: 73.24, y: 92.77 },
  { x: 73.8, y: 83.01 },
  { x: 76.27, y: 65.92 },
  { x: 77.57, y: 53.71 },
  { x: 79.49, y: 38.09 },
  { x: 81.05, y: 21.48 },
  { x: 80.66, y: 16.6 },
  { x: 79.43, y: 13.92 }, // behind the EXIT sign: cars have faded out by here
];

// The picture is 3 wide by 2 tall, so 1% across is longer than 1% down.
const ACROSS = 3;
const DOWN = 2;

const SEGMENTS = LANE.slice(1).map((point, i) => {
  const from = LANE[i];
  return { from, to: point, length: Math.hypot((point.x - from.x) * ACROSS, (point.y - from.y) * DOWN) };
});
const LANE_LENGTH = SEGMENTS.reduce((sum, segment) => sum + segment.length, 0);

/*
 * Where is a car that has covered fraction t of the lane (0 = entrance, 1 = exit)?
 * Returns { x, y, heading } with heading in degrees: 0 = straight up the
 * picture, positive = leaning right.
 */
export function pointAt(t) {
  let left = Math.max(0, Math.min(1, t)) * LANE_LENGTH;
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const segment = SEGMENTS[i];
    if (left <= segment.length || i === SEGMENTS.length - 1) {
      const f = segment.length === 0 ? 0 : Math.min(1, left / segment.length);
      const dx = (segment.to.x - segment.from.x) * ACROSS;
      const dy = (segment.to.y - segment.from.y) * DOWN;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * f,
        y: segment.from.y + (segment.to.y - segment.from.y) * f,
        heading: (Math.atan2(dx, -dy) * 180) / Math.PI,
      };
    }
    left -= segment.length;
  }
  return { x: LANE[0].x, y: LANE[0].y, heading: 0 };
}

// The fraction of the lane at which the path reaches a given height (y %).
export function fractionAtY(y) {
  let covered = 0;
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const { from, to, length } = SEGMENTS[i];
    if ((y <= from.y && y >= to.y) || (y >= from.y && y <= to.y)) {
      const f = from.y === to.y ? 0 : (y - from.y) / (to.y - from.y);
      return (covered + length * f) / LANE_LENGTH;
    }
    covered += length;
  }
  return y > LANE[0].y ? 0 : 1;
}

// Landmarks along the lane, as fractions of its length.
export const AT_DETECTION = fractionAtY(73.6); // step 1, where a car is first detected
export const AT_PRESENT = fractionAtY(29.0); // step 6, where the food is handed over
export const AT_FADE_START = fractionAtY(21.5); // cars start fading as they turn to the exit
export const CAR_GAP = 27 / LANE_LENGTH; // room one car takes in the queue, as a fraction of the lane

// How long a car is at a given height, in % of the picture's width.
// Cars lower in the picture are closer to the viewer, so they are drawn bigger.
export function carLengthAt(y) {
  const f = (y - 21.4) / (84.4 - 21.4);
  return 5.86 + (8.85 - 5.86) * Math.max(-0.3, Math.min(1.3, f));
}

const FALLBACK_VISIT_MS = 4 * 60 * 1000;

// The typical length of a visit, from cars that have already left (the median).
export function typicalVisitMs(cars) {
  const visits = cars
    .filter((car) => !car.inLane && car.departure !== null)
    .map((car) => car.departure - car.arrival)
    .filter((ms) => ms >= 20 * 1000 && ms <= 30 * 60 * 1000)
    .sort((a, b) => a - b);
  if (visits.length === 0) return FALLBACK_VISIT_MS;
  const middle = Math.floor(visits.length / 2);
  return visits.length % 2 ? visits[middle] : (visits[middle - 1] + visits[middle]) / 2;
}

/*
 * How long a car may wait with no departure before we stop believing it.
 * Four typical visits, but never less than 3 minutes or more than 15.
 * Example: when a typical visit is 41 seconds, a car is given 3 minutes.
 */
export function longestBelievableWaitMs(visitMs) {
  return Math.min(15 * 60 * 1000, Math.max(4 * visitMs, 3 * 60 * 1000));
}

/*
 * The cars that should be drawn right now, front of the queue first.
 * A car that "arrived" long ago and never "left" has probably lost its
 * departure event. It drives off instead of sitting at the window.
 */
export function carsInLane(cars, now, visitMs) {
  const tooOld = longestBelievableWaitMs(visitMs);
  return cars.filter((car) => car.inLane && now - car.arrival >= 0 && now - car.arrival < tooOld);
}

/*
 * Where each waiting car wants to be: { key: fraction of the lane }.
 * `queue` is front-first. A car advances with time, stops at the present
 * window, and keeps one car's distance from the car ahead.
 */
export function laneTargets(queue, now, visitMs) {
  const targets = {};
  let ahead = null;
  queue.forEach((car) => {
    const progress = Math.max(0, Math.min(1, (now - car.arrival) / visitMs));
    let t = AT_DETECTION + (AT_PRESENT - AT_DETECTION) * progress;
    if (ahead !== null) t = Math.min(t, ahead - CAR_GAP);
    targets[car.key] = t;
    ahead = t;
  });
  return targets;
}

// "3m 12s", for the corner strip.
export function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}
