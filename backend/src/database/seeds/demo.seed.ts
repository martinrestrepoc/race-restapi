import type { DataSource, EntityManager } from 'typeorm';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { RaceStatus } from '../../common/enums/race-status.enum';
import { RaceType } from '../../common/enums/race-type.enum';
import { RegistrationStatus } from '../../common/enums/registration-status.enum';
import { ResultStatus } from '../../common/enums/result-status.enum';
import { TeamStatus } from '../../common/enums/team-status.enum';
import { Competitor } from '../../competitors/entities/competitor.entity';
import { Race } from '../../races/entities/race.entity';
import { RaceRegistration } from '../../registrations/entities/race-registration.entity';
import { RaceResult } from '../../results/entities/race-result.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { Team } from '../../teams/entities/team.entity';

export const DEMO_SEED_IDS = Object.freeze({
  competitors: [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009',
  ],
  teams: [
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
  ],
  teamMembers: [
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000006',
  ],
  races: [
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
  ],
  registrations: [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000004',
    '50000000-0000-4000-8000-000000000005',
  ],
  results: [
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000005',
  ],
});

export interface DemoSeedSummary {
  competitors: number;
  teams: number;
  teamMembers: number;
  races: number;
  registrations: number;
  results: number;
  userProfiles: number;
}

const CREATED_AT = new Date('2026-07-01T12:00:00.000Z');
const COMPLETED_RACE_ID = DEMO_SEED_IDS.races[2];

export async function seedDemoData(
  dataSource: DataSource,
): Promise<DemoSeedSummary> {
  return dataSource.transaction(async (manager) => {
    await saveCompetitors(manager);
    await saveTeams(manager);
    await saveTeamMembers(manager);
    await saveRaces(manager);
    await saveRegistrations(manager);
    await saveResults(manager);

    return {
      competitors: DEMO_SEED_IDS.competitors.length,
      teams: DEMO_SEED_IDS.teams.length,
      teamMembers: DEMO_SEED_IDS.teamMembers.length,
      races: DEMO_SEED_IDS.races.length,
      registrations: DEMO_SEED_IDS.registrations.length,
      results: DEMO_SEED_IDS.results.length,
      userProfiles: 0,
    };
  });
}

async function saveCompetitors(manager: EntityManager): Promise<void> {
  const definitions = [
    [
      'Ayla Stonefoot',
      'GraniteDash',
      CompetitorType.DWARF,
      '1994-06-12',
      78.5,
      132.4,
      'Iron Hills',
    ],
    [
      'Borin Copperstride',
      'CopperStride',
      CompetitorType.DWARF,
      '1991-09-03',
      82.2,
      135.1,
      'Red Mountains',
    ],
    [
      'Dagna Flint',
      'FlintSpark',
      CompetitorType.DWARF,
      '1998-02-19',
      69.8,
      128.6,
      'Stone Valley',
    ],
    [
      'Eirik Deeptrack',
      'DeepTrack',
      CompetitorType.DWARF,
      '1990-11-28',
      85.4,
      137.2,
      'Deep Mines',
    ],
    [
      'Freya Amberhelm',
      'AmberHelm',
      CompetitorType.DWARF,
      '1996-04-07',
      73.6,
      130.8,
      'Amber Ridge',
    ],
    [
      'Sahara Wind',
      'SaharaWind',
      CompetitorType.CAMEL,
      '2014-03-21',
      548.3,
      194.5,
      'Guajira Desert',
    ],
    [
      'Dune Voyager',
      'DuneVoyager',
      CompetitorType.CAMEL,
      '2016-08-14',
      521.7,
      188.9,
      'Tatacoa Desert',
    ],
    [
      'Mara Swift',
      'MaraSwift',
      CompetitorType.MEDIUM,
      '1997-01-30',
      91.2,
      158.3,
      'EIA Plateau',
    ],
    [
      'Nilo Ridge',
      'NiloRidge',
      CompetitorType.MEDIUM,
      '1993-12-05',
      96.4,
      162.7,
      'Aburra Valley',
    ],
  ] as const;

  const competitors = definitions.map(
    ([name, nickname, type, dateOfBirth, weight, height, origin], index) =>
      manager.getRepository(Competitor).create({
        id: DEMO_SEED_IDS.competitors[index],
        name,
        nickname,
        type,
        dateOfBirth,
        weight,
        height,
        origin,
        status: CompetitorStatus.ACTIVE,
        registeredAt: CREATED_AT,
        updatedAt: CREATED_AT,
      }),
  );
  await manager.getRepository(Competitor).save(competitors);
}

async function saveTeams(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(Team);
  await repository.save([
    repository.create({
      id: DEMO_SEED_IDS.teams[0],
      name: 'EIA Trailblazers',
      description: 'Precision and endurance from the eastern ridge.',
      responsiblePerson: 'Coach Helena Rios',
      status: TeamStatus.ACTIVE,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }),
    repository.create({
      id: DEMO_SEED_IDS.teams[1],
      name: 'Desert Stone Alliance',
      description: 'A mixed team built for long and technical courses.',
      responsiblePerson: 'Coach Tomas Vega',
      status: TeamStatus.ACTIVE,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }),
  ]);
}

async function saveTeamMembers(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(TeamMember);
  const memberships = [
    [0, 0],
    [0, 1],
    [0, 7],
    [1, 2],
    [1, 5],
    [1, 8],
  ] as const;
  await repository.save(
    memberships.map(([teamIndex, competitorIndex], index) =>
      repository.create({
        id: DEMO_SEED_IDS.teamMembers[index],
        teamId: DEMO_SEED_IDS.teams[teamIndex],
        competitorId: DEMO_SEED_IDS.competitors[competitorIndex],
        joinedAt: CREATED_AT,
        leftAt: null,
      }),
    ),
  );
}

async function saveRaces(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(Race);
  await repository.save([
    repository.create({
      id: DEMO_SEED_IDS.races[0],
      name: 'Founders Team Relay',
      description: 'Draft team race for the next league exhibition.',
      scheduledAt: new Date('2035-09-20T15:00:00.000Z'),
      startLocation: 'EIA Main Gate',
      finishLocation: 'EIA Athletics Field',
      distanceMeters: 3200,
      maxParticipants: 6,
      type: RaceType.TEAM,
      status: RaceStatus.DRAFT,
      organizerUserProfileId: null,
      registrationDeadline: new Date('2035-09-18T23:59:59.000Z'),
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }),
    repository.create({
      id: DEMO_SEED_IDS.races[1],
      name: 'Highland Mixed Challenge',
      description: 'Open mixed race accepting eligible league participants.',
      scheduledAt: new Date('2035-10-12T14:00:00.000Z'),
      startLocation: 'Highland Trailhead',
      finishLocation: 'Summit Pavilion',
      distanceMeters: 5000,
      maxParticipants: 12,
      type: RaceType.MIXED,
      status: RaceStatus.OPEN_FOR_REGISTRATION,
      organizerUserProfileId: null,
      registrationDeadline: new Date('2035-10-10T23:59:59.000Z'),
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }),
    repository.create({
      id: COMPLETED_RACE_ID,
      name: 'Great EIA Opening Sprint',
      description: 'Official completed race used for standings demonstration.',
      scheduledAt: new Date('2026-07-20T14:00:00.000Z'),
      startLocation: 'EIA Central Plaza',
      finishLocation: 'Camelid Arena',
      distanceMeters: 1500,
      maxParticipants: 8,
      type: RaceType.INDIVIDUAL,
      status: RaceStatus.COMPLETED,
      organizerUserProfileId: null,
      registrationDeadline: new Date('2026-07-18T23:59:59.000Z'),
      createdAt: CREATED_AT,
      updatedAt: new Date('2026-07-20T15:00:00.000Z'),
    }),
  ]);
}

async function saveRegistrations(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(RaceRegistration);
  await repository.save(
    DEMO_SEED_IDS.registrations.map((id, index) =>
      repository.create({
        id,
        raceId: COMPLETED_RACE_ID,
        competitorId: DEMO_SEED_IDS.competitors[index],
        teamId: null,
        status: RegistrationStatus.APPROVED,
        startingPosition: index + 1,
        validationNotes: 'Reproducible academic demonstration entry.',
        performedByUserProfileId: null,
        registeredAt: new Date('2026-07-10T12:00:00.000Z'),
        updatedAt: new Date('2026-07-11T12:00:00.000Z'),
      }),
    ),
  );
}

async function saveResults(manager: EntityManager): Promise<void> {
  const repository = manager.getRepository(RaceResult);
  const finalTimes = [72_450, 73_120, 74_800, 76_300, 78_050];
  await repository.save(
    DEMO_SEED_IDS.results.map((id, index) =>
      repository.create({
        id,
        raceId: COMPLETED_RACE_ID,
        registrationId: DEMO_SEED_IDS.registrations[index],
        startingPosition: index + 1,
        finalPosition: index + 1,
        rawTimeMs: finalTimes[index] - (index === 2 ? 500 : 0),
        penaltyTimeMs: index === 2 ? 500 : 0,
        finalTimeMs: finalTimes[index],
        status: ResultStatus.FINISHED,
        notes: index === 2 ? 'Includes an official 500 ms penalty.' : null,
        recordedByUserProfileId: null,
        recordedAt: new Date('2026-07-20T14:30:00.000Z'),
        updatedAt: new Date('2026-07-20T14:30:00.000Z'),
      }),
    ),
  );
}
