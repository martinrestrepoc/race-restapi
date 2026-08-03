import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, QueryFailedError, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { RaceStatus } from '../common/enums/race-status.enum';
import { RaceType } from '../common/enums/race-type.enum';
import { RegistrationStatus } from '../common/enums/registration-status.enum';
import { TeamStatus } from '../common/enums/team-status.enum';
import { Competitor } from '../competitors/entities/competitor.entity';
import { Race } from '../races/entities/race.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationQueryDto } from './dto/registration-query.dto';
import { RaceRegistration } from './entities/race-registration.entity';
import { ClockService } from '../common/time/clock.service';
import { AuditService } from '../audit/audit.service';

export interface RegistrationListResult {
  items: RaceRegistration[];
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
export class RegistrationsService {
  constructor(
    @InjectRepository(RaceRegistration)
    private readonly registrationsRepository: Repository<RaceRegistration>,
    @InjectRepository(Race)
    private readonly racesRepository: Repository<Race>,
    private readonly dataSource: DataSource,
    private readonly clock: ClockService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    raceId: string,
    dto: CreateRegistrationDto,
    performedByUserProfileId: string,
  ): Promise<RaceRegistration> {
    if (Boolean(dto.competitorId) === Boolean(dto.teamId)) {
      throw new BadRequestException(
        'Exactly one of competitorId or teamId must be provided',
      );
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        const registrations = manager.getRepository(RaceRegistration);
        const races = manager.getRepository(Race);
        const competitors = manager.getRepository(Competitor);
        const teams = manager.getRepository(Team);
        const memberships = manager.getRepository(TeamMember);
        const race = await races.findOne({
          where: { id: raceId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!race) {
          throw new NotFoundException(`Race with ID ${raceId} was not found`);
        }
        this.ensureRegistrationWindowOpen(race);

        if (dto.competitorId) {
          await this.validateIndividual(
            race,
            dto.competitorId,
            competitors,
            registrations,
            memberships,
          );
        } else {
          await this.validateTeam(race, dto.teamId!, teams, registrations);
        }

        const registration = registrations.create({
          raceId,
          race,
          competitorId: dto.competitorId ?? null,
          teamId: dto.teamId ?? null,
          status: RegistrationStatus.PENDING,
          startingPosition: null,
          validationNotes: null,
          performedByUserProfileId,
        });

        const saved = await registrations.save(registration);
        await this.auditService.recordEvent(
          {
            actorUserProfileId: performedByUserProfileId,
            action: 'REGISTRATION_CREATED',
            entityType: 'RACE_REGISTRATION',
            entityId: saved.id,
            description: 'Race registration created',
            newValues: this.snapshot(saved),
          },
          manager,
        );
        return saved;
      });
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          'Participant is already registered in this race',
        );
      }
      throw error;
    }
  }

  async findAllForRace(
    raceId: string,
    query: RegistrationQueryDto,
  ): Promise<RegistrationListResult> {
    if (!(await this.racesRepository.existsBy({ id: raceId }))) {
      throw new NotFoundException(`Race with ID ${raceId} was not found`);
    }
    const where = query.status ? { raceId, status: query.status } : { raceId };
    const [items, totalItems] = await this.registrationsRepository.findAndCount(
      {
        where,
        order: { registeredAt: 'DESC', id: 'ASC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      },
    );
    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit),
    };
  }

  async findOne(id: string): Promise<RaceRegistration> {
    const registration = await this.registrationsRepository.findOne({
      where: { id },
      relations: { race: true },
    });
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} was not found`);
    }
    return registration;
  }

  async approve(
    id: string,
    startingPosition: number,
    performedByUserProfileId: string,
  ): Promise<RaceRegistration> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const registrations = manager.getRepository(RaceRegistration);
        const races = manager.getRepository(Race);
        const registration = await registrations.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!registration) {
          throw new NotFoundException(
            `Registration with ID ${id} was not found`,
          );
        }
        if (registration.status !== RegistrationStatus.PENDING) {
          throw new ConflictException(
            'Only a pending registration can be approved',
          );
        }
        const race = await races.findOne({
          where: { id: registration.raceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!race)
          throw new NotFoundException('Registration race was not found');
        this.ensureRegistrationWindowOpen(race);
        const approvedCount = await registrations.count({
          where: { raceId: race.id, status: RegistrationStatus.APPROVED },
        });
        if (approvedCount >= race.maxParticipants) {
          throw new ConflictException(
            `Race ${race.id} has reached its capacity`,
          );
        }
        if (
          await registrations.exists({
            where: { raceId: race.id, startingPosition },
          })
        ) {
          throw new ConflictException(
            `Starting position ${startingPosition} is already assigned`,
          );
        }
        const previousValues = this.snapshot(registration);
        registration.status = RegistrationStatus.APPROVED;
        registration.startingPosition = startingPosition;
        registration.validationNotes = null;
        registration.performedByUserProfileId = performedByUserProfileId;
        const saved = await registrations.save(registration);
        await this.auditService.recordEvent(
          {
            actorUserProfileId: performedByUserProfileId,
            action: 'REGISTRATION_APPROVED',
            entityType: 'RACE_REGISTRATION',
            entityId: saved.id,
            description: 'Race registration approved',
            previousValues,
            newValues: this.snapshot(saved),
          },
          manager,
        );
        return saved;
      });
    } catch (error) {
      if (hasPostgresErrorCode(error, '23505')) {
        throw new ConflictException(
          `Starting position ${startingPosition} is already assigned`,
        );
      }
      throw error;
    }
  }

  async reject(
    id: string,
    reason: string,
    performedByUserProfileId: string,
  ): Promise<RaceRegistration> {
    const registration = await this.findOne(id);
    if (registration.status !== RegistrationStatus.PENDING) {
      throw new ConflictException(
        'Only a pending registration can be rejected',
      );
    }
    const previousValues = this.snapshot(registration);
    registration.status = RegistrationStatus.REJECTED;
    registration.validationNotes = reason;
    registration.performedByUserProfileId = performedByUserProfileId;
    const saved = await this.registrationsRepository.save(registration);
    await this.auditService.recordEvent({
      actorUserProfileId: performedByUserProfileId,
      action: 'REGISTRATION_REJECTED',
      entityType: 'RACE_REGISTRATION',
      entityId: saved.id,
      description: 'Race registration rejected',
      previousValues,
      newValues: this.snapshot(saved),
    });
    return saved;
  }

  async cancel(id: string, performedByUserProfileId: string): Promise<void> {
    const registration = await this.findOne(id);
    if (
      registration.status === RegistrationStatus.REJECTED ||
      registration.status === RegistrationStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Registration in status ${registration.status} cannot be cancelled`,
      );
    }
    this.ensureRegistrationWindowOpen(registration.race);
    const previousValues = this.snapshot(registration);
    registration.status = RegistrationStatus.CANCELLED;
    registration.performedByUserProfileId = performedByUserProfileId;
    await this.registrationsRepository.save(registration);
    await this.auditService.recordEvent({
      actorUserProfileId: performedByUserProfileId,
      action: 'REGISTRATION_CANCELLED',
      entityType: 'RACE_REGISTRATION',
      entityId: registration.id,
      description: 'Race registration cancelled',
      previousValues,
      newValues: this.snapshot(registration),
    });
  }

  private ensureRegistrationWindowOpen(race: Race): void {
    if (
      race.status !== RaceStatus.OPEN_FOR_REGISTRATION ||
      race.registrationDeadline.getTime() <= this.clock.now().getTime()
    ) {
      throw new ConflictException('Race registration window is closed');
    }
  }

  private snapshot(registration: RaceRegistration): Record<string, unknown> {
    return {
      raceId: registration.raceId,
      competitorId: registration.competitorId,
      teamId: registration.teamId,
      status: registration.status,
      startingPosition: registration.startingPosition,
      validationNotes: registration.validationNotes,
      performedByUserProfileId: registration.performedByUserProfileId,
    };
  }

  private async validateIndividual(
    race: Race,
    competitorId: string,
    competitorsRepository: Repository<Competitor>,
    registrationsRepository: Repository<RaceRegistration>,
    teamMembersRepository: Repository<TeamMember>,
  ): Promise<void> {
    if (race.type === RaceType.TEAM) {
      throw new ConflictException(
        'Individual participants cannot enter a team race',
      );
    }
    const competitor = await competitorsRepository.findOneBy({
      id: competitorId,
    });
    if (!competitor) {
      throw new NotFoundException(
        `Competitor with ID ${competitorId} was not found`,
      );
    }
    if (competitor.status !== CompetitorStatus.ACTIVE) {
      throw new ConflictException(`Competitor ${competitorId} is not active`);
    }
    if (
      await registrationsRepository.exists({
        where: { raceId: race.id, competitorId },
      })
    ) {
      throw new ConflictException(
        'Participant is already registered in this race',
      );
    }
    const memberships = await teamMembersRepository.find({
      where: { competitorId, leftAt: IsNull() },
    });
    const teamIds = memberships.map((membership) => membership.teamId);
    if (
      teamIds.length > 0 &&
      (await registrationsRepository.exists({
        where: { raceId: race.id, teamId: In(teamIds) },
      }))
    ) {
      throw new ConflictException(
        'Competitor is already participating through a registered team',
      );
    }
  }

  private async validateTeam(
    race: Race,
    teamId: string,
    teamsRepository: Repository<Team>,
    registrationsRepository: Repository<RaceRegistration>,
  ): Promise<void> {
    if (race.type === RaceType.INDIVIDUAL) {
      throw new ConflictException('Teams cannot enter an individual race');
    }
    const team = await teamsRepository.findOne({
      where: { id: teamId },
      relations: { members: { competitor: true } },
    });
    if (!team)
      throw new NotFoundException(`Team with ID ${teamId} was not found`);
    if (team.status !== TeamStatus.ACTIVE) {
      throw new ConflictException(`Team ${teamId} is not active`);
    }
    const activeMembers = (team.members ?? []).filter(
      (member) => member.leftAt === null,
    );
    if (activeMembers.length === 0) {
      throw new ConflictException(`Team ${teamId} has no active members`);
    }
    if (
      activeMembers.some(
        (member) => member.competitor.status !== CompetitorStatus.ACTIVE,
      )
    ) {
      throw new ConflictException(`Team ${teamId} has an ineligible member`);
    }
    if (
      await registrationsRepository.exists({
        where: { raceId: race.id, teamId },
      })
    ) {
      throw new ConflictException(
        'Participant is already registered in this race',
      );
    }
    const competitorIds = activeMembers.map((member) => member.competitorId);
    if (
      await registrationsRepository.exists({
        where: { raceId: race.id, competitorId: In(competitorIds) },
      })
    ) {
      throw new ConflictException(
        'A team member is already registered individually in this race',
      );
    }
  }
}
