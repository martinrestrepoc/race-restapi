import { App } from '@/app/App';
import { useAuth } from '@/auth/use-auth';
import type { PublicEnvironment } from '@/config/environment';
import { appRoleLabels } from '@/types/labels';
import { useLocation, useNavigate } from 'react-router-dom';

import { filterNavigationByRoles } from './navigation-permissions';

export function AuthenticatedApplication({
  environment,
}: {
  environment: PublicEnvironment;
}) {
  const { logout, profile, roles, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = filterNavigationByRoles(roles);
  const displayName =
    profile?.displayName ?? user?.username ?? user?.email ?? 'Usuario';
  const roleLabel = roles.map((role) => appRoleLabels[role]).join(' · ');
  const activeNavigation =
    navigation.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path),
    )?.key ?? 'dashboard';

  return (
    <App
      activeNavigation={activeNavigation}
      displayName={displayName}
      environment={environment}
      navigation={navigation}
      onLogout={() => void logout()}
      onNavigate={(key) => {
        const destination = navigation.find((item) => item.key === key);
        if (destination) void navigate(destination.path);
      }}
      roleLabel={roleLabel}
    />
  );
}
