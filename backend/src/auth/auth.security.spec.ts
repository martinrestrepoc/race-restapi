import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createSign, generateKeyPairSync, KeyObject } from 'node:crypto';
import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { configureApplication } from '../configure-application';
import { AuthModule } from './auth.module';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AppRole } from './enums/app-role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

jest.setTimeout(15_000);

@Controller('security-test')
@UseGuards(JwtAuthGuard, RolesGuard)
class SecurityTestController {
  @Get('administrator')
  @Roles(AppRole.ADMINISTRATOR)
  administrator(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

describe('JWT authentication and role authorization', () => {
  const issuer = 'http://identity.test/realms/race-management';
  const audience = 'race-backend';
  const keyId = 'security-test-key';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  let jwksServer: Server;
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const publicJwk = {
      ...publicKey.export({ format: 'jwk' }),
      alg: 'RS256',
      kid: keyId,
      use: 'sig',
    };
    jwksServer = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ keys: [publicJwk] }));
    });
    await new Promise<void>((resolve) =>
      jwksServer.listen(0, '127.0.0.1', resolve),
    );
    const address = jwksServer.address() as AddressInfo;

    const testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              KEYCLOAK_ISSUER: issuer,
              KEYCLOAK_JWKS_URI: `http://127.0.0.1:${address.port}/certs`,
              KEYCLOAK_CLIENT_ID: audience,
              KEYCLOAK_AUDIENCE: audience,
            }),
          ],
        }),
        AuthModule,
      ],
      controllers: [SecurityTestController],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (jwksServer?.listening) {
      await new Promise<void>((resolve, reject) =>
        jwksServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it('returns 401 when the bearer token is missing', async () => {
    const response = await request(httpServer).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      path: '/api/v1/auth/me',
    });
  });

  it.each([
    ['malformed', 'not-a-jwt'],
    ['expired', createToken({ exp: now() - 60 })],
    ['wrong issuer', createToken({ iss: 'http://wrong-issuer.test' })],
    ['wrong audience', createToken({ aud: 'another-api' })],
    ['wrong token type', createToken({ typ: 'ID' })],
  ])('returns 401 for a %s token', async (_caseName, token) => {
    const response = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('returns 401 for a token signed by an untrusted key', async () => {
    const foreignKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const token = createToken({}, foreignKey.privateKey);

    const response = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('returns 403 when a validated user lacks the required role', async () => {
    const token = createToken({
      resource_access: { [audience]: { roles: [AppRole.VIEWER] } },
    });

    const response = await request(httpServer)
      .get('/api/v1/security-test/administrator')
      .set('Authorization', `Bearer ${token}`)
      .set('x-role', AppRole.ADMINISTRATOR);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
    });
  });

  it('returns the safe identity projection for a valid access token', async () => {
    const token = createToken();

    const response = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sub: 'security-test-subject',
      username: 'race-admin',
      email: 'race-admin@example.invalid',
      roles: [AppRole.ADMINISTRATOR],
    });
    expect(response.body).not.toHaveProperty('accessToken');
  });

  function createToken(
    overrides: Record<string, unknown> = {},
    signingKey: KeyObject = privateKey,
  ): string {
    const header = encode({ alg: 'RS256', kid: keyId, typ: 'JWT' });
    const payload = encode({
      iss: issuer,
      aud: audience,
      sub: 'security-test-subject',
      typ: 'Bearer',
      iat: now(),
      exp: now() + 300,
      preferred_username: 'race-admin',
      email: 'race-admin@example.invalid',
      resource_access: {
        [audience]: { roles: [AppRole.ADMINISTRATOR] },
      },
      ...overrides,
    });
    const unsignedToken = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsignedToken);

    return `${unsignedToken}.${signer.sign(signingKey, 'base64url')}`;
  }

  function encode(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  function now(): number {
    return Math.floor(Date.now() / 1000);
  }
});
