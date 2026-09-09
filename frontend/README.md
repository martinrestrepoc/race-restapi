# Frontend

React, TypeScript, and Vite application for the Great EIA Camel vs. Dwarf Racing
System. Follow the phased work in the
[Frontend Implementation Roadmap](ROADMAP.md).

The application authenticates directly with Keycloak using Authorization Code
Flow with PKCE and consumes the NestJS REST API. It never connects directly to
PostgreSQL.

The files under `design-reference/premium-v0/` provide visual direction only. The
implemented backend API and its DTOs remain the source of truth for fields, enum
values, roles, validation, and business behavior.

## Current status

Phases 0 through 15 are complete. Authentication and authorization have been
verified against the Dockerized Keycloak and NestJS services with the
administrator, race-organizer, and viewer demo identities. The application uses
Keycloak Authorization Code Flow with PKCE S256, obtains effective roles from
`/api/v1/auth/me`, obtains the local profile from `/api/v1/users/me`, keeps tokens
in adapter memory, and distinguishes anonymous, forbidden, disabled-profile, and
authenticated states.

The remote-state foundation provides a framework-independent authenticated REST
client under `src/api/`, browser-safe types that mirror the implemented backend
DTOs, stable validation/error mapping, and typed operations for every current API
resource. TanStack Query owns remote caching, cancellation, retry policy, and
resource invalidation. MSW verifies success, pagination, validation, authorization,
conflict, server, malformed-response, and network-failure behavior.

The authenticated landing page is now a real-data dashboard. It highlights the
active or next race, polls readable live results every 30 seconds, shows upcoming
races, active-competitor totals, official standings, and results from the latest
completed race. Requests and shortcuts respect the authenticated role, each panel
recovers independently, and no dashboard metric is hard-coded or backed by mock
records. The complete route map, role gates, and planned domain vertical slices
through standings, users, audit, and profile are implemented.

The competitors module is the first complete domain vertical slice. All authenticated
roles can search, filter, sort, paginate, and inspect competitor records. An
administrator can create and fully edit competitors, apply only the documented
status transitions, and confirm the backend's delete-or-retire operation. Forms
mirror the backend's enum, date, numeric precision, positivity, and length rules;
server validation and duplicate-nickname conflicts remain authoritative and are
shown next to the relevant field.

The teams module now provides the second complete domain vertical slice. All read
roles can filter and inspect teams, including clearly separated active and
historical memberships. Administrators can create and fully edit teams, change
between `ACTIVE` and `INACTIVE`, confirm delete-or-deactivate behavior, search for
competitors to add, and finalize active memberships without erasing history.
Capacity, inactive-team, duplicate-membership, and other-active-team conflicts are
kept authoritative in the backend and translated into actionable interface
feedback.

The races module completes the third domain vertical slice. Viewers can filter and
inspect the official calendar, while administrators and race organizers can create
draft races, edit them, move through the documented lifecycle, provide an optional
cancellation reason, and confirm delete-or-cancel behavior. Date-time controls use
the browser's displayed time zone and are converted to UTC ISO 8601 strings for the
API. Invalid ordering, past creation schedules, insufficient participants, missing
results, invalid transitions, and terminal states receive explicit feedback.

Registrations and results complete the operational race workflow. Administrators
and race organizers can register compatible competitors or teams, approve or
reject participation, assign starting positions, record conditional outcomes,
and perform explicitly confirmed audited corrections. Official final times,
points, winners, conflicts, and lifecycle rules always remain backend-owned.

Standings, local user administration, immutable audit inspection, and the current
user profile are available with their exact backend role gates. The frontend does
not edit Keycloak credentials or roles and does not interpret audit JSON as HTML.

The interface hardening pass adds recoverable route failures, accessible form
errors and notifications, duplicate-action protection, responsive and
keyboard-scrollable data tables, reduced-motion support, and route-based code
splitting. The initial production JavaScript chunk remains below Vite's 500 kB
warning threshold; domain pages load on demand.

The automated acceptance layer contains 100 Vitest unit/component/MSW tests and
four sequential Playwright scenarios. The real-browser suite covers the branded
Keycloak sign-in, invalid credentials and recovery, administrator/organizer/viewer
permissions, frontend field validation, an authoritative backend conflict, and
the complete racing workflow through official standings and audit detail.

## Branded Keycloak login

The realm selects the local `race-management` login theme automatically on a
clean Compose environment. It inherits Keycloak 26.7.0's `keycloak.v2` templates,
so sign-in, invalid credentials, password recovery, required actions,
informational screens, and provider errors remain native Keycloak flows. Only
presentation and safe messages are customized.

The theme source and upgrade/fallback checklist live under
`../infrastructure/keycloak/themes/race-management/`. If an older persistent realm
predates this setting, select **race-management** under **Realm settings > Themes >
Login theme** once; realm imports deliberately do not overwrite existing realm
configuration. The safe emergency fallback is **keycloak.v2**.

## Local configuration

Copy `.env.example` to `.env` and adjust only public, environment-specific values:

```text
VITE_API_BASE_URL=/api/v1
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=race-management
VITE_KEYCLOAK_CLIENT_ID=race-frontend
```

Vite exposes every `VITE_*` value to the browser. Never place a client secret,
credential, or token in these variables.

## Commands

After installing dependencies with `npm install`:

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
```

Install the matching Chromium runtime once and run the real-browser suite with
the local PostgreSQL, Keycloak, and backend Compose services active:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright reads the ignored repository-root `.env` and accepts
`KEYCLOAK_DEMO_ADMIN_PASSWORD`, `KEYCLOAK_DEMO_ORGANIZER_PASSWORD`, and
`KEYCLOAK_DEMO_VIEWER_PASSWORD`. In CI, the equivalent `E2E_ADMIN_PASSWORD`,
`E2E_ORGANIZER_PASSWORD`, and `E2E_VIEWER_PASSWORD` variables can be injected by
the secret store. Never prefix these values with `VITE_` or commit them. The suite
creates uniquely named development records and must never target production.

The development server listens on `http://localhost:5173` and proxies `/api` to the
NestJS development API on `http://localhost:3000`.

For a real login smoke test, start PostgreSQL, Keycloak, and NestJS from the
repository root before starting Vite. The Keycloak development realm already
allows `http://localhost:5173` for the public `race-frontend` client. Do not place
demo passwords in frontend environment files.

## Docker Compose

The repository-root Compose stack builds the frontend in a Node 24 stage and
serves only the generated static assets from an unprivileged Nginx runtime. Start
the complete PostgreSQL, Keycloak, NestJS, and frontend product from the repository
root:

```bash
docker compose up -d --build
docker compose ps
```

The graphical application is available at `http://localhost:5173`. Nginx proxies
same-origin `/api/v1` requests to the internal `backend:3000` service and returns
`index.html` for direct React Router navigation. `FRONTEND_HOST_PORT` controls the
published port and `FRONTEND_PUBLIC_URL` controls the Keycloak redirect origin;
keep both aligned. `VITE_KEYCLOAK_URL` is compiled from the public
`KEYCLOAK_BASE_URL`, never from the internal `keycloak` hostname.

The runtime filesystem is read-only except for an in-memory `/tmp`, runs as the
`nginx` user, and contains no source files, tests, Node dependencies, or secrets.
Hashed assets are cached immutably while `index.html` is never cached.

## Design traceability

The immutable v0 reference contributed the dark studio palette, electric-lime
accent, Oswald/Inter/monospace typography, compact sidebar, KPI cards, bordered
panels, and dense data tables. Those patterns were rebuilt as responsive,
keyboard-accessible React components.

Production behavior deliberately differs from the mock: every field, enum, action,
role, identifier, result time, and statistic maps to the backend contract. The
global fake search, role impersonation switch, invented notifications and live
states, mock identifiers, and unsupported statuses were removed. Runtime code does
not import the design reference or its mock `data.ts`.

## Known limitations and troubleshooting

- Live dashboard information uses bounded polling rather than WebSockets, and
  there is no notifications API.
- User administration controls local application access only; Keycloak owns roles,
  credentials, sessions, and recovery.
- The browser displays and edits race dates in its current IANA time zone and sends
  the represented instant as ISO 8601 UTC. Collaborators in different zones will
  see the same instant rendered in their own zone.
- The local Compose environment uses HTTP. A non-local deployment must use TLS and
  exact Keycloak origins, redirect URIs, and logout URIs.
- Playwright creates uniquely named development data and must not target production.

For unhealthy containers, occupied ports, stale realm imports, login redirects,
migrations, API proxy errors, and test recovery, use the repository
[demonstration and troubleshooting guide](../docs/demonstration-guide.md).
