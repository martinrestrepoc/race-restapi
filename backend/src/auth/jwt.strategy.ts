import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { EnvironmentVariables } from '../config/environment.validation';
import { APP_ROLES, AppRole } from './enums/app-role.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import {
  KeycloakAccessTokenClaims,
  KeycloakClientAccess,
} from './interfaces/keycloak-access-token-claims.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly clientId: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const audience = configService.get<string>('KEYCLOAK_AUDIENCE');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        timeout: 5_000,
        jwksUri: configService.getOrThrow<string>('KEYCLOAK_JWKS_URI'),
      }),
      issuer: configService.getOrThrow<string>('KEYCLOAK_ISSUER'),
      audience,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });

    this.clientId = configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
  }

  validate(payload: KeycloakAccessTokenClaims): AuthenticatedUser {
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      payload.sub.length > 255 ||
      payload.typ !== 'Bearer'
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      sub: payload.sub,
      username: this.readOptionalString(payload.preferred_username),
      email: this.readOptionalString(payload.email),
      roles: this.extractRoles(payload.resource_access),
    };
  }

  private extractRoles(resourceAccess: unknown): AppRole[] {
    if (!this.isRecord(resourceAccess)) {
      return [];
    }

    const clientAccess = resourceAccess[this.clientId];
    if (!this.isRecord(clientAccess)) {
      return [];
    }

    const roles = (clientAccess as KeycloakClientAccess).roles;
    if (!Array.isArray(roles)) {
      return [];
    }

    return APP_ROLES.filter((role) => roles.includes(role));
  }

  private readOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
