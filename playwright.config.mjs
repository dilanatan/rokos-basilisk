import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: {timeout: 10000},
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {baseURL: 'http://127.0.0.1:5176', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  projects: [{name:'chromium', use:{...devices['Desktop Chrome'], ...(process.platform==='win32'&&!process.env.CI?{channel:'msedge'}:{})}}],
  webServer: {command:'node scripts/e2e-server.mjs', url:'http://127.0.0.1:5176/api/health', reuseExistingServer:false, timeout:60000},
});
