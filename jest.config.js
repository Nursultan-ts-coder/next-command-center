// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const base = require('./.config/jest.config');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...base,
  // The Command Center's `@/` imports (src/next), as in webpack.config.ts.
  moduleNameMapper: { ...base.moduleNameMapper, '^@/(.*)$': '<rootDir>/src/next/$1' },
  // The automatic JSX runtime, as in webpack.config.ts (no `import React` in the files).
  transform: {
    '^.+\\.(t|j|mj)sx?$': [
      '@swc/jest',
      {
        sourceMaps: 'inline',
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: false, dynamicImport: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  // Grafana's runtime packages leave handles open after the tests, so Jest would never exit.
  forceExit: true,
};
