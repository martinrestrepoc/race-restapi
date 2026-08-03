import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaceStatus } from '../common/enums/race-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { CreateRaceDto } from './dto/create-race.dto';
import { RaceQueryDto } from './dto/race-query.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { Race } from './entities/race.entity';
import { RaceRegistration } from '../registrations/entities/race-registration.entity';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { RaceResult } from '../results/entities/race-result.entity';
import { ClockService } from '../common/time/clock.service';
import { AuditService } from '../audit/audit.service';

export interface RaceListResult {
  items: Race[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const allowedStatusTransitions: Record<RaceStatus, readonly RaceStatus[]> = {
  [RaceStatus.DRAFT]: [RaceStatus.OPEN_FOR_REGISTRATION, RaceStatus.CANCELLED],
  [RaceStatus.OPEN_FOR_REGISTRATION]: [RaceStatus.CLOSED, RaceStatus.CANCELLED],
  [RaceStatus.CLOSED]: [RaceStatus.IN_PROGRESS, RaceStatus.CANCELLED],
  [RaceStatus.IN_PROGRESS]: [RaceStatus.COMPLETED, RaceStatus.CANCELLED],
  [RaceStatus.COMPLETED]: [],
  [RaceStatus.CANCELLED]: [],
};

@Injectable()
export class RacesService {
  constructor(
    @InjectRepository(Race)
    private readonly racesRepository: Repository<Race>,
    @InjectRepository(RaceRegistration)
    private readonly registrationsRepository: Repository<RaceRegistration>,
    @InjectRepository(RaceResult)
    private readonly resultsRepository: Repository<RaceResult>,
    private readonly clock: ClockService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateRaceDto,
    organizerUserProfileId: string,
  ): Promise<Race> {
    this.validateSchedule(dto.scheduledAt, dto.registrationDeadline, true);
    const race = this.racesRepository.create({
      ...dto,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      registrationDeadline: new Date(dto.registrationDeadline),
      status: RaceStatus.DRAFT,
      organizerUserProfileId,
    });
    const saved = await this.racesRepository.save(race);
    await this.auditService.recordEvent({
      actorUserProfileId: organizerUserProfileId,
      action: 'RACE_CREATED',
      entityType: 'RACE',
      entityId: saved.id,
      description: 'Race created',
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async findAll(query: RaceQueryDto): Promise<RaceListResult> {
    const queryBuilder = this.racesRepository
      .createQueryBuilder('race')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status) {
      queryBuilder.andWhere('race.status = :status', { status: query.status });
    }
    if (query.type) {
      queryBuilder.andWhere('race.type = :type', { type: query.type });
    }
    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(race.name ILIKE :search OR race.description ILIKE :search OR race.startLocation ILIKE :search OR race.finishLocation ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    queryBuilder.orderBy(
      `race.${query.sortBy}`,
      query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy('race.id', 'ASC');

    const [items, totalItems] = await queryBuilder.getManyAndCount();
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<Race> {
    const race = await this.racesRepository.findOneBy({ id });
    if (!race) {
      throw new NotFoundException(`Race with ID ${id} was not found`);
    }
    return race;
  }

  async update(
    id: string,
    dto: UpdateRaceDto,
    actorUserProfileId: string,
  ): Promise<Race> {
    const race = await this.findOne(id);
    if (race.status !== RaceStatus.DRAFT) {
      throw new ConflictException(
        `Race in status ${race.status} cannot be edited`,
      );
    }
    const previousValues = this.snapshot(race);
    this.validateSchedule(dto.scheduledAt, dto.registrationDeadline, false);
    this.racesRepository.merge(race, {
      ...dto,
      description: dto.description ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      registrationDeadline: new Date(dto.registrationDeadline),
    });
    const saved = await this.racesRepository.save(race);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'RACE_UPDATED',
      entityType: 'RACE',
      entityId: saved.id,
      description: 'Race draft updated',
      previousValues,
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async updateStatus(
    id: string,
    targetStatus: RaceStatus,
    actorUserProfileId: string,
  ): Promise<Race> {
    const race = await this.findOne(id);
    const previousValues = this.snapshot(race);
    if (!allowedStatusTransitions[race.status].includes(targetStatus)) {
      throw new ConflictException(
        `Race status cannot transition from ${race.status} to ${targetStatus}`,
      );
    }
    if (targetStatus === RaceStatus.OPEN_FOR_REGISTRATION) {
      this.validateSchedule(
        race.scheduledAt.toISOString(),
        race.registrationDeadline.toISOString(),
        true,
      );
    }
    if (targetStatus === RaceStatus.IN_PROGRESS) {
      const approvedParticipants = await this.registrationsRepository.count({
        where: { raceId: race.id, status: RegistrationStatus.APPROVED },
      });
      if (approvedParticipants < 2) {
        throw new ConflictException(
          'A race requires at least two approved participants to start',
        );
      }
    }
    if (targetStatus === RaceStatus.COMPLETED) {
      const [approvedParticipants, recordedResults] = await Promise.all([
        this.registrationsRepository.count({
          where: { raceId: race.id, status: RegistrationStatus.APPROVED },
        }),
        this.resultsRepository.count({ where: { raceId: race.id } }),
      ]);
      if (
        approvedParticipants === 0 ||
        recordedResults !== approvedParticipants
      ) {
        throw new ConflictException(
          'Every approved participant requires a result before completing the race',
        );
      }
    }
    race.status = targetStatus;
    const saved = await this.racesRepository.save(race);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action:
        targetStatus === RaceStatus.CANCELLED
          ? 'RACE_CANCELLED'
          : 'RACE_STATUS_CHANGED',
      entityType: 'RACE',
      entityId: saved.id,
      description: 'Race status changed',
      previousValues,
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async remove(id: string, actorUserProfileId: string): Promise<void> {
    const race = await this.findOne(id);
    const previousValues = this.snapshot(race);
    const hasRegistrations = await this.registrationsRepository.exists({
      where: { raceId: id },
    });
    if (race.status === RaceStatus.DRAFT && !hasRegistrations) {
      await this.racesRepository.remove(race);
      await this.auditService.recordEvent({
        actorUserProfileId,
        action: 'RACE_DELETED',
        entityType: 'RACE',
        entityId: id,
        description: 'Draft race physically deleted without registrations',
        previousValues,
      });
      return;
    }
    if (
      race.status === RaceStatus.COMPLETED ||
      race.status === RaceStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Race in status ${race.status} cannot be deleted`,
      );
    }
    race.status = RaceStatus.CANCELLED;
    await this.racesRepository.save(race);
    await this.auditService.recordEvent({
      actorUserProfileId,
      action: 'RACE_CANCELLED',
      entityType: 'RACE',
      entityId: race.id,
      description: 'Race cancelled instead of deleted to preserve history',
      previousValues,
      newValues: this.snapshot(race),
    });
  }

  private validateSchedule(
    scheduledAtValue: string,
    deadlineValue: string,
    requireFutureStart: boolean,
  ): void {
    const scheduledAt = new Date(scheduledAtValue);
    const deadline = new Date(deadlineValue);
    if (
      requireFutureStart &&
      scheduledAt.getTime() <= this.clock.now().getTime()
    ) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
    if (deadline.getTime() >= scheduledAt.getTime()) {
      throw new BadRequestException(
        'registrationDeadline must be earlier than scheduledAt',
      );
    }
  }

  private snapshot(race: Race): Record<string, unknown> {
    return {
      name: race.name,
      description: race.description,
      scheduledAt: race.scheduledAt,
      startLocation: race.startLocation,
      finishLocation: race.finishLocation,
      distanceMeters: race.distanceMeters,
      maxParticipants: race.maxParticipants,
      type: race.type,
      status: race.status,
      registrationDeadline: race.registrationDeadline,
      organizerUserProfileId: race.organizerUserProfileId,
    };
  }
}
