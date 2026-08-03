import { QueryFailedError, Repository } from 'typeorm';
import { AppRole } from '../auth/enums/app-role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileStatus } from './enums/user-profile-status.enum';
import { UsersService } from './users.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

const authenticatedUser: AuthenticatedUser = {
  sub: 'keycloak-subject',
  username: '  race-admin  ',
  email: 'race-admin@example.invalid',
  roles: [AppRole.ADMINISTRATOR],
};

function profile(): UserProfile {
  return {
    id: 'd9385ef6-f41a-420a-a773-8bd18fbfbf10',
    keycloakUserId: authenticatedUser.sub,
    emailSnapshot: 'race-admin@example.invalid',
    displayName: 'race-admin',
    status: UserProfileStatus.ACTIVE,
    createdAt: new Date('2026-08-03T12:00:00.000Z'),
    updatedAt: new Date('2026-08-03T12:00:00.000Z'),
  };
}

describe('UsersService', () => {
  let repository: jest.Mocked<
    Pick<Repository<UserProfile>, 'findOneBy' | 'create' | 'save'>
  >;
  let service: UsersService;
  let auditRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    repository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    auditRepository = {
      create: jest.fn((value) => value as AuditLog),
      save: jest.fn((value) => Promise.resolve(value as AuditLog)),
    };
    service = new UsersService(
      repository as unknown as Repository<UserProfile>,
      auditRepository as unknown as Repository<AuditLog>,
    );
  });

  it('returns the existing profile without synchronizing claim snapshots', async () => {
    const existing = profile();
    repository.findOneBy.mockResolvedValue(existing);

    await expect(service.findOrProvision(authenticatedUser)).resolves.toBe(
      existing,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('creates an active profile from safe claim snapshots', async () => {
    const created = profile();
    repository.findOneBy.mockResolvedValue(null);
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.findOrProvision(authenticatedUser)).resolves.toBe(
      created,
    );
    expect(repository.create).toHaveBeenCalledWith({
      keycloakUserId: authenticatedUser.sub,
      emailSnapshot: authenticatedUser.email,
      displayName: 'race-admin',
      status: UserProfileStatus.ACTIVE,
    });
    expect(auditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId: created.id,
        action: 'USER_PROFILE_CREATED',
        newValues: {
          displayName: created.displayName,
          status: created.status,
        },
      }),
    );
  });

  it('recovers the profile created by a concurrent request', async () => {
    const existing = profile();
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    repository.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    repository.create.mockReturnValue(existing);
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], driverError),
    );

    await expect(service.findOrProvision(authenticatedUser)).resolves.toBe(
      existing,
    );
  });
});
