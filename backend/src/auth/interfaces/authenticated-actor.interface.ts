import type { AuthenticatedUser } from './authenticated-user.interface';

export interface AuthenticatedActor extends AuthenticatedUser {
  userProfileId: string;
}
