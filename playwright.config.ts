import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000
  },
  globalSetup: require.resolve('./e2e/global-setup.ts')
});

