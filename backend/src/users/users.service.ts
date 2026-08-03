import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileStatus } from './enums/user-profile-status.enum';
import { AuditLog } from '../audit/entities/audit-log.entity';

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

  private snapshot(
    value: string | undefined,
    maximumLength: number,
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, maximumLength) : null;
  }
}
