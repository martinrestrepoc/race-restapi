import { expect, type Page } from '@playwright/test';

export type DemoRole = 'administrator' | 'organizer' | 'viewer';

const identities = {
  administrator: {
    passwordVariables: ['E2E_ADMIN_PASSWORD', 'KEYCLOAK_DEMO_ADMIN_PASSWORD'],
    username: process.env.E2E_ADMIN_USERNAME ?? 'race-admin',
  },
  organizer: {
    passwordVariables: [
      'E2E_ORGANIZER_PASSWORD',
      'KEYCLOAK_DEMO_ORGANIZER_PASSWORD',
    ],
    username: process.env.E2E_ORGANIZER_USERNAME ?? 'race-organizer',
  },
  viewer: {
    passwordVariables: ['E2E_VIEWER_PASSWORD', 'KEYCLOAK_DEMO_VIEWER_PASSWORD'],
    username: process.env.E2E_VIEWER_USERNAME ?? 'race-viewer',
  },
} as const;

export async function loginAs(page: Page, role: DemoRole, returnTo = '/') {
  const identity = identities[role];
  const password = requiredPassword(identity.passwordVariables);

  await page.goto(returnTo);
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/localhost:8080\/realms\/race-management/);
  await page
    .getByLabel(/Usuario o correo electrónico|Username or email/i)
    .fill(identity.username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /Iniciar sesión|Sign in/i }).click();

  await expect(page).toHaveURL(new RegExp(`${escapeRegex(returnTo)}$`));
  await expect(
    page.getByText(identity.username, { exact: true }),
  ).toBeVisible();
}

function requiredPassword(variableNames: readonly string[]): string {
  for (const name of variableNames) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(
    `Falta una credencial E2E externa. Define ${variableNames.join(' o ')}.`,
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
