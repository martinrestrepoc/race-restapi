import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { RouteErrorBoundary } from '@/components/feedback/RouteErrorBoundary';
import { SubmissionError } from '@/components/feedback/SubmissionError';
import { FormField } from '@/components/forms/FormField';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';

afterEach(() => vi.restoreAllMocks());

describe('phase 12 resilience and accessibility', () => {
  it('announces required fields and associates their error message', () => {
    render(
      <FormField
        error="El nombre es obligatorio."
        htmlFor="test-name"
        label="Nombre"
        required
      >
        <input
          aria-describedby="test-name-error"
          aria-invalid="true"
          id="test-name"
        />
      </FormField>,
    );

    expect(screen.getByLabelText(/Nombre/)).toHaveAccessibleDescription(
      'El nombre es obligatorio.',
    );
    expect(screen.getByText('(obligatorio)')).toHaveClass('sr-only');
  });

  it('moves focus to a recoverable submission error', () => {
    const view = render(<SubmissionError message={null} />);
    view.rerender(<SubmissionError message="La API rechazó los datos." />);

    expect(screen.getByRole('alert')).toHaveFocus();
  });

  it('runs a destructive confirmation only once on repeated clicks', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        confirmLabel="Eliminar"
        description="Esta acción no se puede deshacer."
        isOpen
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        title="¿Eliminar?"
      />,
    );

    await user.dblClick(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('replaces an unexpected render failure with a safe recovery screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ExplodingPage />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Esta pantalla tuvo un problema',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Sensitive stack detail'),
    ).not.toBeInTheDocument();
  });

  it('makes wide tables keyboard-scrollable and long values wrappable', () => {
    render(
      <ResponsiveTable
        caption="Datos extensos"
        columns={[
          {
            header: 'Nombre',
            key: 'name',
            render: (row: { id: string; name: string }) => row.name,
          },
        ]}
        getRowKey={(row) => row.id}
        rows={[{ id: '1', name: 'NombreExtremadamenteLargoSinEspacios' }]}
      />,
    );

    expect(
      screen.getByRole('region', { name: /Datos extensos/ }),
    ).toHaveAttribute('tabindex', '0');
    expect(
      screen.getAllByText('NombreExtremadamenteLargoSinEspacios')[0],
    ).toHaveClass('break-words');
  });

  it('pins and selects the local branded Keycloak theme', () => {
    const keycloakRoot = resolve(process.cwd(), '../infrastructure/keycloak');
    const realmPath = resolve(keycloakRoot, 'race-management-realm.json');
    const propertiesPath = resolve(
      keycloakRoot,
      'themes/race-management/login/theme.properties',
    );
    const cssPath = resolve(
      keycloakRoot,
      'themes/race-management/login/resources/css/login.css',
    );
    const realm = JSON.parse(readFileSync(realmPath, 'utf8')) as {
      defaultLocale?: unknown;
      loginTheme?: unknown;
    };
    const properties = readFileSync(propertiesPath, 'utf8');
    const css = readFileSync(cssPath, 'utf8');

    expect(realm.loginTheme).toBe('race-management');
    expect(realm.defaultLocale).toBe('es');
    expect(properties).toContain('parent=keycloak.v2');
    expect(properties).toContain('Keycloak 26.7.0');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).not.toMatch(/https?:\/\//);
  });
});

function ExplodingPage(): never {
  throw new Error('Sensitive stack detail');
}
