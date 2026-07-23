# Repository Guide for Development Agents

## Project

This repository is the backend for the Great EIA Camel vs. Dwarf Racing System.
The goal is a secure, persistent, containerized racing-management product with a
separate graphical frontend. This repository currently contains only the default
NestJS starter; the domain architecture described below is the target architecture.

Before modifying domain behavior, review:

- [Project requirements](docs/project-requirements.md)
- [Business rules](docs/business-rules.md)
- [Architecture](docs/architecture.md)
- [Database model](docs/database-model.md)
- [API contract](docs/api-contract.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)

The practical assessment checklist is in
[Evaluation checklist](docs/evaluation-checklist.md).

## Definitive Stack

- Node.js LTS and TypeScript
- NestJS
- PostgreSQL
- TypeORM as the only application ORM
- Keycloak as the identity provider and role source of truth
- OpenID Connect and OAuth 2.0
- JWT access tokens issued by Keycloak
- `class-validator`, `class-transformer`, and NestJS `ValidationPipe`
- Docker and Docker Compose
- Jest, `@nestjs/testing`, and Supertest
- A separately deployed frontend that consumes the REST API

Some target dependencies are not installed yet. Check `package.json` before using
or documenting a package as available.

## Current and Expected Layout

Current application code is a minimal starter under `src/`; basic unit and E2E
tests exist. The expected modular layout is:

```text
src/
├── auth/
├── users/
├── competitors/
├── teams/
├── races/
├── registrations/
├── results/
├── standings/
├── audit/
├── common/
├── config/
├── database/
│   ├── migrations/
│   └── seeds/
├── app.module.ts
└── main.ts
```

Keep each domain module cohesive. Prefer `dto/` and `entities/` subdirectories.
Add `repositories/` only when it provides meaningful persistence behavior.

## NestJS Responsibilities

### Controllers

- Keep controllers thin.
- Controllers must not contain business logic.
- Receive HTTP requests and parse route, query, and body parameters.
- Invoke application services and map outcomes to HTTP responses.
- Do not access TypeORM repositories directly unless explicitly justified.

### Services

- Place business rules in services.
- Coordinate domain operations and repository access.
- Enforce eligibility, uniqueness, capacity, and state transitions.
- Manage transactions for multi-step atomic operations.
- Coordinate audit events for important state changes.

### DTOs and Responses

- Use DTOs for input validation.
- Validate with `class-validator` and transform deliberately with
  `class-transformer`.
- Use response DTOs or serialization rules for API responses.
- Do not reuse input DTOs automatically as persistence entities.
- Do not expose TypeORM entities directly unless explicitly justified.
- Never expose secrets, tokens, internal metadata, or unintended relations.

### Entities and Repositories

- TypeORM entities represent persistence, relationships, and database constraints.
- Entities must not contain HTTP concerns or Keycloak-managed credentials.
- Inject TypeORM `Repository<Entity>` directly for ordinary persistence.
- Do not create repository wrappers that only duplicate TypeORM methods such as
  `find`, `findOne`, `save`, `remove`, or `delete`.
- A wrapper is justified for reusable complex queries, locking, transaction-aware
  operations, or meaningful persistence abstraction.

## Identity and Security

- Keycloak authenticates users, manages credentials and sessions, and issues tokens.
- NestJS is a resource server that validates Keycloak access tokens.
- Validate signature, issuer, expiration, and audience when configured.
- Extract the stable user identity from the validated `sub` claim.
- Keycloak is the source of truth for `ADMINISTRATOR`, `RACE_ORGANIZER`, and
  `VIEWER` roles.
- Apply both role authorization and domain-specific authorization in the backend.
- Never trust roles supplied manually by the frontend.
- Do not bypass guards for convenience.
- Frontend route or button visibility is not a security boundary.
- Do not store passwords or password hashes in the application database.
- Do not issue application-owned JWT access tokens or refresh tokens.
- Do not log tokens or return token-validation internals.

Passport JWT with `jwks-rsa` is selected subject to dependency compatibility
confirmation. Preserve JWT issuer, audience, signature, expiry, and JWKS validation.

## REST and Validation Conventions

- Use the target base path `/api/v1`.
- Use plural resource names and JSON consistently.
- Use `GET` to read, `POST` to create, `PUT` for true full replacement, `PATCH`
  for partial updates or transitions, and `DELETE` to remove or deactivate.
- Return `201` for creation and `204` for successful deletion without a body.
- Use `400` for malformed or invalid input, `401` for invalid authentication,
  `403` for insufficient permission, `404` for missing resources, and `409` for
  business conflicts.
- Apply a global `ValidationPipe` when validation dependencies are introduced.
- Reject unexpected properties where the adopted compatibility policy permits it.
- Validate identifiers, state transitions, permissions, and cross-entity rules.
- Backend validation is mandatory even when the frontend validates the same fields.
- Keep pagination, filtering, sorting, dates, and errors consistent with the
  [API contract](docs/api-contract.md).

## Error Handling

- Use domain-specific exceptions and a global exception filter.
- Return a stable JSON error shape with timestamp, status code, error, message,
  and request path.
- Field validation errors must identify the rejected field and message.
- Do not return raw stack traces.
- Do not expose database, JWT, JWKS, or Keycloak implementation details.
- Log diagnostic details server-side with secrets and tokens redacted.

## Persistence and Migrations

- TypeORM migrations are required for every database schema change.
- Do not use `synchronize: true` as a production migration strategy.
- Review generated migrations; do not assume generated SQL is safe.
- Explain destructive migrations and provide a recovery or rollout plan.
- Keep seeds separate from migrations.
- Migrations define schema; seeds define reproducible non-secret sample data.
- Use transactions when several writes must succeed or fail together.
- Preserve referential integrity and the constraints in
  [Database model](docs/database-model.md).
- Do not silently change historical or official results.

## Environment and Configuration

- Read configuration through environment variables and typed NestJS configuration.
- Maintain a `.env.example` when configuration is introduced.
- Do not commit `.env` files or credentials.
- Never place real passwords, client secrets, admin credentials, or tokens in Git.
- Public frontend clients must not receive a Keycloak client secret.
- Validate required configuration at startup.
- Keep development and production values separate.
- Treat currently undocumented configuration names as `Decision pending`.

## Naming and Style

- Files and directories: `kebab-case`.
- Classes, DTOs, entities, and enums: `PascalCase`.
- Variables, functions, methods, and properties: `camelCase`.
- Constants and environment variable names: `UPPER_SNAKE_CASE`.
- NestJS files use descriptive suffixes such as `.controller.ts`, `.service.ts`,
  `.module.ts`, `.dto.ts`, `.entity.ts`, `.guard.ts`, and `.filter.ts`.
- Use existing ESLint and Prettier rules.
- Prefer explicit domain names and one authoritative definition for shared enums.

## Testing Strategy

- Use Jest for unit and integration tests.
- Use `@nestjs/testing` for NestJS modules and providers.
- Use Supertest for HTTP-level E2E tests.
- Unit-test services and transition rules independently of HTTP.
- Integration-test TypeORM behavior against isolated PostgreSQL.
- E2E-test the main workflows, error mapping, authentication, and authorization.
- Tests that verify authorization must not bypass role guards.
- Tests must not use production PostgreSQL or production Keycloak.
- Reset data between suites and do not depend on test execution order.
- Apply migrations in database-backed test environments.
- Preserve the required scenarios in [Testing](docs/testing.md).

## Available Commands

The following npm scripts currently exist:

```bash
npm run build
npm run format
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
npm run lint
npm test
npm run test:watch
npm run test:cov
npm run test:debug
npm run test:e2e
```

`npm run lint` and `npm run format` modify matching files. Inspect the working tree
before and after running them. Docker, migration, and seed scripts are not currently
configured.

## Change Rules

- Preserve the business rules documented in `docs/business-rules.md`.
- Update the owning document when a requirement or contract changes.
- Keep controllers thin and transactions at an appropriate service boundary.
- Run relevant linting and tests before completing a change.
- Do not introduce new dependencies without explaining their purpose.
- Prefer the smallest layer that has a real responsibility.
- Document unresolved product choices as `Decision pending`.

## Prohibited Actions

- Do not implement local email/password authentication.
- Do not store passwords or password hashes in PostgreSQL.
- Do not issue JWTs with `JwtService.sign` or any equivalent application signer.
- Do not create local authentication endpoints that replace Keycloak.
- Do not trust frontend-only visual restrictions or manually supplied roles.
- Do not expose secrets, tokens, credentials, or raw Keycloak administration data.
- Do not use `synchronize: true` as the definitive schema solution.
- Do not change business rules without updating their documentation.
- Do not accidentally expose persistence entities.
- Do not place business logic in controllers.
- Do not omit backend validation.
- Do not return stack traces to clients.
- Do not create empty layers or wrappers with no real responsibility.
- Do not duplicate Keycloak roles locally without a synchronization policy.
- Do not introduce another ORM or present the TypeORM choice as open.
