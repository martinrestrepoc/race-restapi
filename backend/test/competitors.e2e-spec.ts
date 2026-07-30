import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CompetitorStatus } from '../src/common/enums/competitor-status.enum';
import { CompetitorType } from '../src/common/enums/competitor-type.enum';
import { configureApplication } from '../src/configure-application';

interface CompetitorBody {
  id: string;
  name: string;
  nickname: string;
  type: CompetitorType;
  dateOfBirth: string;
  weight: number;
  height: number;
  origin: string;
  status: CompetitorStatus;
  registeredAt: string;
  updatedAt: string;
}

interface CompetitorListBody {
  items: CompetitorBody[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  details?: Array<{ field: string; message: string }>;
}

function parseBody<T>(response: request.Response): T {
  return JSON.parse(response.text) as T;
}

const validCompetitor = {
  name: 'Borin Stonehelm',
  nickname: 'Stonebolt',
  type: CompetitorType.DWARF,
  dateOfBirth: '1994-06-12',
  weight: 78.5,
  height: 132.4,
  origin: 'Iron Hills',
  status: CompetitorStatus.ACTIVE,
};

describe('Competitors (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error(
        'Competitor E2E tests require DATABASE_NAME ending in _test',
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await app.close();
  });

  it('creates, retrieves and paginates a competitor', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send(validCompetitor)
      .expect(201);
    const createdBody = parseBody<CompetitorBody>(created);

    expect(createdBody).toMatchObject(validCompetitor);
    expect(typeof createdBody.id).toBe('string');
    expect(typeof createdBody.registeredAt).toBe('string');
    expect(typeof createdBody.updatedAt).toBe('string');

    const list = await request(app.getHttpServer())
      .get('/api/v1/competitors?page=1&limit=20&type=DWARF')
      .expect(200);
    const listBody = parseBody<CompetitorListBody>(list);

    expect(listBody).toMatchObject({
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(listBody.items).toHaveLength(1);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/competitors/${createdBody.id}`)
      .expect(200);

    expect(parseBody<CompetitorBody>(detail).nickname).toBe(
      validCompetitor.nickname,
    );
  });

  it('returns field-level validation errors for invalid measurements', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send({ ...validCompetitor, weight: 0 })
      .expect(400);
    const body = parseBody<ErrorBody>(response);

    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Request validation failed',
      path: '/api/v1/competitors',
    });
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'weight' })]),
    );
  });

  it('rejects duplicated nicknames', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send(validCompetitor)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send({ ...validCompetitor, name: 'Another competitor' })
      .expect(409);
  });

  it('enforces status transitions and treats retired as terminal', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send(validCompetitor)
      .expect(201);
    const createdBody = parseBody<CompetitorBody>(created);

    await request(app.getHttpServer())
      .patch(`/api/v1/competitors/${createdBody.id}/status`)
      .send({ status: CompetitorStatus.RETIRED })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/competitors/${createdBody.id}/status`)
      .send({ status: CompetitorStatus.ACTIVE })
      .expect(409);
  });

  it('fully updates and deletes a competitor', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/competitors')
      .send(validCompetitor)
      .expect(201);
    const createdBody = parseBody<CompetitorBody>(created);
    const replacement = {
      name: 'Nara Dune',
      nickname: 'Sandstride',
      type: CompetitorType.MEDIUM,
      dateOfBirth: '1998-03-21',
      weight: 64.25,
      height: 158.75,
      origin: 'Eastern Dunes',
    };

    const updated = await request(app.getHttpServer())
      .put(`/api/v1/competitors/${createdBody.id}`)
      .send(replacement)
      .expect(200);
    const updatedBody = parseBody<CompetitorBody>(updated);

    expect(updatedBody).toMatchObject(replacement);
    expect(updatedBody.status).toBe(CompetitorStatus.ACTIVE);

    await request(app.getHttpServer())
      .delete(`/api/v1/competitors/${createdBody.id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/competitors/${createdBody.id}`)
      .expect(404);
  });
});
