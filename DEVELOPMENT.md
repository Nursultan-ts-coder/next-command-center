# Developing the NEXT Command Center plugin

A Grafana app plugin (`mcd-nextcommandcenter-app`, with a Go backend) that serves the Restaurant
NEXT Command Center inside Grafana. It started as a copy of the New Relic nerdpack
`~/Documents/Projects/restaurant-next-executive-view` (left untouched); all New Relic code and
NRQL/NerdGraph queries were removed and replaced with example data.

## Where things are

| Path                                    | What it is                                                                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/next/command-center/`              | The Command Center's React code (was `nerdlets/command-center`). Not linted by ESLint here.                                                                                                                    |
| `src/next/command-center/data/`         | The example data: `mock-stores.js` (the stores and their problems), `index.js` (one async function per widget), `agent-mock.js` (Agent Q and Agent C&R answers). Replace these functions to connect real data. |
| `src/next/command-center/widgets.js`    | Which widgets exist and their settings (was `queries.js`, without the queries)                                                                                                                                 |
| `src/next/command-center/app-config.js` | Wording, refresh interval, the agent flow URL default                                                                                                                                                          |
| `src/next/{app,shared,types,api}`       | Shared theme and components from the original app                                                                                                                                                              |
| `src/components/App/`                   | Grafana's page frame (Canvas layout) around the Command Center; applies the app settings                                                                                                                       |
| `src/components/AppConfig/`             | Settings: Google Maps key and agent flow URL (`jsonData`), backend API URL/key                                                                                                                                 |
| `webpack.config.ts`                     | Grafana's build plus `@/` → `src/next`, automatic JSX, the Maps key from `.env` in dev only                                                                                                                    |
| `pkg/`                                  | Go backend (resource handlers under `/api/plugins/mcd-nextcommandcenter-app/resources/...`)                                                                                                                    |
| `scripts/allow-unsigned.mjs`            | Adds this plugin's id to `allow_loading_unsigned_plugins` in Homebrew's `grafana.ini`, keeping the ids already there (such as `mcd-oop-app`)                                                                   |

The store and segment are kept in the page address (`?segment=us&store=844`).

## Develop (local Grafana from Homebrew, no Docker)

| Command                   | What it does                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run grafana:setup`   | Once: installs Grafana, links `dist/` into its plugins folder, allows this unsigned plugin |
| `npm start`               | Builds the backend, restarts Grafana, runs the frontend in watch mode                      |
| `npm run grafana:open`    | Opens http://localhost:3000/a/mcd-nextcommandcenter-app (sign in as admin/admin)           |
| `npm run backend:reload`  | Rebuilds the Go backend and restarts Grafana                                               |
| `npm run build:all`       | Production frontend plus the backend for every platform                                    |
| `npm run package:private` | Builds, signs privately for https://mcdobservability.grafana.net and zips into `release/`  |

The Google Maps key: development builds read `GOOGLE_MAPS_API_KEY` from `.env` (git-ignored, see
`.env.example`). Production builds never bundle it; set it on the app's Configuration page instead.
Restart `npm start` after changing `webpack.config.ts`, and restart Grafana after changing
`src/plugin.json`.

Checks: `npm run typecheck`, `npm run lint`, `npm run test:ci`, `go test ./pkg/...`,
`npm run build`, and with Grafana running, `npm run e2e`.
