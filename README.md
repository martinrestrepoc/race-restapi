# Great EIA Camel vs. Dwarf Racing System

A NestJS REST API for managing competitors, teams, races, registrations, official
results, standings, and audit records for a fictional racing league.

The product combines this backend with a separate graphical frontend, PostgreSQL,
and Keycloak. The frontend authenticates through OpenID Connect, calls the protected
API over HTTP, and never accesses PostgreSQL directly. This repository is organized
as a monorepo: the NestJS application lives under `backend/` and the React/Vite
application under `frontend/`. All required domain modules, authentication, audit,
standings, demonstration seeds, graphical workflows, automated tests, and the full
container topology are implemented.

## Objective

Deliver a secure and usable system that persists racing data, enforces the documented
business rules, supports role-based workflows, exposes a consistent REST API, and
runs reproducibly through Docker Compose.

## Team Members

```text
Sebastian Giraldo, Miguel Zuleta y Martin Restrepo
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

The definitive stack is Node.js 24, TypeScript, NestJS, TypeORM,
PostgreSQL, Keycloak, OpenID Connect, OAuth 2.0, Docker, Docker Compose, Jest,
`@nestjs/testing`, Supertest, React 19, Vite, TanStack Query, Vitest, Testing
Library, Playwright, `class-validator`, and `class-transformer`.

Current repository state:

- Package manager: npm (separate committed lockfiles under `backend/` and
  `frontend/`).
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
- A Compose stack for the React frontend, NestJS, PostgreSQL, and Keycloak is
  configured. Reproducible domain demonstration seeds are present.
- The selected and containerized runtime is Node.js 24.

## Architecture

NestJS is the resource server and owner of business rules, domain authorization,
REST behavior, application data, and audit records. Keycloak owns identities,
credentials, sessions, token issuance, and authorization roles. TypeORM maps
domain persistence to PostgreSQL and reviewed migrations evolve the schema. The
frontend is a separate public client of both Keycloak and this API.

Detailed boundaries and the implemented module layout are in
[Architecture](docs/architecture.md). The conceptual persistence model is in
[Database model](docs/database-model.md).

## Prerequisites

- Node.js 24.
- npm.
- Docker with Docker Compose, when using the containerized development stack.
- Alternatively, a locally accessible PostgreSQL instance when running NestJS
  directly with npm.
- Keycloak 26.7.0 is built and started by Docker Compose.
- React/TypeScript/Vite frontend under `frontend/`.

## Installation

Install dependencies for direct local development:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

## Environment Configuration

For the complete Compose stack, create the root environment from its non-secret
template and replace every password placeholder:

```bash
cp .env.example .env
```

For a backend process run directly with npm, use `backend/.env.example` instead:

```bash
cp backend/.env.example backend/.env
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

From `backend/`, the API can be run in watch mode:

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

Run the frontend development server from `frontend/` with `npm run dev`. Its
validated public variables are documented in `frontend/.env.example`; never place a
secret in a `VITE_*` variable because it is embedded in the browser bundle.

## Docker

The Compose stack starts the React frontend, NestJS, PostgreSQL, and Keycloak.
PostgreSQL hosts separate application and Keycloak databases with distinct
credentials. An idempotent setup job provisions the Keycloak database even when
the PostgreSQL volume already exists. Keycloak uses an optimized pinned image,
management-port healthchecks, and a reproducible realm import. The backend runs
pending TypeORM migrations before starting the API. The frontend uses an
unprivileged, read-only Nginx runtime with SPA fallback and a same-origin API proxy.

Create the Compose environment file at the repository root, replace every password
placeholder with a different local value, and start the services:

```bash
cp .env.example .env
# Edit PostgreSQL, Keycloak database, bootstrap-admin, and demo-user passwords.
docker compose up -d --build
docker compose ps
```

The graphical application is available at `http://localhost:5173`, the API at
`http://localhost:3000/api/v1`, and Keycloak at `http://localhost:8080` by default.
PostgreSQL is
published at `localhost:5433` by default so it does not conflict with a PostgreSQL
instance already using port `5432`. Both ports can be changed in the root `.env`.
Inside the Docker network, the backend connects to `postgres:5432` and Nginx
proxies `/api/` to `backend:3000` without exposing an internal hostname to the
browser. If the frontend port changes, keep `FRONTEND_HOST_PORT` and
`FRONTEND_PUBLIC_URL` aligned and update the persisted Keycloak client origin.

Useful commands:

```bash
docker compose logs -f backend
docker compose logs -f keycloak
docker compose logs -f frontend
docker compose down
```

`docker compose down` preserves database data. Running `docker compose down -v`
also deletes the named PostgreSQL volume and all data stored in it.

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
are present. After applying them, load or refresh the deterministic domain demo
dataset with:

```bash
cd backend
npm run seed
```

The seed runs in one transaction and is idempotent through fixed UUIDs. It creates
five dwarfs, two camels, two medium competitors, two teams with memberships, three
races in `DRAFT`, `OPEN_FOR_REGISTRATION`, and `COMPLETED`, plus five approved
registrations and official results for the completed race. Re-running the command
refreshes those same demo records without duplication. It refuses to run while
migrations are pending.

No `UserProfile`, Keycloak identity, role, credential, token, or secret is created.
Keycloak demo accounts remain provisioned exclusively through the reproducible
realm setup.

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

Unit and PostgreSQL-backed E2E tests cover the implemented domain modules,
including the complete race/registration/result workflow, concurrent duplicate
registration, result correction, audit attribution, and role boundaries. The
security suite uses disposable RSA keys and a local JWKS issuer to cover signature,
issuer, audience, expiration, token type, role, `401`, and `403` behavior without
bypassing guards. Seed tests verify dataset composition, idempotency, standings,
and the absence of identity records. The unit suite contains 100 tests and enforces
global coverage minimums of 75% statements, 65% branches, 45% functions, and 75%
lines; the 28 E2E tests and security suite remain separate from that measurement.
E2E requires an isolated database whose name ends in `_test`; the suite applies
migrations and may clear domain and local-profile data. See
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
the Compose project removes its data. Frontend verification runs from `frontend/`:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Playwright reuses the containerized frontend on port `5173` when it is running and
authenticates the three demo roles against real Keycloak. Browser E2E creates unique
development records and must never target production.

## Repository Structure

```text
.
├── .env.example           # Compose configuration template
├── AGENTS.md
├── README.md
├── compose.yml            # Complete local product topology
├── backend/               # NestJS API application
│   ├── Dockerfile
│   ├── src/               # Auth, domain, persistence, audit, and standings modules
│   ├── test/              # Backend E2E tests
│   ├── package.json
│   └── package-lock.json
├── docs/                  # Authoritative project documentation
├── frontend/              # React/TypeScript/Vite application and browser tests
├── keycloak/              # Realm import and versioned custom login theme
└── postman/               # Importable API verification suite
```

The modular `backend/src/` and frontend boundaries are documented in
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

The frontend uses Authorization Code Flow with PKCE S256. It sends the resulting
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
The development-only `race-postman` public client uses Authorization Code Flow with
PKCE S256 and Postman's HTTPS callback; it has no secret or password grant.

## Postman API Verification

The importable [Postman suite](postman/README.md) contains 85 requests organized by
module and covers all 41 implemented method/path combinations, including the full
race workflow and role boundaries. Import the collection and local environment,
then obtain administrator, organizer, and viewer access tokens through the
development `race-postman` PKCE client. Tokens remain empty secret environment
values in Git.

Validate collection structure and endpoint coverage without contacting the API:

```bash
node postman/validate-collection.mjs
```

Local component URLs:

| Component  | URL                                           | Status                                        |
| ---------- | --------------------------------------------- | --------------------------------------------- |
| NestJS API | `http://localhost:3000/api/v1`                | Current; `/auth/me` and `/users/me` protected |
| PostgreSQL | Host `localhost:5433`; Docker `postgres:5432` | Current                                       |
| Frontend   | `http://localhost:5173`                       | Current graphical application                 |
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
- [Demonstration and troubleshooting guide](docs/demonstration-guide.md)
- [Frontend roadmap](frontend/ROADMAP.md)

## Known Limitations

- Local profile administration does not modify Keycloak credentials, sessions, or
  roles; those remain Keycloak administrator responsibilities.
- Keycloak login events are not imported into the application audit log. Audit
  retention and profile anonymization policies are not yet product requirements.
- The dashboard polls while a race is in progress; there is no WebSocket channel or
  notification backend.
- The local stack uses HTTP and a single-node Keycloak cache. Non-local deployment
  requires TLS, exact redirect/origin configuration, secret management, and a
  supported high-availability topology where applicable.
- Realm startup import creates an absent realm but does not overwrite a realm
  already persisted in PostgreSQL; later realm changes require an administrative
  migration or an intentional local reset.
- Browser E2E creates uniquely named development data and is not a production test.

For startup, login, stale-realm, port, migration, proxy, and browser-test recovery,
follow the [demonstration and troubleshooting guide](docs/demonstration-guide.md).

## Future Improvements

After all mandatory requirements are complete, optional improvements may include
CI, cloud deployment, WebSocket race updates, email notifications, Redis caching,
rate limiting, Testcontainers, CSV/PDF export, profile images, observability, soft
delete, optimistic locking, and idempotency keys. Bonus work must not displace
mandatory security, UI, persistence, or business-rule work.
