import { lazy, type ComponentType } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ApiProvider } from '@/api/ApiProvider';
import {
  ActiveProfileGate,
  AnonymousRoute,
  DisabledProfileGate,
  ProtectedRoute,
  RequiredRoleGate,
} from '@/auth/AuthGates';
import { AuthProvider } from '@/auth/AuthContext';
import type { AuthClient } from '@/auth/keycloak-client';
import { getKeycloakClient } from '@/auth/keycloak-client';
import { AccessDeniedPage } from '@/auth/pages/AccessDeniedPage';
import { AccountDisabledPage } from '@/auth/pages/AccountDisabledPage';
import { LoginPage } from '@/auth/pages/LoginPage';
import type { PublicEnvironment } from '@/config/environment';

import { AuthenticatedApplication } from './AuthenticatedApplication';

const DashboardPage = lazyNamed(
  () => import('@/pages/DashboardPage'),
  'DashboardPage',
);
const NotFoundPage = lazyNamed(
  () => import('@/pages/NotFoundPage'),
  'NotFoundPage',
);
const CompetitorDetailPage = lazyNamed(
  () => import('@/pages/competitors/CompetitorDetailPage'),
  'CompetitorDetailPage',
);
const CompetitorFormPage = lazyNamed(
  () => import('@/pages/competitors/CompetitorFormPage'),
  'CompetitorFormPage',
);
const CompetitorListPage = lazyNamed(
  () => import('@/pages/competitors/CompetitorListPage'),
  'CompetitorListPage',
);
const TeamDetailPage = lazyNamed(
  () => import('@/pages/teams/TeamDetailPage'),
  'TeamDetailPage',
);
const TeamFormPage = lazyNamed(
  () => import('@/pages/teams/TeamFormPage'),
  'TeamFormPage',
);
const TeamListPage = lazyNamed(
  () => import('@/pages/teams/TeamListPage'),
  'TeamListPage',
);
const RaceDetailPage = lazyNamed(
  () => import('@/pages/races/RaceDetailPage'),
  'RaceDetailPage',
);
const RaceFormPage = lazyNamed(
  () => import('@/pages/races/RaceFormPage'),
  'RaceFormPage',
);
const RaceListPage = lazyNamed(
  () => import('@/pages/races/RaceListPage'),
  'RaceListPage',
);
const RaceRegistrationsPage = lazyNamed(
  () => import('@/pages/registrations/RaceRegistrationsPage'),
  'RaceRegistrationsPage',
);
const RaceResultsPage = lazyNamed(
  () => import('@/pages/results/RaceResultsPage'),
  'RaceResultsPage',
);
const ResultEditPage = lazyNamed(
  () => import('@/pages/results/ResultEditPage'),
  'ResultEditPage',
);
const StandingsPage = lazyNamed(
  () => import('@/pages/standings/StandingsPage'),
  'StandingsPage',
);
const UserDetailPage = lazyNamed(
  () => import('@/pages/users/UserDetailPage'),
  'UserDetailPage',
);
const UserListPage = lazyNamed(
  () => import('@/pages/users/UserListPage'),
  'UserListPage',
);
const AuditDetailPage = lazyNamed(
  () => import('@/pages/audit/AuditDetailPage'),
  'AuditDetailPage',
);
const AuditListPage = lazyNamed(
  () => import('@/pages/audit/AuditListPage'),
  'AuditListPage',
);
const ProfilePage = lazyNamed(
  () => import('@/pages/profile/ProfilePage'),
  'ProfilePage',
);

function lazyNamed<Module, Key extends keyof Module>(
  loader: () => Promise<Module>,
  key: Key,
) {
  return lazy(async () => ({ default: moduleComponent(await loader(), key) }));
}

function moduleComponent<Module, Key extends keyof Module>(
  module: Module,
  key: Key,
) {
  return module[key] as ComponentType;
}

interface RootApplicationProps {
  authClient?: AuthClient;
  environment: PublicEnvironment;
}

export function RootApplication({
  authClient,
  environment,
}: RootApplicationProps) {
  const client = authClient ?? getKeycloakClient(environment);

  return (
    <BrowserRouter>
      <AuthProvider apiBaseUrl={environment.apiBaseUrl} client={client}>
        <ApiProvider baseUrl={environment.apiBaseUrl}>
          <Routes>
            <Route element={<AnonymousRoute />}>
              <Route element={<LoginPage />} path="/login" />
            </Route>
            <Route element={<AccessDeniedPage />} path="/access-denied" />
            <Route element={<ProtectedRoute />}>
              <Route element={<DisabledProfileGate />}>
                <Route
                  element={<AccountDisabledPage />}
                  path="/account-disabled"
                />
              </Route>
              <Route element={<ActiveProfileGate />}>
                <Route
                  element={
                    <AuthenticatedApplication environment={environment} />
                  }
                >
                  <Route element={<DashboardPage />} index />
                  <Route element={<CompetitorListPage />} path="competitors" />
                  <Route
                    element={<CompetitorDetailPage />}
                    path="competitors/:id"
                  />
                  <Route element={<TeamListPage />} path="teams" />
                  <Route element={<TeamDetailPage />} path="teams/:id" />
                  <Route element={<RaceListPage />} path="races" />
                  <Route element={<RaceDetailPage />} path="races/:id" />
                  <Route
                    element={<RaceResultsPage />}
                    path="races/:raceId/results"
                  />
                  <Route element={<StandingsPage />} path="standings" />
                  <Route element={<ProfilePage />} path="profile" />

                  <Route
                    element={
                      <RequiredRoleGate allowedRoles={['ADMINISTRATOR']} />
                    }
                  >
                    <Route
                      element={<CompetitorFormPage />}
                      path="competitors/new"
                    />
                    <Route
                      element={<CompetitorFormPage />}
                      path="competitors/:id/edit"
                    />
                    <Route element={<TeamFormPage />} path="teams/new" />
                    <Route element={<TeamFormPage />} path="teams/:id/edit" />
                    <Route element={<UserListPage />} path="users" />
                    <Route element={<UserDetailPage />} path="users/:id" />
                    <Route element={<AuditListPage />} path="audit" />
                    <Route element={<AuditDetailPage />} path="audit/:id" />
                  </Route>

                  <Route
                    element={
                      <RequiredRoleGate
                        allowedRoles={['ADMINISTRATOR', 'RACE_ORGANIZER']}
                      />
                    }
                  >
                    <Route element={<RaceFormPage />} path="races/new" />
                    <Route element={<RaceFormPage />} path="races/:id/edit" />
                    <Route
                      element={<RaceRegistrationsPage />}
                      path="races/:raceId/registrations"
                    />
                    <Route
                      element={<ResultEditPage />}
                      path="results/:id/edit"
                    />
                  </Route>

                  <Route element={<NotFoundPage />} path="*" />
                </Route>
              </Route>
            </Route>
          </Routes>
        </ApiProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
