import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { RouteErrorBoundary } from '@/components/feedback/RouteErrorBoundary';
import { LoadingState } from '@/components/feedback/FeedbackState';
import type {
  NavigationItem,
  NavigationKey,
} from '@/components/layout/navigation';
import type { PublicEnvironment } from '@/config/environment';

interface AppProps {
  activeNavigation: NavigationKey;
  displayName: string;
  environment: PublicEnvironment;
  navigation: NavigationItem[];
  onLogout: () => void;
  onNavigate: (item: NavigationKey) => void;
  roleLabel: string;
}

export function App({
  activeNavigation,
  displayName,
  environment,
  navigation,
  onLogout,
  onNavigate,
  roleLabel,
}: AppProps) {
  const environmentLabel = environment.apiBaseUrl.startsWith('/')
    ? 'Entorno local'
    : 'Entorno remoto';

  return (
    <AppShell
      activeItem={activeNavigation}
      displayName={displayName}
      environmentLabel={environmentLabel}
      navigation={navigation}
      onLogout={onLogout}
      onNavigate={onNavigate}
      roleLabel={roleLabel}
    >
      <RouteErrorBoundary>
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </AppShell>
  );
}
