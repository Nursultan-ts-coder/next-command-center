import pluginJson from './plugin.json';

/** Where Grafana serves the app's pages. */
export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

/** The app's settings, saved by the configuration page (an org admin's). */
export type CommandCenterSettings = {
  /** The browser key for Google Maps (it is sent to the browser, so restrict it by referrer). */
  googleMapsApiKey?: string;
  /** The Power Automate flow behind Agent Q and Agent C&R; empty for example answers. */
  agentFlowUrl?: string;
  /** The URL of the external API the backend calls (scaffold setting). */
  apiUrl?: string;
  /** Whether the API key secret is saved (the secret itself only reaches the backend). */
  isApiKeySet?: boolean;
};
