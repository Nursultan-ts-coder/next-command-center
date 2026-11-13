/*
 * use-store-status.js: one store's checks and cars, for the 3D store view and the drive-thru
 * panel beside it. Its checks (store-layout/config.js STORE_CHECKS) are refreshed every minute
 * and turn each area healthy, degraded, impacted, or no data. Also tells the app what the store
 * looks like (onStatus), which Agent Q is given as background.
 */
import { useEffect } from 'react';

import { AREAS, STORE_CHECKS, WORDING } from '../store-layout/config';
import { useAnswers, useLaneCars } from '../store-layout/index';
import { computeStatuses, countByStatus, readChecks } from '../store-layout/status';

const { checks: CHECKS, problems: PROBLEMS } = readChecks(STORE_CHECKS, AREAS);

export default function useStoreStatus({ storeId, onStatus }) {
  const { answers, failed, updatedAt } = useAnswers(CHECKS, storeId);
  const lane = useLaneCars(storeId);
  const results = computeStatuses(AREAS, CHECKS, answers);
  const counts = countByStatus(results);

  const names = (status) => results.filter((result) => result.status === status).map((result) => result.area.name);
  const report = JSON.stringify({
    loading: answers === null,
    impacted: names('outage'),
    degraded: names('degraded'),
    noData: names('unknown'),
    healthy: counts.healthy,
    causes: results.reduce((list, result) => result.open.reduce((l, item) => (l.includes(item.check.name) ? l : l.concat(item.check.name)), list), []),
    carsInLane: lane.queue === null ? null : lane.queue.length,
  });
  useEffect(() => {
    if (onStatus) onStatus(JSON.parse(report));
  }, [report]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    results,
    counts,
    lane,
    failed,
    loading: answers === null,
    updatedAt,
    problems: lane.failed ? PROBLEMS.concat(WORDING.carsFailed) : PROBLEMS,
  };
}
