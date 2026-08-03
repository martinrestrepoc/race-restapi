import { AppRole } from '../enums/app-role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export class AuthMeResponseDto {
  sub: string;
  username?: string;
  email?: string;
  roles: AppRole[];

  static fromUser(user: AuthenticatedUser): AuthMeResponseDto {
    return {
      sub: user.sub,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
  }
}
