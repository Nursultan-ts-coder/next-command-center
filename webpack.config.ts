import fs from 'fs';
import path from 'path';
import webpack, { type Configuration, type RuleSetRule } from 'webpack';
import { merge } from 'webpack-merge';

import grafanaConfig, { type Env } from './.config/webpack/webpack.config';

/** The Command Center's code (its `@/` imports): src/next. */
const APP_SRC = path.resolve(process.cwd(), 'src/next');

/** Env files read for the build, later ones winning (keep them out of git: .gitignore). */
const ENV_FILES = ['.env', '.env.production', '.env.local'];

/** One variable from the env files (`KEY=value` lines), or '' when none sets it. */
const readEnvVariable = (name: string) =>
  ENV_FILES.reduce((value, file) => {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      return value;
    }
    const line = fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));
    return line
      ? line
          .slice(line.indexOf('=') + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '')
      : value;
  }, process.env[name] ?? '');

/**
 * The Google Maps key the map falls back to when none is saved on the app's Configuration page
 * (restaurant-map/Index.js reads `process.env.GOOGLE_MAPS_API_KEY`). Development builds take
 * `GOOGLE_MAPS_API_KEY` from the env files; production builds (the released plugin) never
 * bundle a key, only one passed explicitly in the environment.
 */
const appEnv = (production: boolean) => ({
  'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(
    production ? (process.env.GOOGLE_MAPS_API_KEY ?? '') : readEnvVariable('GOOGLE_MAPS_API_KEY')
  ),
});

const isSwcRule = (rule: unknown): rule is RuleSetRule =>
  typeof rule === 'object' && rule !== null && String((rule as RuleSetRule).test) === String(/\.[tj]sx?$/);

/**
 * Grafana's plugin build (.config/, kept as create-plugin wrote it) plus what the Command Center's
 * code (src/next, plain JavaScript with JSX) needs: its `@/` alias, the automatic JSX runtime, and
 * the Maps key above.
 */
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  // The app's files use JSX in `.js` files; compile them with the automatic JSX runtime.
  // Always the production `react/jsx-runtime`: Grafana's React has no `jsxDEV`, so a development
  // build (`npm run dev`) using `react/jsx-dev-runtime` would fail with "jsxDEV is not a function".
  baseConfig.module?.rules?.filter(isSwcRule).forEach((rule) => {
    const use = rule.use as { options: { jsc: Record<string, unknown> } };
    use.options.jsc.transform = { react: { runtime: 'automatic', development: false } };
  });

  return merge(baseConfig, {
    resolve: { alias: { '@': APP_SRC } },
    plugins: [new webpack.DefinePlugin(appEnv(Boolean(env.production)))],
  });
};

export default config;
