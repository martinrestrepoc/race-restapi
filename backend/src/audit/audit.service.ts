import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RaceResult } from '../results/entities/race-result.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEvent {
  actorUserProfileId: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface AuditLogListResult {
  items: AuditLog[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  constructor(
    @Optional()
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository?: Repository<AuditLog>,
  ) {}

  async recordEvent(event: AuditEvent, manager?: EntityManager): Promise<void> {
    const repository = manager
      ? manager.getRepository(AuditLog)
      : this.getRepository();
    await repository.save(
      repository.create({
        ...event,
        description: event.description ?? null,
        previousValues: this.sanitizeSnapshot(event.previousValues ?? null),
        newValues: this.sanitizeSnapshot(event.newValues ?? null),
      }),
    );
  }

  async findAll(query: AuditLogQueryDto): Promise<AuditLogListResult> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('auditLog')
      .orderBy('auditLog.occurredAt', 'DESC')
      .addOrderBy('auditLog.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.action) {
      queryBuilder.andWhere('auditLog.action = :action', {
        action: query.action.trim().toUpperCase(),
      });
    }
    if (query.entityType) {
      queryBuilder.andWhere('auditLog.entityType = :entityType', {
        entityType: query.entityType.trim().toUpperCase(),
      });
    }
    if (query.actorUserProfileId) {
      queryBuilder.andWhere(
        'auditLog.actorUserProfileId = :actorUserProfileId',
        { actorUserProfileId: query.actorUserProfileId },
      );
    }
    if (query.entityId) {
      queryBuilder.andWhere('auditLog.entityId = :entityId', {
        entityId: query.entityId,
      });
    }
    if (query.from) {
      queryBuilder.andWhere('auditLog.occurredAt >= :from', {
        from: new Date(query.from),
      });
    }
    if (query.to) {
      queryBuilder.andWhere('auditLog.occurredAt <= :to', {
        to: new Date(query.to),
      });
    }

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    const entry = await this.getRepository().findOneBy({ id });
    if (!entry) {
      throw new NotFoundException(`Audit log with ID ${id} was not found`);
    }
    return entry;
  }

  async recordResultCreated(
    manager: EntityManager,
    result: RaceResult,
    actorUserProfileId: string,
  ): Promise<void> {
    await this.record(
      manager,
      'RESULT_CREATED',
      result,
      null,
      result,
      actorUserProfileId,
    );
  }

  async recordResultCorrected(
    manager: EntityManager,
    previousResult: RaceResult,
    result: RaceResult,
    actorUserProfileId: string,
  ): Promise<void> {
    await this.record(
      manager,
      'RESULT_CORRECTED',
      result,
      previousResult,
      result,
      actorUserProfileId,
    );
  }

  private async record(
    manager: EntityManager,
    action: 'RESULT_CREATED' | 'RESULT_CORRECTED',
    result: RaceResult,
    previousResult: RaceResult | null,
    currentResult: RaceResult,
    actorUserProfileId: string,
  ): Promise<void> {
    await this.recordEvent(
      {
        actorUserProfileId,
        action,
        entityType: 'RACE_RESULT',
        entityId: result.id,
        description:
          action === 'RESULT_CREATED'
            ? 'Race result recorded'
            : 'Race result corrected',
        previousValues: previousResult
          ? this.resultSnapshot(previousResult)
          : null,
        newValues: this.resultSnapshot(currentResult),
      },
      manager,
    );
  }

  private getRepository(): Repository<AuditLog> {
    if (!this.auditLogsRepository) {
      throw new Error('AuditLog repository is unavailable');
    }
    return this.auditLogsRepository;
  }

  private sanitizeSnapshot(
    snapshot: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!snapshot) return null;
    return Object.fromEntries(
      Object.entries(snapshot)
        .filter(
          ([key]) => !/(password|token|secret|authorization|cookie)/i.test(key),
        )
        .map(([key, value]) => [key, value]),
    );
  }

  private resultSnapshot(result: RaceResult): Record<string, unknown> {
    return {
      raceId: result.raceId,
      registrationId: result.registrationId,
      startingPosition: result.startingPosition,
      finalPosition: result.finalPosition,
      rawTimeMs: result.rawTimeMs,
      penaltyTimeMs: result.penaltyTimeMs,
      finalTimeMs: result.finalTimeMs,
      status: result.status,
      notes: result.notes,
    };
  }
}
