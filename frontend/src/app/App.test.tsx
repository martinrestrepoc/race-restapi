import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { navigationItems } from '@/components/layout/navigation';

import { App } from './App';

const environment = {
  apiBaseUrl: '/api/v1',
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'race-management',
  keycloakClientId: 'race-frontend',
};

function renderApp(onNavigate = vi.fn(), onLogout = vi.fn()) {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          element={
            <App
              activeNavigation="dashboard"
              displayName="Ada Lovelace"
              environment={environment}
              navigation={navigationItems}
              onLogout={onLogout}
              onNavigate={onNavigate}
              roleLabel="Administrador"
            />
          }
        >
          <Route element={<h1>Contenido de la ruta</h1>} index />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return { onLogout, onNavigate };
}

describe('App routing shell', () => {
  it('renders routed content and the responsive navigation', () => {
    renderApp();
    expect(
      screen.getByRole('heading', { name: 'Contenido de la ruta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Navegación móvil' }),
    ).toBeInTheDocument();
  });

  it('delegates route navigation and logout actions', async () => {
    const user = userEvent.setup();
    const { onLogout, onNavigate } = renderApp();
    const navigation = screen.getByRole('navigation', {
      name: 'Navegación principal',
    });

    await user.click(
      within(navigation).getByRole('button', { name: 'Carreras' }),
    );
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(onNavigate).toHaveBeenCalledWith('races');
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
