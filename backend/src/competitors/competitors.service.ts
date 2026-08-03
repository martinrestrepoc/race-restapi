import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { CompetitorQueryDto } from './dto/competitor-query.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { Competitor } from './entities/competitor.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { AuditService } from '../audit/audit.service';

export interface CompetitorListResult {
  items: Competitor[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const allowedStatusTransitions: Record<
  CompetitorStatus,
  readonly CompetitorStatus[]
> = {
  [CompetitorStatus.ACTIVE]: [
    CompetitorStatus.SUSPENDED,
    CompetitorStatus.RETIRED,
  ],
  [CompetitorStatus.SUSPENDED]: [
    CompetitorStatus.ACTIVE,
    CompetitorStatus.RETIRED,
  ],
  [CompetitorStatus.RETIRED]: [],
};

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === code
  );
}

@Injectable()
export class CompetitorsService {
  constructor(
    @InjectRepository(Competitor)
    private readonly competitorsRepository: Repository<Competitor>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(RaceRegistration)
    private readonly registrationsRepository: Repository<RaceRegistration>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateCompetitorDto,
    actorUserProfileId: string,
  ): Promise<Competitor> {
    const competitor = this.competitorsRepository.create(dto);
    const saved = await this.save(competitor);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'COMPETITOR_CREATED',
      entityType: 'COMPETITOR',
      entityId: saved.id,
      description: 'Competitor created',
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async findAll(query: CompetitorQueryDto): Promise<CompetitorListResult> {
    const queryBuilder = this.competitorsRepository
      .createQueryBuilder('competitor')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('competitor.status = :status', {
        status: query.status,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('competitor.type = :type', { type: query.type });
    }

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(competitor.name ILIKE :search OR competitor.nickname ILIKE :search OR competitor.origin ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(
      `competitor.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('competitor.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<Competitor> {
    const competitor = await this.competitorsRepository.findOne({
      where: { id },
    });

    if (!competitor) {
      throw new NotFoundException(`Competitor with ID ${id} was not found`);
    }

    return competitor;
  }

  async update(
    id: string,
    dto: UpdateCompetitorDto,
    actorUserProfileId: string,
  ): Promise<Competitor> {
    const competitor = await this.findOne(id);
    const previousValues = this.snapshot(competitor);
    this.competitorsRepository.merge(competitor, dto);
    const saved = await this.save(competitor);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'COMPETITOR_UPDATED',
      entityType: 'COMPETITOR',
      entityId: saved.id,
      description: 'Competitor updated',
      previousValues,
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async updateStatus(
    id: string,
    targetStatus: CompetitorStatus,
    actorUserProfileId: string,
  ): Promise<Competitor> {
    const competitor = await this.findOne(id);
    const allowedTargets = allowedStatusTransitions[competitor.status];

    if (!allowedTargets.includes(targetStatus)) {
      throw new ConflictException(
        `Competitor status cannot transition from ${competitor.status} to ${targetStatus}`,
      );
    }

    const previousValues = this.snapshot(competitor);
    competitor.status = targetStatus;
    const saved = await this.competitorsRepository.save(competitor);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'COMPETITOR_STATUS_CHANGED',
      entityType: 'COMPETITOR',
      entityId: saved.id,
      description: 'Competitor status changed',
      previousValues,
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async remove(id: string, actorUserProfileId: string): Promise<void> {
    const competitor = await this.findOne(id);
    const previousValues = this.snapshot(competitor);
    const [hasMembershipHistory, hasRegistrationHistory] = await Promise.all([
      this.teamMembersRepository.exists({ where: { competitorId: id } }),
      this.registrationsRepository.exists({ where: { competitorId: id } }),
    ]);

    if (hasMembershipHistory || hasRegistrationHistory) {
      if (competitor.status !== CompetitorStatus.RETIRED) {
        competitor.status = CompetitorStatus.RETIRED;
        await this.competitorsRepository.save(competitor);
      }
      await this.auditService.recordEvent({
        actorUserProfileId,
        action: 'COMPETITOR_RETIRED',
        entityType: 'COMPETITOR',
        entityId: competitor.id,
        description: 'Competitor retired because history must be preserved',
        previousValues,
        newValues: this.snapshot(competitor),
      });
      return;
    }

    await this.competitorsRepository.remove(competitor);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'COMPETITOR_DELETED',
      entityType: 'COMPETITOR',
      entityId: id,
      description: 'Competitor physically deleted without history',
      previousValues,
    });
  }

  private async save(competitor: Competitor): Promise<Competitor> {
    try {
      return await this.competitorsRepository.save(competitor);
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          `Competitor nickname ${competitor.nickname} is already in use`,
        );
      }

      throw error;
    }
  }

  private snapshot(competitor: Competitor): Record<string, unknown> {
    return {
      name: competitor.name,
      nickname: competitor.nickname,
      type: competitor.type,
      dateOfBirth: competitor.dateOfBirth,
      weight: competitor.weight,
      height: competitor.height,
      origin: competitor.origin,
      status: competitor.status,
    };
  }
}
