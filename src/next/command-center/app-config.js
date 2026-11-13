/*
 * app-config.js: the app's settings and wording.
 */

// How often the incident and case lists and counts are refreshed.
export const RECORDS_REFRESH_MS = 60000;

// Agent Q: the address of your Power Automate flow. Leave empty to get example answers
// (data/agent-mock.js) instead.
export const AGENT_FLOW_URL = '';

// The country sent to Agent Q when a store has none. Every NEXT store is in the US today.
export const DEFAULT_COUNTRY = 'US';

// Questions offered as one-click buttons in the Agent Q panel.
export const SUGGESTED_QUESTIONS = [
  'Any incidents or changes today?',
  'Why are areas impacted?',
  'What should we check first?',
];

// Text shown in the app. Change the right-hand side.
export const TEXT = {
  title: 'Restaurant NEXT Command Center',
  mapTitle: 'Stores',
  mapHint: 'Click a store to open its view',
  mapHintOpen: 'Click another store to switch',
  backToMap: 'Back to map',
  incidents: 'Incidents',
  cases: 'Cases',
  noIncidents: 'No incidents for this store in the',
  noCases: 'No cases for this store in the',
  agentTitle: 'Agent Q',
  agentIntro: 'Pick a store on the map, then ask about it. I am sent the store, what is impacted and its recent incidents and cases with your question.',
  agentNeedsStore: 'Pick a store on the map first. Agent Q answers one store at a time.',
  agentWorking: 'Agent Q is working on it. This can take a minute…',
};
