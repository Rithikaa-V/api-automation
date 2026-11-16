import { defineConfig } from '@playwright/test';
import { API_BASE_URL, API_TIMEOUT } from './tests/support/env';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/support/global-setup.ts',
  globalTeardown: './tests/support/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Accept: 'application/json' },
    actionTimeout: API_TIMEOUT,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'component', testDir: './tests/component' },
  ],
});
