import { defineConfig } from '@playwright/test'
import { E2E_PORT, e2eHash } from './tests/sync-e2e/server'
import { chromeLaunchOptions } from './tools/chrome.mjs'

/**
 * Sync end to end: two browsers (a phone and a laptop, each with its own cookies
 * and storage) against `wrangler dev`, which serves the production build and the
 * sync API with a fresh local D1 database for every run.
 *   npm run e2e:sync
 */
const state = `node_modules/.cache/sync-e2e/${Date.now()}`
const wrangler = 'npx wrangler'

export default defineConfig({
  testDir: 'tests/sync-e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    launchOptions: chromeLaunchOptions(),
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: [
      'npm run build',
      `${wrangler} d1 migrations apply DB --local --persist-to ${state}`,
      `${wrangler} dev --port ${E2E_PORT} --persist-to ${state} --var SYNC_PASSPHRASE_HASH:${e2eHash()}`,
    ].join(' && '),
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  },
})
