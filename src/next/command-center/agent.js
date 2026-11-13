/*
 * agent.js: sends a question to Agent Q through your Power Automate flow and
 * tidies up the reply. It sends the same fields the map's "Ask AI" sends.
 * With no flow address set, an example answer comes back instead (data/agent-mock.js).
 */
import { mockAgentQ } from './data/agent-mock';

// What the app knows about every store together, used when no store is selected.
function fleetLines(context) {
  const lines = [];
  const c = context.storeCounts;
  if (c) lines.push(`Stores by status on the map: ${c.critical || 0} critical, ${c.warning || 0} warning, ${c.normal || 0} normal, ${c.nodata || 0} with no data.`);
  if (context.incidentsOpened !== null && context.incidentsOpened !== undefined) lines.push(`Incidents opened in the last 24 hours, all stores: ${context.incidentsOpened}.`);
  if (context.casesOpened !== null && context.casesOpened !== undefined) lines.push(`Cases opened in the last 24 hours, all stores: ${context.casesOpened}.`);
  if (context.orders && context.orders.length) {
    lines.push(`Orders, all NEXT stores: ${context.orders.map((o) => `${o.title} ${o.total} ${o.window || ''}`.trim()).join(', ')}.`);
  }
  return lines;
}

// What the app knows about the selected store.
function storeLines(context) {
  const lines = [];
  if (context.impacted.length) lines.push(`Impacted areas: ${context.impacted.join(', ')}.`);
  if (context.degraded.length) lines.push(`Degraded areas: ${context.degraded.join(', ')}.`);
  if (context.causes.length) lines.push(`Failing checks: ${context.causes.join(', ')}.`);
  if (!context.impacted.length && !context.degraded.length && !context.loading) lines.push('No areas are impacted or degraded.');
  if (context.carsInLane !== null && context.carsInLane !== undefined) lines.push(`Cars in the drive-thru lane: ${context.carsInLane}.`);
  if (context.orders && context.orders.length) {
    lines.push(`Orders: ${context.orders.map((o) => `${o.title} ${o.total} ${o.window || ''}`.trim()).join(', ')}.`);
    lines.push(context.orders.some((o) => o.recent) ? 'The store has taken orders in the last 30 minutes.' : 'The store has taken no orders in the last 30 minutes.');
  }
  if (context.incidents.length) lines.push(`Incidents opened in the last 24 hours: ${context.incidents.slice(0, 5).join(' / ')}.`);
  if (context.cases.length) lines.push(`Cases opened in the last 24 hours: ${context.cases.slice(0, 5).join(' / ')}.`);
  return lines;
}

/*
 * The question as typed, followed by what the app is showing. The second part
 * is offered as background, so Agent Q is free to answer about anything.
 * With a store selected it describes that store; with none, all stores.
 */
export function buildQuestion(question, context) {
  const lines = context.storeNumber ? storeLines(context) : fleetLines(context);
  if (lines.length === 0) return question;
  const about = context.storeNumber ? `store ${context.storeNumber} is selected and shows` : 'no store is selected. Across all stores it shows';
  return `${question}\n\nBackground from the Command Center, in case it helps (${about}):\n${lines.join('\n')}`;
}

// The figures sent alongside the question, in the same shape the map uses.
export function buildMetrics(context) {
  if (!context.storeNumber) {
    const c = context.storeCounts || {};
    return {
      'Stores critical': c.critical || 0,
      'Stores warning': c.warning || 0,
      'Incidents opened today': context.incidentsOpened || 0,
      'Cases opened today': context.casesOpened || 0,
    };
  }
  return {
    'Impacted areas': context.impacted.length,
    'Degraded areas': context.degraded.length,
    'Recent incidents': context.incidents.length,
    'Recent cases': context.cases.length,
  };
}

function tryParse(raw) {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch (e) {
    return null;
  }
}

const itemText = (item) => {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item);
  const id = item.id || item.number || item.key || '';
  const text = item.title || item.summary || item.short_description || item.shortDescription || item.message || item.name || item.description || '';
  return [id, text].filter(Boolean).join(': ') || JSON.stringify(item);
};

const SECTIONS = [
  ['incidents', 'Incidents'],
  ['changes', 'Changes'],
  ['deployments', 'Deployments'],
  ['jira', 'JIRA'],
];

/*
 * Agent Q may answer in plain words or as structured data (often wrapped in a
 * ```json block). Returns { health, text, sections: [{ title, items }] }.
 */
export function parseReply(raw) {
  const text = String(raw || '').trim();
  if (!text) return { health: '', text: 'Agent Q returned an empty answer.', sections: [] };
  let data = tryParse(text) || tryParse(text.replace(/```(?:json)?/gi, '').trim());
  if (!data) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) data = tryParse(text.slice(first, last + 1));
  }
  if (!data || Array.isArray(data)) return { health: '', text, sections: [] };

  const words = data.summary || data.answer || data.response || data.text || data.message || '';
  const sections = [];
  SECTIONS.forEach(([key, title]) => {
    const list = data[key];
    if (Array.isArray(list) && list.length) sections.push({ title, items: list.map(itemText).filter(Boolean) });
  });
  if (!words && sections.length === 0) return { health: '', text, sections: [] }; // unknown shape: show it as it came
  return { health: data.overallHealth ? String(data.overallHealth) : '', text: String(words), sections };
}

// Sends the question. Gives back the tidied reply, or throws an Error with a plain message.
export async function askAgent(flowUrl, store, question, context, timeoutMs = 180000) {
  if (!flowUrl) return mockAgentQ(store, question, context);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        // With no store selected these two are sent as empty text, so the flow always gets the same fields.
        storeNumber: store ? store.key : '',
        storeLabel: store ? store.label || store.key : '',
        country: (store && store.country) || (typeof window !== 'undefined' && window.__rmDefaultCountry) || null,
        metrics: buildMetrics(context),
        question: buildQuestion(question, context),
      }),
    });
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('Agent Q did not answer in time. Check the flow run in Power Automate.');
    throw new Error('Could not reach the Agent Q flow. Check the flow address and your network.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`The Agent Q flow returned an error (HTTP ${response.status}).`);
  return parseReply(await response.text());
}
