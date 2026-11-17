# Publishing NEXT Command Center (mcd-nextcommandcenter-app) 1.0.0

Done already: plugin.json links, README, CHANGELOG, LICENSE, release workflow (signing + attestation),
plugin SDK upgrade, lint, typecheck, tests, production build for all 6 platforms, plugin validator
(no errors), local Grafana check, and an unsigned zip in `release/` with its SHA1.

## Your steps

1. **Create the public GitHub repo** `Nursultan-ts-coder/next-command-center` (public, empty). The
   plugin.json and README links already point there. If you want a different repo, tell Claude and
   the links get changed.
2. **Push the code** (or let Claude do it):

   ```bash
   git remote add public https://github.com/Nursultan-ts-coder/next-command-center.git
   git push -u public main
   ```

3. **Create the v1.0.0 release.** Push the tag; the Release workflow builds the zip and attaches it
   to a draft GitHub release. Publish that draft.

   ```bash
   git tag v1.0.0 && git push public v1.0.0
   ```

4. **Submit on grafana.com**: Org `mcd` → My Plugins → Submit New Plugin. Give it:
   - the zip URL from the GitHub release, and its SHA1 (from the release or `shasum`),
   - the source code URL `https://github.com/Nursultan-ts-coder/next-command-center`,
   - testing notes: the data is built-in example data; the maps need a Google Maps JavaScript API key
     entered on the app's Configuration page; Agent Q gives example answers without a flow URL.
5. **After Grafana approves it**: create an Access Policy token (grafana.com → My Account → Security →
   Access Policies, realm `mcd (all-stacks)`, scope `plugins:write`), add it to the GitHub repo as
   the secret `GRAFANA_ACCESS_POLICY_TOKEN`, then release a signed build by bumping the version
   (e.g. 1.0.1 in package.json + CHANGELOG) and pushing the new tag. Submit that version as an update.

## Things Grafana's reviewers may raise

- The validator's AI review flagged: globals on `window` and inline `onclick` handlers in the map
  pop-ups, the Google Maps script injected at runtime, HTML strings passed to the map pop-up and
  `innerHTML`, and some hardcoded CSS. None are errors, but reviewers can ask for changes.
- React 19 warnings come from bundled libraries (MUI, react-transition-group, emotion styled,
  react-chartjs-2). The app runs fine on Grafana 13.
- A public plugin is visible to everyone. It shows internal names (NEXT, Archy, Agent Q, ServiceNow)
  and restaurant counts. Grafana also tends to send company-specific plugins to private publishing.
