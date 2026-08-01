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
    @InjectRepository(Competitor)
    private readonly competitorsRepository: Repository<Competitor>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    raceId: string,
    dto: CreateRegistrationDto,
  ): Promise<RaceRegistration> {
    if (Boolean(dto.competitorId) === Boolean(dto.teamId)) {
      throw new BadRequestException(
        'Exactly one of competitorId or teamId must be provided',
      );
    }
    const race = await this.racesRepository.findOneBy({ id: raceId });
    if (!race)
      throw new NotFoundException(`Race with ID ${raceId} was not found`);
    this.ensureRegistrationWindowOpen(race);

    if (dto.competitorId) {
      await this.validateIndividual(race, dto.competitorId);
    } else {
      await this.validateTeam(race, dto.teamId!);
    }

    const registration = this.registrationsRepository.create({
      raceId,
      race,
      competitorId: dto.competitorId ?? null,
      teamId: dto.teamId ?? null,
      status: RegistrationStatus.PENDING,
      startingPosition: null,
      validationNotes: null,
      performedByUserProfileId: null,
    });
    try {
      return await this.registrationsRepository.save(registration);
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
        registration.status = RegistrationStatus.APPROVED;
        registration.startingPosition = startingPosition;
        registration.validationNotes = null;
        return registrations.save(registration);
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

  async reject(id: string, reason: string): Promise<RaceRegistration> {
    const registration = await this.findOne(id);
    if (registration.status !== RegistrationStatus.PENDING) {
      throw new ConflictException(
        'Only a pending registration can be rejected',
      );
    }
    registration.status = RegistrationStatus.REJECTED;
    registration.validationNotes = reason;
    return this.registrationsRepository.save(registration);
  }

  async cancel(id: string): Promise<void> {
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
    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationsRepository.save(registration);
  }

  private ensureRegistrationWindowOpen(race: Race): void {
    if (
      race.status !== RaceStatus.OPEN_FOR_REGISTRATION ||
      race.registrationDeadline.getTime() <= Date.now()
    ) {
      throw new ConflictException('Race registration window is closed');
    }
  }

  private async validateIndividual(
    race: Race,
    competitorId: string,
  ): Promise<void> {
    if (race.type === RaceType.TEAM) {
      throw new ConflictException(
        'Individual participants cannot enter a team race',
      );
    }
    const competitor = await this.competitorsRepository.findOneBy({
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
      await this.registrationsRepository.exists({
        where: { raceId: race.id, competitorId },
      })
    ) {
      throw new ConflictException(
        'Participant is already registered in this race',
      );
    }
    const memberships = await this.teamMembersRepository.find({
      where: { competitorId, leftAt: IsNull() },
    });
    const teamIds = memberships.map((membership) => membership.teamId);
    if (
      teamIds.length > 0 &&
      (await this.registrationsRepository.exists({
        where: { raceId: race.id, teamId: In(teamIds) },
      }))
    ) {
      throw new ConflictException(
        'Competitor is already participating through a registered team',
      );
    }
  }

  private async validateTeam(race: Race, teamId: string): Promise<void> {
    if (race.type === RaceType.INDIVIDUAL) {
      throw new ConflictException('Teams cannot enter an individual race');
    }
    const team = await this.teamsRepository.findOne({
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
      await this.registrationsRepository.exists({
        where: { raceId: race.id, teamId },
      })
    ) {
      throw new ConflictException(
        'Participant is already registered in this race',
      );
    }
    const competitorIds = activeMembers.map((member) => member.competitorId);
    if (
      await this.registrationsRepository.exists({
        where: { raceId: race.id, competitorId: In(competitorIds) },
      })
    ) {
      throw new ConflictException(
        'A team member is already registered individually in this race',
      );
    }
  }
}
