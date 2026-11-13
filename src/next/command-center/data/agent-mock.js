/*
 * agent-mock.js: example answers from the two agents, used while no flow address is set
 * (app-config.js AGENT_FLOW_URL): Agent Q (the chat panel) and Agent C&R (a store's pop-up on
 * the map, "correlate changes and incidents"). They are built from the mock data, so they
 * agree with what the page shows.
 */
import { findMockStore } from './mock-stores';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Agent Q's reply: { health, text, sections: [{ title, items }] } (agent.js parseReply's shape). */
export async function mockAgentQ(store, question, context) {
  await wait(900 + Math.random() * 900);
  const sections = [];
  if (context.incidents && context.incidents.length) sections.push({ title: 'Incidents', items: context.incidents.slice(0, 5) });
  if (context.cases && context.cases.length) sections.push({ title: 'Cases', items: context.cases.slice(0, 5) });

  if (!store) {
    const c = context.storeCounts || {};
    const bad = (c.critical || 0) + (c.warning || 0);
    return {
      health: c.critical ? 'Critical' : bad ? 'Warning' : 'Normal',
      text: `Across the NEXT stores, ${c.critical || 0} are critical and ${c.warning || 0} need attention. ${context.incidentsOpened || 0} incidents and ${context.casesOpened || 0} cases were opened in the last 24 hours. Start with the critical stores on the map: open one for its store view and network tab. (Example answer: no Agent Q flow is connected yet.)`,
      sections,
    };
  }

  const impacted = context.impacted || [];
  const causes = context.causes || [];
  const lines = [];
  if (impacted.length) lines.push(`${impacted.length} area${impacted.length === 1 ? ' is' : 's are'} impacted (${impacted.slice(0, 4).join(', ')}), caused by ${causes.slice(0, 3).join(', ') || 'failing checks'}.`);
  else if ((context.degraded || []).length) lines.push(`Nothing is down; ${context.degraded.join(', ')} ${context.degraded.length === 1 ? 'is' : 'are'} degraded.`);
  else lines.push('All monitored areas are healthy.');
  if (context.carsInLane !== null && context.carsInLane !== undefined) lines.push(`${context.carsInLane} car${context.carsInLane === 1 ? ' is' : 's are'} in the drive-thru lane.`);
  if (impacted.length) lines.push('Check first: the edge nodes and gateways on the Network tab, then the open incidents below.');
  return {
    health: impacted.length ? 'Critical' : (context.degraded || []).length ? 'Warning' : 'Normal',
    text: `Store ${store.key}: ${lines.join(' ')} (Example answer: no Agent Q flow is connected yet.)`,
    sections,
  };
}

/** Agent C&R's answer for a store's pop-up, in the shape the flow returns. */
export async function mockCorrelation(agentStore) {
  await wait(1200 + Math.random() * 800);
  const store = findMockStore(agentStore && agentStore.key) || { key: agentStore.key, incidents: 0, changes: 0, edgeUp: 3, gatewaysUp: 2 };
  const today = new Date().toISOString().slice(0, 10);
  const incidents = Array.from({ length: store.incidents || 0 }, (_, i) => ({
    number: `INC${String(1300100 + Number(store.key) * 3 + i).padStart(7, '0')}`,
    title: i === 0 && store.edgeUp < 3 ? 'Edge node not responding: kitchen screens not receiving orders'
      : i === 0 && store.gatewaysUp === 0 ? 'Store network down: both firewall gateways offline'
        : 'POS register cannot reach payment gateway',
    store: store.key,
    market: 'US',
    state: i === 0 ? 'In Progress' : 'New',
    priority: i === 0 ? 2 : 3,
    opened_at: `${today} 0${7 + i}:1${i}`,
  }));
  const changes = Array.from({ length: store.changes || 0 }, (_, i) => ({
    number: `CHG${String(410200 + Number(store.key) + i).padStart(7, '0')}`,
    title: i === 0 ? 'Edge cluster firmware update (rolling)' : 'Kiosk app release 4.18.2',
    state: 'Implemented',
    meta: `Store ${store.key} · implemented ${today}`,
  }));
  const status = agentStore.status || 'Normal';
  return {
    overallHealth: status,
    summary: incidents.length || changes.length
      ? `Store ${store.key} has ${incidents.length} open incident${incidents.length === 1 ? '' : 's'} and ${changes.length} change${changes.length === 1 ? '' : 's'} implemented today.${changes.length && incidents.length ? ' The first incident was opened shortly after the first change; they are likely related.' : ''} The store is classified as NEXT. (Example answer: no Agent C&R flow is connected yet.)`
      : `No incidents were raised and no changes were implemented today for store ${store.key}. The store is classified as NEXT. (Example answer: no Agent C&R flow is connected yet.)`,
    possiblyRelated: incidents.length && changes.length ? [incidents[0].number, changes[0].number] : [],
    ServiceNowincidents: incidents,
    ServiceNowchanges: changes,
    monitoringAlerts: store.edgeUp < 3 ? [{ title: 'Edge Node Down for Next Stores - P1', host: `us${String(store.key).padStart(5, '0')}cls01`, level: 'critical' }] : [],
    deployments: [],
    externalVendorHealth: [
      { vendor: 'DoorDash', status: 'Operational' },
      { vendor: 'Uber Eats', status: 'Operational' },
      { vendor: 'Grubhub', status: store.key === '6721' ? 'Degraded performance' : 'Operational' },
    ],
    JIRA: [],
    recommendedActions: status === 'Normal' ? [] : ['Check the edge nodes and gateways on the Network tab.', 'Confirm the open incidents are assigned to the store support team.'],
  };
}
