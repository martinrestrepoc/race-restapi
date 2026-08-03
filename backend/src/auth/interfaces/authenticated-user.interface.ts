import { AppRole } from '../enums/app-role.enum';

export interface AuthenticatedUser {
  sub: string;
  username?: string;
  email?: string;
  roles: AppRole[];
  userProfileId?: string;
}
