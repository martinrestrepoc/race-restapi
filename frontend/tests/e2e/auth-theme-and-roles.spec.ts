import { expect, test } from '@playwright/test';

import { loginAs } from './e2e-auth';

test('Keycloak branded authentication remains responsive and recoverable', async ({
  page,
}) => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(
    page.locator('link[href*="/login/race-management/css/login.css"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Gestiona la liga desde un solo lugar' }),
  ).toBeVisible();
  await expect(page.getByLabel('Usuario o correo electrónico')).toBeFocused();

  await page
    .getByLabel('Usuario o correo electrónico')
    .fill('invalid-e2e-user');
  await page.locator('#password').fill('invalid-e2e-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(
    page.getByText(
      /Usuario o contraseña (?:no válidos|incorrectos)|Invalid username or password/i,
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(
    page.getByRole('heading', { name: /Recuperar acceso/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/Usuario o correo electrónico/i)).toBeVisible();

  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator('main')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('organizer capabilities match backend route policy', async ({ page }) => {
  await loginAs(page, 'organizer', '/races/new');
  await expect(
    page.getByRole('heading', { name: 'Nueva carrera' }),
  ).toBeVisible();

  await page.goto('/competitors/new');
  await expect(
    page.getByRole('heading', { name: 'Permisos insuficientes' }),
  ).toBeVisible();
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Permisos insuficientes' }),
  ).toBeVisible();
});

test('viewer is restricted to read-only routes and navigation', async ({
  page,
}) => {
  await loginAs(page, 'viewer');
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).not.toContainText('Administración');

  await page.goto('/races/new');
  await expect(
    page.getByRole('heading', { name: 'Permisos insuficientes' }),
  ).toBeVisible();
  await page.goto('/races/00000000-0000-4000-8000-000000000000/registrations');
  await expect(
    page.getByRole('heading', { name: 'Permisos insuficientes' }),
  ).toBeVisible();
});
