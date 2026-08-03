import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileStatus } from './enums/user-profile-status.enum';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { SortOrder } from '../common/enums/sort-order.enum';
import { UserProfileQueryDto } from './dto/user-profile-query.dto';

export interface UserProfileListResult {
  items: UserProfile[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === code
  );
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profilesRepository: Repository<UserProfile>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async findOrProvision(user: AuthenticatedUser): Promise<UserProfile> {
    const existing = await this.profilesRepository.findOneBy({
      keycloakUserId: user.sub,
    });
    if (existing) return existing;

    const profile = this.profilesRepository.create({
      keycloakUserId: user.sub,
      emailSnapshot: this.snapshot(user.email, 320),
      displayName:
        this.snapshot(user.username, 200) ??
        this.snapshot(user.email, 200) ??
        user.sub.slice(0, 200),
      status: UserProfileStatus.ACTIVE,
    });

    try {
      const saved = await this.profilesRepository.save(profile);
      await this.auditLogsRepository.save(
        this.auditLogsRepository.create({
          actorUserProfileId: saved.id,
          action: 'USER_PROFILE_CREATED',
          entityType: 'USER_PROFILE',
          entityId: saved.id,
          description: 'Local user profile provisioned from validated identity',
          previousValues: null,
          newValues: {
            displayName: saved.displayName,
            status: saved.status,
          },
        }),
      );
      return saved;
    } catch (error) {
      if (!hasPostgresErrorCode(error, '23505')) throw error;

      const concurrentlyCreated = await this.profilesRepository.findOneBy({
        keycloakUserId: user.sub,
      });
      if (concurrentlyCreated) return concurrentlyCreated;

      throw new InternalServerErrorException(
        'Authenticated user profile could not be provisioned',
      );
    }
  }

  async findAll(query: UserProfileQueryDto): Promise<UserProfileListResult> {
    const queryBuilder = this.profilesRepository
      .createQueryBuilder('profile')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('profile.status = :status', {
        status: query.status,
      });
    }

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(profile.displayName ILIKE :search OR profile.emailSnapshot ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(
      `profile.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('profile.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<UserProfile> {
    const profile = await this.profilesRepository.findOneBy({ id });
    if (!profile) {
      throw new NotFoundException(`User profile with ID ${id} was not found`);
    }
    return profile;
  }

  async updateStatus(
    id: string,
    targetStatus: UserProfileStatus,
    actorUserProfileId: string,
  ): Promise<UserProfile> {
    if (
      id === actorUserProfileId &&
      targetStatus === UserProfileStatus.DISABLED
    ) {
      throw new ConflictException(
        'Administrators cannot disable their own active profile',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(UserProfile);
      const auditLogs = manager.getRepository(AuditLog);
      const profile = await profiles.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!profile) {
        throw new NotFoundException(`User profile with ID ${id} was not found`);
      }
      if (profile.status === targetStatus) {
        throw new ConflictException(
          `User profile status is already ${targetStatus}`,
        );
      }

      const previousStatus = profile.status;
      profile.status = targetStatus;
      const saved = await profiles.save(profile);
      await auditLogs.save(
        auditLogs.create({
          actorUserProfileId,
          action: 'USER_PROFILE_STATUS_CHANGED',
          entityType: 'USER_PROFILE',
          entityId: saved.id,
          description: 'Local user profile status changed',
          previousValues: { status: previousStatus },
          newValues: { status: saved.status },
        }),
      );
      return saved;
    });
  }

  private snapshot(
    value: string | undefined,
    maximumLength: number,
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, maximumLength) : null;
  }
}
