import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/auth/enums/app-role.enum';
import { CompetitorStatus } from '../src/common/enums/competitor-status.enum';
import { CompetitorType } from '../src/common/enums/competitor-type.enum';
import { RaceStatus } from '../src/common/enums/race-status.enum';
import { RaceType } from '../src/common/enums/race-type.enum';
import { ResultStatus } from '../src/common/enums/result-status.enum';
import { TeamStatus } from '../src/common/enums/team-status.enum';
import { configureApplication } from '../src/configure-application';
import { RaceResult } from '../src/results/entities/race-result.entity';
import { UserProfileStatus } from '../src/users/enums/user-profile-status.enum';
import { UserProfile } from '../src/users/entities/user-profile.entity';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

jest.setTimeout(30_000);

interface StandingBody {
  position: number;
  competitorId?: string;
  teamId?: string;
  name: string;
  totalPoints: number;
  wins: number;
  secondPlaces: number;
  racesCompleted: number;
  bestFinalTimeMs: number | null;
}

interface CollectionBody<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

describe('Standings (e2e)', () => {
  let administratorApp: INestApplication<App>;
  let organizerApp: INestApplication<App>;
  let viewerApp: INestApplication<App>;
  let unauthenticatedApp: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error(
        'Standings E2E tests require DATABASE_NAME ending in _test',
      );
    }

    const administratorModule = await createAuthenticatedTestingModule({
      sub: 'standings-administrator-subject',
      username: 'standings-administrator',
      roles: [AppRole.ADMINISTRATOR],
    });
    administratorApp = await startApplication(administratorModule);
    dataSource = administratorApp.get(DataSource);
    await dataSource.runMigrations();

    organizerApp = await startApplication(
      await createAuthenticatedTestingModule({
        sub: 'standings-organizer-subject',
        username: 'standings-organizer',
        roles: [AppRole.RACE_ORGANIZER],
      }),
    );
    viewerApp = await startApplication(
      await createAuthenticatedTestingModule({
        sub: 'standings-viewer-subject',
        username: 'standings-viewer',
        roles: [AppRole.VIEWER],
      }),
    );
    unauthenticatedApp = await startApplication(
      await Test.createTestingModule({ imports: [AppModule] }).compile(),
    );
  });

  beforeEach(async () => truncateDatabase());

  afterAll(async () => {
    if (dataSource) await truncateDatabase();
    if (unauthenticatedApp) await unauthenticatedApp.close();
    if (viewerApp) await viewerApp.close();
    if (organizerApp) await organizerApp.close();
    if (administratorApp) await administratorApp.close();
  });

  it('scores positions and non-finished outcomes and excludes non-completed races', async () => {
    const expectedPoints = [10, 7, 5, 3, 1, 0];
    const competitors: { id: string; name: string }[] = [];
    for (let position = 1; position <= 6; position += 1) {
      const competitor = await createCompetitor(`Place ${position}`);
      competitors.push(competitor);
      await addCompetitorResult(competitor.id, {
        finalPosition: position,
        finalTimeMs: 50_000 + position,
      });
    }

    for (const status of [
      ResultStatus.DID_NOT_START,
      ResultStatus.DID_NOT_FINISH,
      ResultStatus.DISQUALIFIED,
    ]) {
      const competitor = await createCompetitor(status);
      competitors.push(competitor);
      await addCompetitorResult(competitor.id, { status });
    }

    const unofficial = await createCompetitor('Unofficial winner');
    await addCompetitorResult(unofficial.id, {
      finalPosition: 1,
      finalTimeMs: 40_000,
      raceStatus: RaceStatus.IN_PROGRESS,
    });

    const response = await getCompetitorStandings();
    expect(response.totalItems).toBe(9);
    expect(response.items).not.toContainEqual(
      expect.objectContaining({ competitorId: unofficial.id }),
    );
    for (let index = 0; index < 6; index += 1) {
      expect(response.items).toContainEqual(
        expect.objectContaining({
          competitorId: competitors[index].id,
          totalPoints: expectedPoints[index],
        }),
      );
    }
    for (const competitor of competitors.slice(6)) {
      expect(response.items).toContainEqual(
        expect.objectContaining({
          competitorId: competitor.id,
          totalPoints: 0,
          racesCompleted: 0,
          bestFinalTimeMs: null,
        }),
      );
    }
  });

  it('applies every tie-breaker and shares position after a complete tie', async () => {
    const oneWin = await createCompetitor('Points tie - win');
    await addCompetitorResult(oneWin.id, {
      finalPosition: 1,
      finalTimeMs: 70_000,
    });
    const noWin = await createCompetitor('Points tie - no win');
    await addCompetitorResult(noWin.id, {
      finalPosition: 2,
      finalTimeMs: 72_000,
    });
    await addCompetitorResult(noWin.id, {
      finalPosition: 4,
      finalTimeMs: 73_000,
    });

    const twoSeconds = await createCompetitor('Two seconds');
    await addCompetitorResult(twoSeconds.id, {
      finalPosition: 2,
      finalTimeMs: 71_000,
    });
    await addCompetitorResult(twoSeconds.id, {
      finalPosition: 2,
      finalTimeMs: 72_000,
    });
    const oneSecond = await createCompetitor('One second');
    await addCompetitorResult(oneSecond.id, {
      finalPosition: 2,
      finalTimeMs: 71_000,
    });
    await addCompetitorResult(oneSecond.id, {
      finalPosition: 3,
      finalTimeMs: 72_000,
    });
    await addCompetitorResult(oneSecond.id, {
      finalPosition: 5,
      finalTimeMs: 73_000,
    });
    await addCompetitorResult(oneSecond.id, {
      finalPosition: 5,
      finalTimeMs: 74_000,
    });

    const moreRaces = await createCompetitor('More completed races');
    await addCompetitorResult(moreRaces.id, {
      finalPosition: 3,
      finalTimeMs: 60_000,
    });
    await addCompetitorResult(moreRaces.id, {
      finalPosition: 6,
      finalTimeMs: 61_000,
    });
    const fewerRaces = await createCompetitor('Fewer completed races');
    await addCompetitorResult(fewerRaces.id, {
      finalPosition: 3,
      finalTimeMs: 59_000,
    });

    const faster = await createCompetitor('Faster best time');
    await addCompetitorResult(faster.id, {
      finalPosition: 4,
      finalTimeMs: 55_000,
    });
    const slower = await createCompetitor('Slower best time');
    await addCompetitorResult(slower.id, {
      finalPosition: 4,
      finalTimeMs: 65_000,
    });

    const validTime = await createCompetitor('Valid time');
    await addCompetitorResult(validTime.id, {
      finalPosition: 6,
      finalTimeMs: 80_000,
    });
    const missingTime = await createCompetitor('Missing time');
    await addCompetitorResult(missingTime.id, {
      status: ResultStatus.DID_NOT_START,
    });

    const tiedAlpha = await createCompetitor('Alpha complete tie');
    const tiedZulu = await createCompetitor('Zulu complete tie');
    await addCompetitorResult(tiedAlpha.id, {
      finalPosition: 5,
      finalTimeMs: 90_000,
    });
    await addCompetitorResult(tiedZulu.id, {
      finalPosition: 5,
      finalTimeMs: 90_000,
    });

    const standings = await getCompetitorStandings({ limit: 100 });
    expect(indexOf(standings, oneWin.id)).toBeLessThan(
      indexOf(standings, noWin.id),
    );
    expect(indexOf(standings, twoSeconds.id)).toBeLessThan(
      indexOf(standings, oneSecond.id),
    );
    expect(indexOf(standings, moreRaces.id)).toBeLessThan(
      indexOf(standings, fewerRaces.id),
    );
    expect(indexOf(standings, faster.id)).toBeLessThan(
      indexOf(standings, slower.id),
    );
    expect(indexOf(standings, validTime.id)).toBeLessThan(
      indexOf(standings, missingTime.id),
    );
    const alpha = findStanding(standings, tiedAlpha.id);
    const zulu = findStanding(standings, tiedZulu.id);
    expect(alpha.position).toBe(zulu.position);
    expect(indexOf(standings, tiedAlpha.id)).toBeLessThan(
      indexOf(standings, tiedZulu.id),
    );
  });

  it('uses only directly registered team results', async () => {
    const directWinner = await createTeam('Direct winner');
    const memberTeam = await createTeam('Member result must not count');
    const member = await createCompetitor('Winning member');
    await dataSource.query(
      'INSERT INTO team_members (team_id, competitor_id) VALUES ($1, $2)',
      [memberTeam.id, member.id],
    );
    await addTeamResult(directWinner.id, {
      finalPosition: 1,
      finalTimeMs: 60_000,
    });
    await addTeamResult(memberTeam.id, { status: ResultStatus.DID_NOT_FINISH });
    await addCompetitorResult(member.id, {
      finalPosition: 1,
      finalTimeMs: 50_000,
    });

    const response = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/teams')
      .expect(200);
    const standings = response.body as CollectionBody<StandingBody>;
    expect(findStanding(standings, directWinner.id)).toMatchObject({
      totalPoints: 10,
      wins: 1,
    });
    expect(findStanding(standings, memberTeam.id)).toMatchObject({
      totalPoints: 0,
      wins: 0,
      racesCompleted: 0,
    });
  });

  it('reflects an official correction on the next query and composes the overall view', async () => {
    const competitor = await createCompetitor('Corrected competitor');
    const result = await addCompetitorResult(competitor.id, {
      finalPosition: 2,
      finalTimeMs: 75_000,
    });
    expect(
      findStanding(await getCompetitorStandings(), competitor.id).totalPoints,
    ).toBe(7);

    await request(administratorApp.getHttpServer())
      .put(`/api/v1/results/${result.id}`)
      .send({
        status: ResultStatus.FINISHED,
        finalPosition: 1,
        rawTimeMs: 74_000,
        penaltyTimeMs: 0,
      })
      .expect(200);

    expect(
      findStanding(await getCompetitorStandings(), competitor.id),
    ).toMatchObject({
      totalPoints: 10,
      wins: 1,
      bestFinalTimeMs: 74_000,
    });
    const overallResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings')
      .expect(200);
    expect(overallResponse.body).toMatchObject({
      pointsTable: [
        { position: 1, points: 10 },
        { position: 2, points: 7 },
        { position: 3, points: 5 },
        { position: 4, points: 3 },
        { position: 5, points: 1 },
      ],
      competitors: { totalItems: 1 },
      teams: { totalItems: 0 },
    });
  });

  it('paginates, filters, validates sorting and remains deterministic', async () => {
    const alpha = await createCompetitor('Alpha stable', CompetitorType.DWARF);
    const beta = await createCompetitor('Beta stable', CompetitorType.CAMEL);
    const gamma = await createCompetitor('Gamma stable', CompetitorType.DWARF);
    for (const competitor of [alpha, beta, gamma]) {
      await addCompetitorResult(competitor.id, {
        finalPosition: 5,
        finalTimeMs: 90_000,
      });
    }

    const pageResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/competitors')
      .query({ page: 2, limit: 1 })
      .expect(200);
    expect(pageResponse.body).toMatchObject({
      page: 2,
      limit: 1,
      totalItems: 3,
      totalPages: 3,
      items: [{ competitorId: beta.id, position: 1 }],
    });

    const filterResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/competitors')
      .query({ type: CompetitorType.DWARF, search: 'gamma' })
      .expect(200);
    expect(filterResponse.body).toMatchObject({
      totalItems: 1,
      items: [{ competitorId: gamma.id, position: 1 }],
    });

    const sortedResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/competitors')
      .query({ sortBy: 'name', sortOrder: 'desc' })
      .expect(200);
    expect(
      (sortedResponse.body as CollectionBody<StandingBody>).items.map(
        (item) => item.name,
      ),
    ).toEqual(['Gamma stable', 'Beta stable', 'Alpha stable']);

    await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/competitors')
      .query({ sortBy: 'rawSql' })
      .expect(400);
  });

  it('allows every application role and rejects missing authentication or a disabled profile', async () => {
    for (const app of [administratorApp, organizerApp, viewerApp]) {
      await request(app.getHttpServer()).get('/api/v1/standings').expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/standings/competitors')
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/standings/teams')
        .expect(200);
    }

    const unauthenticated = await request(
      unauthenticatedApp.getHttpServer(),
    ).get('/api/v1/standings');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      path: '/api/v1/standings',
    });

    const viewerProfile = await dataSource
      .getRepository(UserProfile)
      .findOneByOrFail({
        keycloakUserId: 'standings-viewer-subject',
      });
    await dataSource.getRepository(UserProfile).update(viewerProfile.id, {
      status: UserProfileStatus.DISABLED,
    });
    const disabled = await request(viewerApp.getHttpServer()).get(
      '/api/v1/standings',
    );
    expect(disabled.status).toBe(403);
    expect(disabled.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'User profile is disabled',
    });
  });

  async function startApplication(
    module: TestingModule,
  ): Promise<INestApplication<App>> {
    const app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    return app;
  }

  async function truncateDatabase(): Promise<void> {
    await dataSource.query(`
      TRUNCATE TABLE
        audit_logs, race_results, race_registrations, races, team_members,
        teams, competitors, user_profiles
      RESTART IDENTITY CASCADE
    `);
  }

  async function createCompetitor(
    name: string,
    type = CompetitorType.DWARF,
  ): Promise<{ id: string; name: string }> {
    const rows = await queryRows<{ id: string; name: string }>(
      `INSERT INTO competitors
        (name, nickname, type, date_of_birth, weight, height, origin, status)
       VALUES ($1, $2, $3, '1990-01-01', 70, 130, 'EIA', $4)
       RETURNING id, name`,
      [name, `${name}-${Math.random()}`, type, CompetitorStatus.ACTIVE],
    );
    return rows[0];
  }

  async function createTeam(
    name: string,
  ): Promise<{ id: string; name: string }> {
    const rows = await queryRows<{ id: string; name: string }>(
      `INSERT INTO teams (name, responsible_person, status)
       VALUES ($1, 'Coach', $2) RETURNING id, name`,
      [name, TeamStatus.ACTIVE],
    );
    return rows[0];
  }

  async function addCompetitorResult(
    competitorId: string,
    options: ResultOptions,
  ): Promise<RaceResult> {
    return addResult(
      'competitor_id',
      competitorId,
      RaceType.INDIVIDUAL,
      options,
    );
  }

  async function addTeamResult(
    teamId: string,
    options: ResultOptions,
  ): Promise<RaceResult> {
    return addResult('team_id', teamId, RaceType.TEAM, options);
  }

  async function addResult(
    participantColumn: 'competitor_id' | 'team_id',
    participantId: string,
    raceType: RaceType,
    options: ResultOptions,
  ): Promise<RaceResult> {
    const raceRows = await queryRows<{ id: string }>(
      `INSERT INTO races
        (name, scheduled_at, start_location, finish_location, distance_meters,
         max_participants, type, status, registration_deadline)
       VALUES ($1, NOW() + INTERVAL '1 day', 'Start', 'Finish', 1000, 10,
         $2, $3, NOW()) RETURNING id`,
      [
        `Standing race ${Math.random()}`,
        raceType,
        options.raceStatus ?? RaceStatus.COMPLETED,
      ],
    );
    const registrationRows = await queryRows<{ id: string }>(
      `INSERT INTO race_registrations
        (race_id, ${participantColumn}, status, starting_position)
       VALUES ($1, $2, 'APPROVED', 1) RETURNING id`,
      [raceRows[0].id, participantId],
    );
    const status = options.status ?? ResultStatus.FINISHED;
    const finished = status === ResultStatus.FINISHED;
    const finalTimeMs = finished ? options.finalTimeMs! : null;
    const resultRows = await queryRows<RaceResult>(
      `INSERT INTO race_results
        (race_id, registration_id, starting_position, final_position,
         raw_time_ms, penalty_time_ms, final_time_ms, status)
       VALUES ($1, $2, 1, $3, $4, 0, $4, $5) RETURNING *`,
      [
        raceRows[0].id,
        registrationRows[0].id,
        finished ? options.finalPosition : null,
        finalTimeMs,
        status,
      ],
    );
    return resultRows[0];
  }

  async function queryRows<T>(
    sql: string,
    parameters: unknown[] = [],
  ): Promise<T[]> {
    const rows: unknown = await dataSource.query(sql, parameters);
    if (!Array.isArray(rows))
      throw new Error('Database query returned no rows');
    return rows as T[];
  }

  async function getCompetitorStandings(
    query: Record<string, unknown> = {},
  ): Promise<CollectionBody<StandingBody>> {
    const response = await request(administratorApp.getHttpServer())
      .get('/api/v1/standings/competitors')
      .query(query)
      .expect(200);
    return response.body as CollectionBody<StandingBody>;
  }

  function findStanding(
    collection: CollectionBody<StandingBody>,
    participantId: string,
  ): StandingBody {
    const result = collection.items.find(
      (item) =>
        item.competitorId === participantId || item.teamId === participantId,
    );
    if (!result) throw new Error(`Standing ${participantId} was not found`);
    return result;
  }

  function indexOf(
    collection: CollectionBody<StandingBody>,
    participantId: string,
  ): number {
    return collection.items.findIndex(
      (item) =>
        item.competitorId === participantId || item.teamId === participantId,
    );
  }
});

interface ResultOptions {
  status?: ResultStatus;
  finalPosition?: number;
  finalTimeMs?: number;
  raceStatus?: RaceStatus;
}
