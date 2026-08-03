import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { CompetitorStatus } from '../src/common/enums/competitor-status.enum';
import { CompetitorType } from '../src/common/enums/competitor-type.enum';
import { TeamStatus } from '../src/common/enums/team-status.enum';
import { configureApplication } from '../src/configure-application';
import { createAuthenticatedTestingModule } from './authenticated-testing-module';

interface TeamBody {
  id: string;
  name: string;
  description: string | null;
  responsiblePerson: string;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    id: string;
    joinedAt: string;
    leftAt: string | null;
    competitor: { id: string; nickname: string; status: CompetitorStatus };
  }>;
}

interface TeamListBody {
  items: TeamBody[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function parseBody<T>(response: request.Response): T {
  return JSON.parse(response.text) as T;
}

const validTeam = {
  name: 'Iron Striders',
  description: 'Mountain racing team',
  responsiblePerson: 'Nara Flint',
  status: TeamStatus.ACTIVE,
};

function competitorPayload(nickname: string) {
  return {
    name: `Competitor ${nickname}`,
    nickname,
    type: CompetitorType.DWARF,
    dateOfBirth: '1994-06-12',
    weight: 78.5,
    height: 132.4,
    origin: 'Iron Hills',
    status: CompetitorStatus.ACTIVE,
  };
}

describe('Teams (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error('Team E2E tests require DATABASE_NAME ending in _test');
    }

    const moduleFixture: TestingModule =
      await createAuthenticatedTestingModule();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE team_members, teams, competitors RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.query(
        'TRUNCATE TABLE team_members, teams, competitors RESTART IDENTITY CASCADE',
      );
    }
    if (app) {
      await app.close();
    }
  });

  it('creates, lists, retrieves, updates and changes team status', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .send(validTeam)
      .expect(201);
    const createdBody = parseBody<TeamBody>(created);

    expect(createdBody).toMatchObject(validTeam);

    const list = await request(app.getHttpServer())
      .get('/api/v1/teams?status=ACTIVE&search=Iron')
      .expect(200);
    const listBody = parseBody<TeamListBody>(list);
    expect(listBody).toMatchObject({ totalItems: 1, totalPages: 1 });

    const replacement = {
      name: 'Granite Flyers',
      responsiblePerson: 'Mira Stone',
    };
    const updated = await request(app.getHttpServer())
      .put(`/api/v1/teams/${createdBody.id}`)
      .send(replacement)
      .expect(200);
    expect(parseBody<TeamBody>(updated)).toMatchObject({
      ...replacement,
      description: null,
      status: TeamStatus.ACTIVE,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/teams/${createdBody.id}/status`)
      .send({ status: TeamStatus.INACTIVE })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/teams/${createdBody.id}/status`)
      .send({ status: TeamStatus.INACTIVE })
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/v1/teams/${createdBody.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/teams/${createdBody.id}`)
      .expect(404);
  });

  it('rejects duplicated names and invalid input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/teams')
      .send(validTeam)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/teams')
      .send({ ...validTeam, responsiblePerson: 'Another coach' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/teams')
      .send({ ...validTeam, name: '   ' })
      .expect(400);
  });

  it('adds and ends membership while preserving its history', async () => {
    const teamResponse = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .send(validTeam)
      .expect(201);
    const team = parseBody<TeamBody>(teamResponse);
    const competitorResponse = await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send(competitorPayload('Stonebolt'))
      .expect(201);
    const competitor = parseBody<{ id: string }>(competitorResponse);

    await request(app.getHttpServer())
      .post(`/api/v1/teams/${team.id}/members/${competitor.id}`)
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/teams/${team.id}`)
      .expect(200);
    const detailBody = parseBody<TeamBody>(detail);
    expect(detailBody.members).toHaveLength(1);
    expect(detailBody.members?.[0]).toMatchObject({
      leftAt: null,
      competitor: { id: competitor.id, nickname: 'Stonebolt' },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/teams/${team.id}/members/${competitor.id}`)
      .expect(204);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/teams/${team.id}`)
      .expect(200);
    expect(parseBody<TeamBody>(history).members?.[0].leftAt).not.toBeNull();
  });

  it('prevents an active competitor membership in two teams', async () => {
    const firstTeam = parseBody<TeamBody>(
      await request(app.getHttpServer())
        .post('/api/v1/teams')
        .send(validTeam)
        .expect(201),
    );
    const secondTeam = parseBody<TeamBody>(
      await request(app.getHttpServer())
        .post('/api/v1/teams')
        .send({ ...validTeam, name: 'Dune Racers' })
        .expect(201),
    );
    const competitor = parseBody<{ id: string }>(
      await request(app.getHttpServer())
        .post('/api/v1/competitors')
        .send(competitorPayload('Dunebolt'))
        .expect(201),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/teams/${firstTeam.id}/members/${competitor.id}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/teams/${firstTeam.id}/members/${competitor.id}`)
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/v1/teams/${secondTeam.id}/members/${competitor.id}`)
      .expect(409);
  });

  it('deactivates teams and retires competitors when membership history exists', async () => {
    const team = parseBody<TeamBody>(
      await request(app.getHttpServer())
        .post('/api/v1/teams')
        .send(validTeam)
        .expect(201),
    );
    const competitor = parseBody<{ id: string }>(
      await request(app.getHttpServer())
        .post('/api/v1/competitors')
        .send(competitorPayload('Historybolt'))
        .expect(201),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/teams/${team.id}/members/${competitor.id}`)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/teams/${team.id}`)
      .expect(204);
    const retainedTeam = parseBody<TeamBody>(
      await request(app.getHttpServer())
        .get(`/api/v1/teams/${team.id}`)
        .expect(200),
    );
    expect(retainedTeam.status).toBe(TeamStatus.INACTIVE);

    await request(app.getHttpServer())
      .delete(`/api/v1/competitors/${competitor.id}`)
      .expect(204);
    const retainedCompetitor = parseBody<{ status: CompetitorStatus }>(
      await request(app.getHttpServer())
        .get(`/api/v1/competitors/${competitor.id}`)
        .expect(200),
    );
    expect(retainedCompetitor.status).toBe(CompetitorStatus.RETIRED);
  });
});
