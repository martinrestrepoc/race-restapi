import { createContext } from 'react';

import type {
  AppRole,
  AuthenticatedUser,
  AuthStatus,
  UserProfile,
} from './auth.types';

export interface AuthContextValue {
  getAccessToken: () => Promise<string>;
  handleUnauthorized: () => void;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  profile: UserProfile | null;
  roles: AppRole[];
  status: AuthStatus;
  user: AuthenticatedUser | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
