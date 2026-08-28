import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repositoryEnvironment = resolve(import.meta.dirname, '../.env');
if (existsSync(repositoryEnvironment)) loadEnvFile(repositoryEnvironment);

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  outputDir: 'output/playwright/test-results',
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'output/playwright/report' }]],
  timeout: 60_000,
  use: {
    baseURL,
    locale: 'es-CO',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5173',
    env: {
      VITE_API_BASE_URL: '/api/v1',
      VITE_KEYCLOAK_CLIENT_ID: 'race-frontend',
      VITE_KEYCLOAK_REALM: 'race-management',
      VITE_KEYCLOAK_URL:
        process.env.E2E_KEYCLOAK_URL ?? 'http://localhost:8080',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
