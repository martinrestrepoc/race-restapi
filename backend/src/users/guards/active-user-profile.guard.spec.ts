import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppRole } from '../../auth/enums/app-role.enum';
import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { UserProfile } from '../entities/user-profile.entity';
import { UserProfileStatus } from '../enums/user-profile-status.enum';
import { UsersService } from '../users.service';
import { ActiveUserProfileGuard } from './active-user-profile.guard';

function createContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

function profile(status: UserProfileStatus): UserProfile {
  return {
    id: 'd9385ef6-f41a-420a-a773-8bd18fbfbf10',
    status,
  } as UserProfile;
}

describe('ActiveUserProfileGuard', () => {
  const usersService = { findOrProvision: jest.fn() };
  const guard = new ActiveUserProfileGuard(
    usersService as unknown as UsersService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('provisions an active profile and attaches its ID to the actor', async () => {
    const request = {
      user: {
        sub: 'keycloak-subject',
        roles: [AppRole.ADMINISTRATOR],
      },
    } as AuthenticatedRequest;
    usersService.findOrProvision.mockResolvedValue(
      profile(UserProfileStatus.ACTIVE),
    );

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user.userProfileId).toBe(
      'd9385ef6-f41a-420a-a773-8bd18fbfbf10',
    );
  });

  it('rejects a disabled local profile', async () => {
    const request = {
      user: { sub: 'keycloak-subject', roles: [AppRole.VIEWER] },
    } as AuthenticatedRequest;
    usersService.findOrProvision.mockResolvedValue(
      profile(UserProfileStatus.DISABLED),
    );

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request without an authenticated principal', async () => {
    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
