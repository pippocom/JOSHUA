// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Build smoke tests: serve the generated dist/ artifacts and verify each one
// boots. Two servers: dist/standalone/ as one root (relative paths), and
// dist/pippo.com/ as the domain root (so the pippo trees' root-relative
// language/return paths resolve). Run via `npx playwright test
// --config=playwright.build.config.js` after `make build`.
module.exports = defineConfig({
  testDir: './tests/build',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'python3 -m http.server 4175 --directory dist/standalone',
      url: 'http://127.0.0.1:4175/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: 'python3 -m http.server 4176 --directory dist/pippo.com',
      url: 'http://127.0.0.1:4176/human-systems/interactive-fiction/joshua/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
