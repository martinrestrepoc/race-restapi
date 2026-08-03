import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { UserProfileStatus } from '../enums/user-profile-status.enum';
import { UsersService } from '../users.service';

@Injectable()
export class ActiveUserProfileGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const profile = await this.usersService.findOrProvision(request.user);
    if (profile.status !== UserProfileStatus.ACTIVE) {
      throw new ForbiddenException('User profile is disabled');
    }

    request.user.userProfileId = profile.id;
    return true;
  }
}
