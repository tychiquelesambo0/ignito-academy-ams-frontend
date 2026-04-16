import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Load test-only credentials from .env.test.local (never committed to git).
// This file holds E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_TEST_EMAIL, etc.
// We parse it manually so no external dependency (dotenv) is needed.
const testEnvFile = path.resolve(__dirname, '.env.test.local')
if (fs.existsSync(testEnvFile)) {
  const lines = fs.readFileSync(testEnvFile, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (key && !(key in process.env)) process.env[key] = val
    }
  }
}

/**
 * Playwright E2E configuration for Ignito Academy AMS.
 * Targets the local Next.js dev server.
 *
 * Run: npm run test:e2e
 */
export default defineConfig({
  testDir:  './src/__tests__/e2e',
  timeout:  30_000,
  retries:  process.env.CI ? 2 : 0,
  workers:  process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL:     process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    // Record trace on first retry in CI
    trace:       'on-first-retry',
    // Capture screenshot on test failure
    screenshot:  'only-on-failure',
    // Prefer formal French locale
    locale:      'fr-FR',
  },

  // Run against a local dev/preview server
  webServer: {
    command:            'npm run dev',
    url:                'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout:            120_000,
  },

  projects: [
    // Desktop Chrome (primary)
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
    // Mobile Safari (iOS — critical for RDC users)
    {
      name:  'Mobile Safari',
      use:   { ...devices['iPhone 13'] },
    },
    // Android Chrome
    {
      name:  'Mobile Chrome',
      use:   { ...devices['Pixel 5'] },
    },
  ],
})
