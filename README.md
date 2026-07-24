# Great EIA Camel vs. Dwarf Racing System

A NestJS REST API for managing competitors, teams, races, registrations, official
results, standings, and audit records for a fictional racing league.

The product will combine this backend with a separate graphical frontend, PostgreSQL,
and Keycloak. The frontend authenticates through OpenID Connect, calls the protected
API over HTTP, and never accesses PostgreSQL directly. This repository is organized
as a monorepo: the initial NestJS starter lives under `backend/`, while `frontend/`
is reserved for the React application. The domain, persistence, identity
integration, frontend application, and container infrastructure remain to be
implemented.

## Objective

Deliver a secure and usable system that persists racing data, enforces the documented
business rules, supports role-based workflows, exposes a consistent REST API, and
runs reproducibly through Docker Compose.

## Team Members

```text
Decision pending
```

## Main Capabilities

- Keycloak authentication and backend role authorization
- Competitor and team management
- Race scheduling and lifecycle management
- Participant registration and eligibility checks
- Official result recording and standings calculation
- Administrator-only audit-log access
- A separate role-aware graphical interface

See [Project requirements](docs/project-requirements.md) and
[Business rules](docs/business-rules.md) for the authoritative scope.

## Technology

The definitive target stack is Node.js LTS, TypeScript, NestJS, TypeORM,
PostgreSQL, Keycloak, OpenID Connect, OAuth 2.0, Docker, Docker Compose, Jest,
`@nestjs/testing`, Supertest, `class-validator`, and `class-transformer`.

Current repository state:

- Package manager: npm (`backend/package-lock.json` is present).
- NestJS 11 and TypeScript are installed.
- Jest, `@nestjs/testing`, and Supertest are installed.
- ESLint and Prettier are configured.
- TypeORM, the PostgreSQL driver, typed environment validation, global request
  validation, and migration commands are configured.
- Keycloak integration is not installed.
- No Dockerfile, Compose file, schema migrations, seeds, or frontend application
  is present.
- No Node version file or package `engines` constraint is present. The inspected
  development environment uses Node `v24.13.1`; the selected runtime is Node.js 24 subject to compatibility confirmation.

## Architecture

NestJS is the resource server and owner of business rules, domain authorization,
REST behavior, application data, and audit records. Keycloak owns identities,
credentials, sessions, token issuance, and authorization roles. TypeORM will map
domain persistence to PostgreSQL and migrations will evolve the schema. The
frontend will be a separate client of both Keycloak and this API.

Detailed boundaries and the proposed module layout are in
[Architecture](docs/architecture.md). The conceptual persistence model is in
[Database model](docs/database-model.md).

## Prerequisites

- Node.js 24 after dependency compatibility confirmation.
- npm (the backend currently uses `backend/package-lock.json`).
- Docker with Docker Compose: required for the target environment, not yet
  configured.
- A locally accessible PostgreSQL instance is required to start the backend until
  the later Docker phase.
- Keycloak is required by the target architecture but is not yet configured.
- React/TypeScript/Vite frontend under target `frontend/`.

## Installation

Install the currently declared backend dependencies:

```bash
cd backend
npm ci
```

This installs the currently configured backend packages.

## Environment Configuration

Copy the non-secret template and replace its local database values:

```bash
cd backend
cp .env.example .env
```

The current configuration validates `NODE_ENV`, `PORT`, `DATABASE_HOST`,
`DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and
`DATABASE_SSL` at startup. Identity variables will be added with the Keycloak
integration. Never commit real credentials, admin passwords, client secrets,
access tokens, or refresh tokens.

## Development

From `backend/`, the existing starter can be run in watch mode:

```bash
npm run start:dev
```

It currently listens on `PORT` or falls back to port `3000` and exposes only the
default starter route. The planned global prefix `/api/v1`, validation, database,
and security behavior are not implemented.

Other existing run scripts:

```bash
npm run start
npm run start:debug
npm run build
npm run start:prod
```

## Docker

The target local topology contains:

- A separate frontend container
- A NestJS API container
- A PostgreSQL container for application data with a named volume
- A Keycloak container with persistent database storage
- An isolated network, environment configuration, ports, startup dependencies,
  and practical health checks

Keycloak and the application use one PostgreSQL container with separate databases
and credentials.

The intended command is:

```bash
docker compose up -d --build
```

This is a target, not a working command: no Docker or Compose configuration exists
in this repository yet.

## Migrations and Seeds

TypeORM migrations are the required schema-evolution mechanism.

```bash
cd backend
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:show
npm run migration:revert
```

There are no schema migrations yet because no persistence entities have been
introduced. Seeds also do not exist. Academic demonstration data must eventually
include the minimum dataset in
[Project requirements](docs/project-requirements.md), without embedding real
credentials. Keycloak demo accounts must be provisioned through a reproducible
realm setup rather than application-database seeds.

## Tests and Quality

These scripts currently exist in `backend/package.json`:

```bash
npm test
npm run test:watch
npm run test:cov
npm run test:e2e
npm run lint
npm run format
```

The repository currently has only the NestJS starter unit and E2E tests. They do
not cover the racing domain, PostgreSQL, or Keycloak. See [Testing](docs/testing.md)
for the required test matrix and isolation strategy.

## Repository Structure

```text
.
├── AGENTS.md
├── README.md
├── backend/               # NestJS API application
│   ├── src/               # Current starter; target domain modules go here
│   ├── test/              # Backend E2E tests
│   ├── package.json
│   └── package-lock.json
├── docs/                  # Authoritative project documentation
└── frontend/              # Reserved for the React/TypeScript/Vite application
```

The expected modular `backend/src/` layout is documented in
[Architecture](docs/architecture.md).

## Roles

- `ADMINISTRATOR`: manage users, competitors, teams, races, registrations,
  results, and audit records.
- `RACE_ORGANIZER`: manage races, registrations, and results; view competitors
  and teams.
- `VIEWER`: read public information, schedules, results, and standings only.

Keycloak is the role source of truth. Whether these are realm roles or client roles
is `Decision pending`.

## Keycloak Integration

The frontend will use Authorization Code Flow with PKCE. It will send the resulting
Keycloak access token as `Authorization: Bearer <keycloak-access-token>`. NestJS
will validate the token signature, issuer, expiration, and configured audience,
then enforce role and domain permissions. NestJS will not implement local login,
password storage, or token issuance.

Passport JWT with `jwks-rsa` is selected subject to compatibility confirmation;
demo users and client roles use a reproducible realm import. See [Security](docs/security.md).

## Demo Users and Component URLs

Demo users, fictional credentials, and the Keycloak provisioning mechanism:

```text
Decision pending
```

No demo accounts currently exist. Do not interpret example names in the academic
scenario as credentials.

Current and planned URLs:

| Component      | URL                                             | Status                       |
| -------------- | ----------------------------------------------- | ---------------------------- |
| NestJS starter | `http://localhost:3000` by default              | Current, unprotected starter |
| Planned API    | `/api/v1` under the backend origin              | Target                       |
| Frontend       | `Decision pending`                              | Not present                  |
| Keycloak       | `Decision pending`                              | Not configured               |
| PostgreSQL     | Internal container endpoint: `Decision pending` | Not configured               |

## Documentation

- [Architecture decisions](docs/adr/README.md)
- [Implementation roadmap](docs/roadmap.md)

- [Project requirements](docs/project-requirements.md)
- [Business rules](docs/business-rules.md)
- [Architecture](docs/architecture.md)
- [Database model](docs/database-model.md)
- [API contract](docs/api-contract.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Evaluation checklist](docs/evaluation-checklist.md)

## Known Limitations

- Only the default NestJS starter behavior exists.
- Domain modules and business rules are not implemented.
- TypeORM and PostgreSQL connection settings are configured, but no database
  instance is provided by the repository yet.
- Keycloak authentication and authorization are not configured.
- Docker Compose and persistent storage are not configured.
- The mandatory graphical frontend application is not implemented.
- No domain tests, schema migrations, seeds, or reproducible demo accounts exist.

## Future Improvements

After all mandatory requirements are complete, optional improvements may include
CI, cloud deployment, WebSocket race updates, email notifications, Redis caching,
rate limiting, Testcontainers, CSV/PDF export, profile images, observability, soft
delete, optimistic locking, and idempotency keys. Bonus work must not displace
mandatory security, UI, persistence, or business-rule work.
