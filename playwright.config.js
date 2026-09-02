// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Serves src/ as a plain static directory — the standalone game must be
// servable from any static host, so this is deliberately the simplest
// possible server (no build step, no framework dev server).
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --directory src',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit here is Playwright's WebKit engine, NOT a substitute for a real
    // Safari/macOS manual test — it validates engine-level behavior
    // (autoplay policy shape, Web Audio/Speech API surface) but is not a
    // claim of "tested on Safari".
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
