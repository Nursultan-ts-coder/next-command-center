/*
 * The only part of grafana-restraurant-custom-widgets' generated API client (src/api/generated.ts)
 * the copied files need: the one constant the theme uses.
 * The app's data comes from its data layer (command-center/data).
 */
export type TechnologyStatus = (typeof TechnologyStatus)[keyof typeof TechnologyStatus];

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const TechnologyStatus = {
  Unmanaged: 'Unmanaged',
  Partial: 'Partial',
  'Full-Meraki': 'Full-Meraki',
  Hybrid: 'Hybrid',
  'Full-Juniper': 'Full-Juniper',
  'Non-standard': 'Non-standard',
} as const;
