import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppRole } from '../auth/enums/app-role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileStatus } from './enums/user-profile-status.enum';
import { UsersService } from './users.service';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { SortOrder } from '../common/enums/sort-order.enum';
import { UserProfileSortField } from './dto/user-profile-query.dto';

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
    Pick<
      Repository<UserProfile>,
      'findOneBy' | 'create' | 'save' | 'createQueryBuilder'
    >
  >;
  let service: UsersService;
  let auditRepository: { create: jest.Mock; save: jest.Mock };
  let transaction: jest.Mock;
  let queryBuilder: {
    skip: jest.Mock;
    take: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    repository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    auditRepository = {
      create: jest.fn((value) => value as AuditLog),
      save: jest.fn((value) => Promise.resolve(value as AuditLog)),
    };
    transaction = jest.fn();
    service = new UsersService(
      repository as unknown as Repository<UserProfile>,
      auditRepository as unknown as Repository<AuditLog>,
      { transaction } as unknown as DataSource,
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

  it('changes profile status and records the administrator atomically', async () => {
    const target = profile();
    const actorUserProfileId = crypto.randomUUID();
    const profiles = {
      findOne: jest.fn().mockResolvedValue(target),
      save: jest.fn((value: UserProfile) => Promise.resolve(value)),
    };
    transaction.mockImplementation(
      async (
        callback: (manager: {
          getRepository: (entity: unknown) => unknown;
        }) => Promise<UserProfile>,
      ) =>
        callback({
          getRepository: (entity) =>
            entity === UserProfile ? profiles : auditRepository,
        }),
    );

    const updated = await service.updateStatus(
      target.id,
      UserProfileStatus.DISABLED,
      actorUserProfileId,
    );

    expect(updated.status).toBe(UserProfileStatus.DISABLED);
    expect(auditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserProfileId,
        action: 'USER_PROFILE_STATUS_CHANGED',
        previousValues: { status: UserProfileStatus.ACTIVE },
        newValues: { status: UserProfileStatus.DISABLED },
      }),
    );
  });

  it('prevents an administrator from disabling their own profile', async () => {
    const id = crypto.randomUUID();

    await expect(
      service.updateStatus(id, UserProfileStatus.DISABLED, id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns not found when changing an unknown profile', async () => {
    transaction.mockImplementation(
      async (
        callback: (manager: {
          getRepository: () => { findOne: jest.Mock };
        }) => Promise<UserProfile>,
      ) =>
        callback({
          getRepository: () => ({ findOne: jest.fn().mockResolvedValue(null) }),
        }),
    );

    await expect(
      service.updateStatus(
        crypto.randomUUID(),
        UserProfileStatus.DISABLED,
        crypto.randomUUID(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filters and paginates profiles with allowlisted sorting', async () => {
    const existing = profile();
    queryBuilder.getManyAndCount.mockResolvedValue([[existing], 11]);

    const result = await service.findAll({
      page: 2,
      limit: 10,
      status: UserProfileStatus.ACTIVE,
      search: ' race ',
      sortBy: UserProfileSortField.DISPLAY_NAME,
      sortOrder: SortOrder.ASC,
    });

    expect(result).toEqual({
      items: [existing],
      page: 2,
      limit: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'profile.displayName',
      'ASC',
    );
  });

  it('returns profile detail and maps an unknown profile to not found', async () => {
    const existing = profile();
    repository.findOneBy.mockResolvedValueOnce(existing);

    await expect(service.findOne(existing.id)).resolves.toBe(existing);
    repository.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne(crypto.randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a redundant profile status transition', async () => {
    const existing = profile();
    transaction.mockImplementation(
      async (
        callback: (manager: {
          getRepository: () => { findOne: jest.Mock };
        }) => Promise<UserProfile>,
      ) =>
        callback({
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue(existing),
          }),
        }),
    );

    await expect(
      service.updateStatus(
        existing.id,
        UserProfileStatus.ACTIVE,
        crypto.randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
