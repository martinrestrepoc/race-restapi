import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AuthUnavailablePage } from '@/auth/pages/AuthUnavailablePage';
import { SessionLoadingPage } from '@/auth/pages/SessionLoadingPage';

import { hasAnyRole, type AppRole } from './auth.types';
import { useAuth } from './use-auth';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <SessionLoadingPage />;
  if (auth.status === 'error') return <AuthUnavailablePage />;
  if (auth.status === 'forbidden') {
    return <Navigate replace to="/access-denied" />;
  }
  if (auth.status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace state={{ returnTo }} to="/login" />;
  }

  return <Outlet />;
}

export function AnonymousRoute() {
  const auth = useAuth();

  if (auth.status === 'loading') return <SessionLoadingPage />;
  if (auth.status === 'error') return <AuthUnavailablePage />;
  if (auth.status === 'forbidden') {
    return <Navigate replace to="/access-denied" />;
  }
  if (auth.status === 'authenticated') {
    return (
      <Navigate
        replace
        to={auth.profile?.status === 'DISABLED' ? '/account-disabled' : '/'}
      />
    );
  }

  return <Outlet />;
}

export function ActiveProfileGate() {
  const { profile } = useAuth();
  if (profile?.status === 'DISABLED') {
    return <Navigate replace to="/account-disabled" />;
  }

  return <Outlet />;
}

export function DisabledProfileGate() {
  const { profile } = useAuth();
  if (profile?.status !== 'DISABLED') return <Navigate replace to="/" />;
  return <Outlet />;
}

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({
  allowedRoles,
  children,
  fallback = null,
}: RoleGateProps) {
  const { roles } = useAuth();
  return hasAnyRole(roles, allowedRoles) ? children : fallback;
}

export function RequiredRoleGate({
  allowedRoles,
}: {
  allowedRoles: AppRole[];
}) {
  const { roles } = useAuth();
  if (!hasAnyRole(roles, allowedRoles)) {
    return <Navigate replace to="/access-denied" />;
  }

  return <Outlet />;
}
