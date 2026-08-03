import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppRole } from '../src/auth/enums/app-role.enum';
import { CompetitorStatus } from '../src/common/enums/competitor-status.enum';
import { CompetitorType } from '../src/common/enums/competitor-type.enum';
import { RaceStatus } from '../src/common/enums/race-status.enum';
import { RaceType } from '../src/common/enums/race-type.enum';
import { RegistrationStatus } from '../src/common/enums/registration-status.enum';
import { ResultStatus } from '../src/common/enums/result-status.enum';
import { configureApplication } from '../src/configure-application';
import { Race } from '../src/races/entities/race.entity';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

interface ProfileBody {
  id: string;
}

interface CompetitorBody {
  id: string;
  status: CompetitorStatus;
}

interface RaceBody {
  id: string;
  status: RaceStatus;
  organizerUserProfileId: string;
}

interface RegistrationBody {
  id: string;
  status: RegistrationStatus;
  startingPosition: number | null;
  performedByUserProfileId: string;
}

interface ResultBody {
  id: string;
  status: ResultStatus;
  finalPosition: number | null;
  finalTimeMs: number | null;
  recordedByUserProfileId: string;
}

interface CollectionBody<T> {
  items: T[];
  totalItems: number;
}

describe('Complete racing workflow (e2e)', () => {
  let administratorApp: INestApplication<App>;
  let organizerApp: INestApplication<App>;
  let viewerApp: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error(
        'Workflow E2E tests require DATABASE_NAME ending in _test',
      );
    }

    const administratorModule: TestingModule =
      await createAuthenticatedTestingModule({
        sub: 'workflow-administrator-subject',
        username: 'workflow-administrator',
      });
    administratorApp = administratorModule.createNestApplication();
    configureApplication(administratorApp);
    await administratorApp.init();
    dataSource = administratorApp.get(DataSource);
    await dataSource.runMigrations();

    const organizerModule = await createAuthenticatedTestingModule({
      sub: 'workflow-organizer-subject',
      username: 'workflow-organizer',
      roles: [AppRole.RACE_ORGANIZER],
    });
    organizerApp = organizerModule.createNestApplication();
    configureApplication(organizerApp);
    await organizerApp.init();

    const viewerModule = await createAuthenticatedTestingModule({
      sub: 'workflow-viewer-subject',
      username: 'workflow-viewer',
      roles: [AppRole.VIEWER],
    });
    viewerApp = viewerModule.createNestApplication();
    configureApplication(viewerApp);
    await viewerApp.init();
  });

  beforeEach(async () => {
    await dataSource.query(`
      TRUNCATE TABLE
        audit_logs,
        race_results,
        race_registrations,
        races,
        team_members,
        teams,
        competitors,
        user_profiles
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query(`
        TRUNCATE TABLE
          audit_logs,
          race_results,
          race_registrations,
          races,
          team_members,
          teams,
          competitors,
          user_profiles
        RESTART IDENTITY CASCADE
      `);
    }
    if (viewerApp) await viewerApp.close();
    if (organizerApp) await organizerApp.close();
    if (administratorApp) await administratorApp.close();
  });

  it('completes a race and corrects an official result with actor audit', async () => {
    const actor = await currentProfile(administratorApp);
    const firstCompetitor = await createCompetitor('GraniteDash');
    const secondCompetitor = await createCompetitor('CopperStride');
    const race = await createRace(administratorApp, 'Complete workflow race');
    expect(race.organizerUserProfileId).toBe(actor.id);

    await transitionRace(race.id, RaceStatus.OPEN_FOR_REGISTRATION);
    const firstRegistration = await createRegistration(
      race.id,
      firstCompetitor.id,
    );
    const secondRegistration = await createRegistration(
      race.id,
      secondCompetitor.id,
    );
    const approvedFirst = await approveRegistration(firstRegistration.id, 1);
    const approvedSecond = await approveRegistration(secondRegistration.id, 2);
    expect(approvedFirst).toMatchObject({
      status: RegistrationStatus.APPROVED,
      startingPosition: 1,
      performedByUserProfileId: actor.id,
    });
    expect(approvedSecond.startingPosition).toBe(2);

    await transitionRace(race.id, RaceStatus.CLOSED);
    await transitionRace(race.id, RaceStatus.IN_PROGRESS);

    const winner = await createResult(
      race.id,
      firstRegistration.id,
      1,
      90_000,
      500,
    );
    expect(winner).toMatchObject({
      finalPosition: 1,
      finalTimeMs: 90_500,
      recordedByUserProfileId: actor.id,
    });

    await request(administratorApp.getHttpServer())
      .patch(`/api/v1/races/${race.id}/status`)
      .send({ status: RaceStatus.COMPLETED })
      .expect(409);

    await request(administratorApp.getHttpServer())
      .post(`/api/v1/races/${race.id}/results`)
      .send({
        registrationId: secondRegistration.id,
        status: ResultStatus.FINISHED,
        finalPosition: 1,
        rawTimeMs: 95_000,
        penaltyTimeMs: 0,
      })
      .expect(409);

    const runnerUp = await createResult(
      race.id,
      secondRegistration.id,
      2,
      95_000,
      0,
    );
    const completed = await transitionRace(race.id, RaceStatus.COMPLETED);
    expect(completed.status).toBe(RaceStatus.COMPLETED);

    const correctedResponse = await request(administratorApp.getHttpServer())
      .put(`/api/v1/results/${runnerUp.id}`)
      .send({
        status: ResultStatus.FINISHED,
        finalPosition: 2,
        rawTimeMs: 94_000,
        penaltyTimeMs: 250,
        notes: 'Official timing correction',
      })
      .expect(200);
    const corrected = correctedResponse.body as ResultBody;
    expect(corrected).toMatchObject({
      finalTimeMs: 94_250,
      recordedByUserProfileId: actor.id,
    });

    const resultsResponse = await request(administratorApp.getHttpServer())
      .get(`/api/v1/races/${race.id}/results`)
      .expect(200);
    const results = resultsResponse.body as CollectionBody<ResultBody>;
    expect(results.totalItems).toBe(2);
    expect(results.items.map((item) => item.finalPosition)).toEqual([1, 2]);

    const auditResponse = await request(administratorApp.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ action: 'RESULT_CORRECTED', entityId: runnerUp.id })
      .expect(200);
    const audit = auditResponse.body as CollectionBody<{
      actorUserProfileId: string;
      previousValues: { finalTimeMs: number };
      newValues: { finalTimeMs: number };
    }>;
    expect(audit.totalItems).toBe(1);
    expect(audit.items[0]).toMatchObject({
      actorUserProfileId: actor.id,
      previousValues: { finalTimeMs: 95_000 },
      newValues: { finalTimeMs: 94_250 },
    });
  });

  it('enforces eligibility, duplicate registration and deadline rules', async () => {
    const suspended = await createCompetitor(
      'SuspendedRunner',
      CompetitorStatus.SUSPENDED,
    );
    const active = await createCompetitor('ActiveRunner');
    const late = await createCompetitor('LateRunner');
    const race = await createRace(administratorApp, 'Registration rules race');
    await transitionRace(race.id, RaceStatus.OPEN_FOR_REGISTRATION);

    await request(administratorApp.getHttpServer())
      .post(`/api/v1/races/${race.id}/registrations`)
      .send({ competitorId: suspended.id })
      .expect(409);

    const attempts = await Promise.all([
      request(administratorApp.getHttpServer())
        .post(`/api/v1/races/${race.id}/registrations`)
        .send({ competitorId: active.id }),
      request(administratorApp.getHttpServer())
        .post(`/api/v1/races/${race.id}/registrations`)
        .send({ competitorId: active.id }),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);

    await dataSource.getRepository(Race).update(race.id, {
      registrationDeadline: new Date(Date.now() - 1_000),
    });
    await request(administratorApp.getHttpServer())
      .post(`/api/v1/races/${race.id}/registrations`)
      .send({ competitorId: late.id })
      .expect(409);

    const registrationsResponse = await request(
      administratorApp.getHttpServer(),
    )
      .get(`/api/v1/races/${race.id}/registrations`)
      .expect(200);
    const registrations =
      registrationsResponse.body as CollectionBody<RegistrationBody>;
    expect(registrations.totalItems).toBe(1);
  });

  it('enforces viewer and organizer authorization boundaries', async () => {
    await request(viewerApp.getHttpServer())
      .post('/api/v1/races')
      .send(racePayload('Forbidden viewer race'))
      .expect(403);

    const viewerRaceCount = await dataSource.getRepository(Race).count();
    expect(viewerRaceCount).toBe(0);

    const organizer = await currentProfile(organizerApp);
    const race = await createRace(organizerApp, 'Organizer race');
    expect(race.organizerUserProfileId).toBe(organizer.id);

    await request(organizerApp.getHttpServer())
      .get('/api/v1/audit-logs')
      .expect(403);
  });

  async function currentProfile(
    app: INestApplication<App>,
  ): Promise<ProfileBody> {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .expect(200);
    return response.body as ProfileBody;
  }

  async function createCompetitor(
    nickname: string,
    status = CompetitorStatus.ACTIVE,
  ): Promise<CompetitorBody> {
    const response = await request(administratorApp.getHttpServer())
      .post('/api/v1/competitors')
      .send({
        name: `${nickname} competitor`,
        nickname,
        type: CompetitorType.DWARF,
        dateOfBirth: '1994-06-12',
        weight: 78.5,
        height: 132.4,
        origin: 'Iron Hills',
        status,
      })
      .expect(201);
    return response.body as CompetitorBody;
  }

  async function createRace(
    app: INestApplication<App>,
    name: string,
  ): Promise<RaceBody> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/races')
      .send(racePayload(name))
      .expect(201);
    return response.body as RaceBody;
  }

  function racePayload(name: string): Record<string, unknown> {
    return {
      name,
      description: 'PostgreSQL-backed end-to-end workflow',
      scheduledAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      startLocation: 'EIA start line',
      finishLocation: 'EIA finish line',
      distanceMeters: 1_500,
      maxParticipants: 4,
      type: RaceType.INDIVIDUAL,
      registrationDeadline: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    };
  }

  async function transitionRace(
    raceId: string,
    status: RaceStatus,
  ): Promise<RaceBody> {
    const response = await request(administratorApp.getHttpServer())
      .patch(`/api/v1/races/${raceId}/status`)
      .send({ status })
      .expect(200);
    return response.body as RaceBody;
  }

  async function createRegistration(
    raceId: string,
    competitorId: string,
  ): Promise<RegistrationBody> {
    const response = await request(administratorApp.getHttpServer())
      .post(`/api/v1/races/${raceId}/registrations`)
      .send({ competitorId })
      .expect(201);
    return response.body as RegistrationBody;
  }

  async function approveRegistration(
    registrationId: string,
    startingPosition: number,
  ): Promise<RegistrationBody> {
    const response = await request(administratorApp.getHttpServer())
      .patch(`/api/v1/registrations/${registrationId}/approve`)
      .send({ startingPosition })
      .expect(200);
    return response.body as RegistrationBody;
  }

  async function createResult(
    raceId: string,
    registrationId: string,
    finalPosition: number,
    rawTimeMs: number,
    penaltyTimeMs: number,
  ): Promise<ResultBody> {
    const response = await request(administratorApp.getHttpServer())
      .post(`/api/v1/races/${raceId}/results`)
      .send({
        registrationId,
        status: ResultStatus.FINISHED,
        finalPosition,
        rawTimeMs,
        penaltyTimeMs,
      })
      .expect(201);
    return response.body as ResultBody;
  }
});
