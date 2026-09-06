import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:5173', serviceWorkers: 'block', trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
  ],
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
