import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './e2e-auth';

test('administrator completes the official racing workflow through the UI', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const suffix = `${Date.now().toString(36)}-${test.info().workerIndex}`;
  const memberName = `E2E Miembro ${suffix}`;
  const memberNickname = `miembro-${suffix}`;
  const individualName = `E2E Individual ${suffix}`;
  const individualNickname = `individual-${suffix}`;
  const teamName = `E2E Equipo ${suffix}`;
  const raceName = `E2E Carrera ${suffix}`;

  await loginAs(page, 'administrator');

  await page.goto('/competitors/new');
  await page.getByRole('button', { name: 'Guardar competidor' }).click();
  await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
  await expect(page.getByLabel(/^Nombre/)).toBeFocused();
  const memberId = await createCompetitor(page, {
    name: memberName,
    nickname: memberNickname,
    type: 'DWARF',
  });

  await page.goto('/competitors/new');
  const individualId = await createCompetitor(page, {
    name: individualName,
    nickname: individualNickname,
    type: 'CAMEL',
  });
  expect(memberId).not.toBe(individualId);

  await page.goto('/teams/new');
  await page.getByLabel(/^Nombre/).fill(teamName);
  await page.getByLabel(/^Persona responsable/).fill('Responsable E2E');
  await page.getByLabel(/^Descripción/).fill('Equipo creado por Playwright.');
  await page.getByRole('button', { name: 'Guardar equipo' }).click();
  await expect(page.getByRole('heading', { name: teamName })).toBeVisible();
  const teamId = currentResourceId(page);

  await page.getByLabel('Buscar competidor').fill(memberName);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await selectOptionContaining(page, 'Competidor', memberName);
  await page.getByRole('button', { name: 'Agregar' }).click();
  await expect(
    page.getByRole('link', { name: memberName, exact: true }).first(),
  ).toBeVisible();

  await page.goto('/races/new');
  const scheduledAt = localDateTimeDaysFromNow(14);
  const registrationDeadline = localDateTimeDaysFromNow(13);
  await page.getByLabel(/^Nombre/).fill(raceName);
  await page.getByLabel(/^Tipo/).selectOption('MIXED');
  await page.getByLabel(/^Inicio programado/).fill(scheduledAt);
  await page.getByLabel(/^Cierre de inscripciones/).fill(registrationDeadline);
  await page.getByLabel(/^Lugar de salida/).fill('Campus EIA');
  await page.getByLabel(/^Lugar de llegada/).fill('Meta E2E');
  await page.getByLabel(/^Distancia/).fill('1500');
  await page.getByLabel(/^Capacidad máxima/).fill('4');
  await page.getByLabel(/^Descripción/).fill('Carrera integral automatizada.');
  await page.getByRole('button', { name: 'Guardar carrera' }).click();
  await expect(page.getByRole('heading', { name: raceName })).toBeVisible();

  await transitionRace(page, 'OPEN_FOR_REGISTRATION', 'Inscripciones abiertas');
  await page.getByRole('link', { name: 'Inscripciones' }).click();

  await registerParticipant(page, 'team', teamName);
  await registerParticipant(page, 'competitor', individualName);

  await approveRegistration(page, 'Equipo', 1);
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await page.getByLabel('Posición de salida').fill('1');
  await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await expect(
    page.getByText('La posición de salida ya está asignada en esta carrera.'),
  ).toBeVisible();
  await expect(page.getByLabel('Posición de salida')).toHaveValue('1');
  await page.getByLabel('Posición de salida').fill('2');
  await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await expect(page.getByText('La inscripción fue aprobada.')).toBeVisible();
  await dismissNotification(page);

  await page.getByRole('link', { name: 'Volver a la carrera' }).click();
  await transitionRace(page, 'CLOSED', 'Inscripciones cerradas');
  await transitionRace(page, 'IN_PROGRESS', 'En curso');
  await page.getByRole('link', { name: 'Resultados' }).click();

  await recordFinishedResult(page, 1, 1, '01:00.000');
  await recordFinishedResult(page, 2, 2, '01:10.000');

  await page.getByRole('link', { name: 'Volver a la carrera' }).click();
  await transitionRace(page, 'COMPLETED', 'Completada');

  await page.goto(`/standings?search=${encodeURIComponent(individualName)}`);
  await expect(
    page.getByRole('link', { name: individualName, exact: true }).last(),
  ).toBeVisible();
  await page.goto(
    `/standings?view=teams&search=${encodeURIComponent(teamName)}`,
  );
  await expect(
    page.getByRole('link', { name: teamName, exact: true }).last(),
  ).toBeVisible();

  await page.goto('/audit');
  await page.getByLabel('Acción').selectOption('RACE_STATUS_CHANGED');
  await page.getByLabel('Elemento').selectOption('RACE');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  const latestStatusChange = page
    .getByRole('link', { name: 'Carrera estado cambiado' })
    .first();
  await expect(latestStatusChange).toBeVisible();
  await latestStatusChange.click();
  await expect(page.getByText(/IN_PROGRESS/).first()).toBeVisible();
  await expect(page.getByText(/COMPLETED/).first()).toBeVisible();

  expect(teamId).toMatch(/^[0-9a-f-]{36}$/i);
});

async function createCompetitor(
  page: Page,
  input: { name: string; nickname: string; type: 'CAMEL' | 'DWARF' },
) {
  await page.getByLabel(/^Nombre/).fill(input.name);
  await page.getByLabel(/^Apodo/).fill(input.nickname);
  await page.getByLabel(/^Tipo/).selectOption(input.type);
  await page.getByLabel(/^Fecha de nacimiento/).fill('2000-01-01');
  await page.getByLabel(/^Origen/).fill('Medellín');
  await page.getByLabel(/^Peso/).fill(input.type === 'CAMEL' ? '420' : '70');
  await page.getByLabel(/^Altura/).fill(input.type === 'CAMEL' ? '190' : '165');
  await page.getByRole('button', { name: 'Guardar competidor' }).click();
  await expect(page.getByRole('heading', { name: input.name })).toBeVisible();
  return currentResourceId(page);
}

async function transitionRace(page: Page, status: string, label: string) {
  await page.getByLabel('Siguiente estado').selectOption(status);
  await page.getByRole('button', { name: 'Aplicar transición' }).click();
  await page.getByRole('button', { name: 'Cambiar estado' }).click();
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  if (status !== 'COMPLETED') {
    await expect(page.getByLabel('Siguiente estado')).toHaveValue('');
  }
}

async function registerParticipant(
  page: Page,
  kind: 'competitor' | 'team',
  name: string,
) {
  await page.getByLabel('Tipo de participante').selectOption(kind);
  await page.getByLabel(/Buscar .* activo/).fill(name);
  await page.getByRole('option', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Inscribir participante' }).click();
  await expect(
    page.getByText('La solicitud de inscripción quedó pendiente.'),
  ).toBeVisible();
  await dismissNotification(page);
}

async function approveRegistration(
  page: Page,
  participantLabel: string,
  position: number,
) {
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: participantLabel }) });
  await row.getByRole('button', { name: 'Aprobar' }).click();
  await page.getByLabel('Posición de salida').fill(String(position));
  await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await expect(page.getByText('La inscripción fue aprobada.')).toBeVisible();
  await dismissNotification(page);
}

async function recordFinishedResult(
  page: Page,
  startingPosition: number,
  finalPosition: number,
  rawTime: string,
) {
  await selectOptionContaining(
    page,
    /^Inscripción/,
    `Salida ${startingPosition}`,
  );
  await page.getByLabel(/^Posición final/).fill(String(finalPosition));
  await page.getByLabel(/^Tiempo bruto/).fill(rawTime);
  await page.getByLabel(/^Penalización/).fill('00:00.000');
  await page.getByRole('button', { name: 'Guardar resultado' }).click();
  await expect(
    page.getByText('El resultado fue registrado correctamente.'),
  ).toBeVisible();
  await dismissNotification(page);
}

async function selectOptionContaining(
  page: Page,
  label: string | RegExp,
  optionText: string,
) {
  const select =
    typeof label === 'string'
      ? page.getByLabel(label, { exact: true })
      : page.getByLabel(label);
  const optionValue = await select
    .locator('option')
    .filter({ hasText: optionText })
    .first()
    .getAttribute('value');
  if (!optionValue) {
    throw new Error(`No se encontró una opción que contenga: ${optionText}`);
  }
  await select.selectOption(optionValue);
}

async function dismissNotification(page: Page) {
  const closeButtons = page.getByRole('button', {
    name: 'Cerrar notificación',
  });
  while ((await closeButtons.count()) > 0) {
    await closeButtons.last().click();
  }
}

function currentResourceId(page: Page): string {
  const id = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
  if (!id) throw new Error('La navegación no contiene un identificador.');
  return id;
}

function localDateTimeDaysFromNow(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
