import type { CommandCenterSettings } from './constants';

declare global {
  interface Window {
    /** Read by the Command Center's code (src/next) for the settings saved on the Configuration page. */
    __NEXT_CC_CONFIG__?: { googleMapsApiKey?: string; agentFlowUrl?: string };
  }
}

/** Hands the app's settings to the Command Center; call it before its pages load. */
export function applySettings(settings: CommandCenterSettings | undefined) {
  window.__NEXT_CC_CONFIG__ = {
    googleMapsApiKey: settings?.googleMapsApiKey?.trim() || undefined,
    agentFlowUrl: settings?.agentFlowUrl?.trim() || undefined,
  };
}
