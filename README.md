# Great EIA Camel vs. Dwarf Racing System

A NestJS REST API for managing competitors, teams, races, registrations, official
results, standings, and audit records for a fictional racing league.

The product will combine this backend with a separate graphical frontend, PostgreSQL,
and Keycloak. The frontend authenticates through OpenID Connect, calls the protected
API over HTTP, and never accesses PostgreSQL directly. This repository is organized
as a monorepo: the initial NestJS starter lives under `backend/`, while `frontend/`
is reserved for the React application. Competitor, team, race, registration, and
result persistence plus the backend/PostgreSQL/Keycloak container infrastructure
are implemented. NestJS now validates Keycloak access tokens and exposes a protected
identity endpoints; domain-wide role policies, lazy local profiles, authenticated
actor attribution, mutation audit events, and administrator audit queries are
implemented. Standings, domain seeds, and the frontend application remain pending.

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
- Competitor, team, race, and registration entities, migrations, CRUD/workflow
  endpoints, filters, pagination, lifecycle rules, historical memberships, and
  automated tests are implemented.
- Race start requires two approved registrations and completion requires a result
  for every approved participant. Organizer, registration actor, result recorder,
  and result-audit attribution are populated from authenticated identity rather
  than accepting client-supplied actor identifiers.
- Passport JWT/JWKS dependencies, typed Keycloak settings, an optimized Keycloak
  image, persistent PostgreSQL storage, a reproducible realm, runtime token
  validation, reusable authentication/role/profile guards, domain-controller role
  policies, lazy local profiles, and `GET /api/v1/users/me` are present.
- A Compose stack for NestJS, PostgreSQL, and Keycloak is configured. Domain seeds
  and the frontend application are not present.
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
- Docker with Docker Compose, when using the containerized development stack.
- Alternatively, a locally accessible PostgreSQL instance when running NestJS
  directly with npm.
- Keycloak 26.7.0 is built and started by Docker Compose.
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
`DATABASE_SSL` at startup. `TEAM_MAX_MEMBERS` controls the maximum active
memberships per team and defaults to `10`. Keycloak configuration requires its
base URL, realm, issuer, JWKS URI, API client ID, and optional audience. The issuer
must match the configured base URL and realm; JWKS may use a different internal
Docker address. Never commit real credentials, admin passwords, client secrets,
access tokens, or refresh tokens.

## Development

From `backend/`, the existing starter can be run in watch mode:

```bash
npm run start:dev
```

It listens on `PORT` or falls back to port `3000`. The API uses the `/api/v1`
prefix. Competitors are available under `/api/v1/competitors`; teams and
memberships are available under `/api/v1/teams`. Keycloak authentication, role
authorization, and active local-profile checks protect implemented domain routes.

Other existing run scripts:

```bash
npm run start
npm run start:debug
npm run build
npm run start:prod
```

## Docker

The Compose stack starts NestJS, PostgreSQL, and Keycloak. PostgreSQL hosts separate
application and Keycloak databases with distinct credentials. An idempotent setup
job provisions the Keycloak database even when the PostgreSQL volume already exists.
Keycloak uses an optimized pinned image, management-port healthchecks, and a
reproducible realm import. The backend runs pending TypeORM migrations before
starting the API.

Create the Compose environment file at the repository root, replace every password
placeholder with a different local value, and start the services:

```bash
cp .env.example .env
# Edit PostgreSQL, Keycloak database, bootstrap-admin, and demo-user passwords.
docker compose up -d --build
docker compose ps
```

The API is available at `http://localhost:3000/api/v1` and Keycloak at
`http://localhost:8080` by default. PostgreSQL is
published at `localhost:5433` by default so it does not conflict with a PostgreSQL
instance already using port `5432`. Both ports can be changed in the root `.env`.
Inside the Docker network, the backend connects to `postgres:5432`.

Useful commands:

```bash
docker compose logs -f backend
docker compose logs -f keycloak
docker compose down
```

`docker compose down` preserves database data. Running `docker compose down -v`
also deletes the named PostgreSQL volume and all data stored in it.

The target topology will later add the separate frontend service.
Changing PostgreSQL initialization credentials after the volume has been created
does not update the bootstrap database user. The idempotent Keycloak database setup
does update its dedicated role password. Recreate the volume only when losing all
local application and identity data is acceptable.

Keycloak imports `race-management` only when that realm does not already exist.
Changes to the realm JSON therefore do not overwrite persisted configuration; apply
them administratively, or reset the local volume only when discarding all local data
is intentional.

## Migrations and Seeds

TypeORM migrations are the required schema-evolution mechanism.

```bash
cd backend
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:show
npm run migration:revert
```

The competitor, team/membership, race, registration, and result schema migrations
are present. Seeds do not exist. Academic
demonstration data must eventually include the minimum dataset in
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
npm run test:security
npm run lint
npm run format
```

Unit and PostgreSQL-backed E2E tests cover the implemented domain modules. The
security suite uses disposable RSA keys and a local JWKS issuer to cover signature,
issuer, audience, expiration, token type, role, `401`, and `403` behavior without
bypassing guards. E2E requires
an isolated database whose name ends in `_test`; the suite applies migrations and
may clear competitor, team, and membership data. See
[Testing](docs/testing.md) for the required matrix.

Start the disposable PostgreSQL test database from the repository root:

```bash
docker compose -f compose.test.yml up -d
```

Then run the E2E suite from `backend/` with the isolated connection explicitly set:

```bash
NODE_ENV=test \
DATABASE_HOST=127.0.0.1 \
DATABASE_PORT=5434 \
DATABASE_NAME=race_db_test \
DATABASE_USERNAME=race_test \
DATABASE_PASSWORD=race_test \
DATABASE_SSL=false \
TEAM_MAX_MEMBERS=10 \
KEYCLOAK_BASE_URL=http://localhost:8080 \
KEYCLOAK_REALM=race-management \
KEYCLOAK_ISSUER=http://localhost:8080/realms/race-management \
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/race-management/protocol/openid-connect/certs \
KEYCLOAK_CLIENT_ID=race-backend \
KEYCLOAK_AUDIENCE=race-backend \
npm run test:e2e
```

The test database uses disposable, non-production credentials and `tmpfs`; stopping
the Compose project removes its data.

## Repository Structure

```text
.
├── .env.example           # Compose configuration template
├── AGENTS.md
├── README.md
├── compose.yml            # Current backend, PostgreSQL, and Keycloak stack
├── backend/               # NestJS API application
│   ├── Dockerfile
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

Keycloak is the role source of truth. They are API-specific client roles under
`race-backend`.

## Keycloak Integration

The frontend will use Authorization Code Flow with PKCE. It sends the resulting
Keycloak access token as `Authorization: Bearer <keycloak-access-token>`. NestJS
validates the RS256 signature through cached/rate-limited JWKS lookup, exact issuer,
expiration, Bearer token type, and configured audience. It extracts only known
client roles from `resource_access.race-backend.roles`. NestJS does not implement local login,
password storage, or token issuance.

Passport JWT with `jwks-rsa` is selected and dependency compatibility is confirmed;
demo users and client roles use a reproducible realm import. See [Security](docs/security.md).

## Demo Users and Component URLs

The imported realm creates three fictional development users. Their passwords come
from the root `.env` and are never stored in the realm JSON:

| Username         | API client role  |
| ---------------- | ---------------- |
| `race-admin`     | `ADMINISTRATOR`  |
| `race-organizer` | `RACE_ORGANIZER` |
| `race-viewer`    | `VIEWER`         |

The public `race-frontend` client uses Authorization Code Flow with mandatory PKCE
S256 and has Direct Access Grants disabled. The `race-backend` client is bearer-only.

Current and planned URLs:

| Component  | URL                                           | Status                                        |
| ---------- | --------------------------------------------- | --------------------------------------------- |
| NestJS API | `http://localhost:3000/api/v1`                | Current; `/auth/me` and `/users/me` protected |
| PostgreSQL | Host `localhost:5433`; Docker `postgres:5432` | Current                                       |
| Frontend   | `http://localhost:5173`                       | Planned, not present                          |
| Keycloak   | `http://localhost:8080`                       | Current Docker service                        |

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

- Competitor, team, race, registration, result, and local-profile behavior is
  implemented.
- Standings are not implemented. Audit writes cover profile provisioning and
  mutations to competitors, teams/memberships, races, registrations, and results;
  administrators can query them through `/api/v1/audit-logs`.
- Token validation, documented role policies, and active-profile checks protect all
  implemented domain controllers. Audit reads are administrator-only;
  administrative profile listing/status endpoints remain pending.
- The current Compose topology includes NestJS, PostgreSQL, and Keycloak; the
  frontend container is pending.
- The mandatory graphical frontend application is not implemented.
- No domain seeds exist. Three development-only Keycloak demo identities are
  provisioned reproducibly by realm import.

## Future Improvements

After all mandatory requirements are complete, optional improvements may include
CI, cloud deployment, WebSocket race updates, email notifications, Redis caching,
rate limiting, Testcontainers, CSV/PDF export, profile images, observability, soft
delete, optimistic locking, and idempotency keys. Bonus work must not displace
mandatory security, UI, persistence, or business-rule work.
