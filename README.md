# NEXT Command Center

The Restaurant NEXT Command Center inside Grafana: every NEXT store on a map, each store's 3D
view and drive-thru, its orders, network, incidents and cases, and the Agent Q assistant.

## Features

- **Global and segment maps**: every store as a pin coloured by its health, with a pop-up per store
  (incidents, changes, monitoring alerts and the Agent C&R summary).
- **Store page**: KPI cards, the 3D store view with live status per area, the drive-thru lane and
  its eight steps, and tabs for channel orders, the network, Archy ordered items and ServiceNow.
- **Agent Q**: ask about the selected store or all stores.
- Follows Grafana's light and dark theme.

All numbers currently come from built-in example data (`src/next/command-center/data/`). Agent Q
and Agent C&R give example answers until an agent flow URL is set.

## Requirements

- Grafana 13.2.0 or later.
- For the maps: a Google Maps JavaScript API key, restricted to your Grafana's URL.

## Getting started

1. Enable the app under **Administration → Plugins and data → Plugins → NEXT Command Center**.
2. On its **Configuration** tab, enter the Google Maps API key (and optionally the agent flow URL)
   under **Map and agent settings** and save.
3. Open it from **More apps → NEXT Command Center**.
