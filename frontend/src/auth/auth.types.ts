export const appRoles = ['ADMINISTRATOR', 'RACE_ORGANIZER', 'VIEWER'] as const;

export type AppRole = (typeof appRoles)[number];
export type UserProfileStatus = 'ACTIVE' | 'DISABLED';

export interface AuthenticatedUser {
  email?: string | undefined;
  roles: AppRole[];
  sub: string;
  username?: string | undefined;
}

export interface UserProfile {
  createdAt: string;
  displayName: string;
  emailSnapshot: string | null;
  id: string;
  keycloakUserId: string;
  status: UserProfileStatus;
  updatedAt: string;
}

export interface AuthenticatedSession {
  profile: UserProfile;
  user: AuthenticatedUser;
}

export type AuthStatus =
  'loading' | 'anonymous' | 'authenticated' | 'forbidden' | 'error';

export function hasAnyRole(
  currentRoles: AppRole[],
  allowedRoles: AppRole[],
): boolean {
  return allowedRoles.some((role) => currentRoles.includes(role));
}
