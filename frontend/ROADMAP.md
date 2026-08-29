# Frontend Implementation Roadmap

## Purpose

This roadmap defines the phased implementation of the complete graphical frontend
for the Great EIA Camel vs. Dwarf Racing System.

The frontend is a separate React, TypeScript, and Vite application under
`frontend/`. It authenticates with Keycloak through OpenID Connect Authorization
Code Flow with PKCE and consumes only the existing NestJS REST API under `/api/v1`.
It must never access PostgreSQL directly.

The files under `frontend/design-reference/premium-v0/` are an immutable visual
reference. They are not an API contract, domain model, authorization source, or
source of business rules.

## Implementation Status

| Phase    | Status   | Notes                                                                                                                                                                          |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 0  | Complete | Contract fidelity, endpoint/action routes, role gates, date-time conversion, and excluded v0-only concepts are represented in implementation and tests.                        |
| Phase 1  | Complete | Scaffold, strict TypeScript, Tailwind v4, local fonts, environment validation, quality tooling, npm lockfile, tests, and production build are verified.                        |
| Phase 2  | Complete | Responsive shell, navigation, visual primitives, forms, feedback states, dialog focus behavior, enum labels, tests, and browser visual QA are verified.                        |
| Phase 3  | Complete | Keycloak PKCE, API-backed identity/profile, gates, logout, and role navigation are verified with all three real demo identities and automated tests.                           |
| Phase 4  | Complete | Authenticated REST client, contract types, query serialization, API errors, TanStack Query policies, invalidation, cancellation, and MSW tests verified.                       |
| Phase 5  | Complete | Definitive protected routes, role gates, contextual navigation, and a responsive real-data dashboard with isolated states and fixed request bounds verified.                   |
| Phase 6  | Complete | Competitor list, URL filters, detail, administrator CRUD/status workflow, exact validation, conflict feedback, confirmations, and tests are verified.                          |
| Phase 7  | Complete | Team CRUD/status workflow, URL filters, current/history memberships, member management, conflict feedback, cache invalidation, and tests are verified.                         |
| Phase 8  | Complete | Race list/detail, browser-local date input, UTC conversion, draft editing, lifecycle transitions, delete/cancel behavior, role gates, and tests are verified.                  |
| Phase 9  | Complete | Race-scoped registration, participant search, approval/rejection, starting-position conflicts, role gates, and tests are verified.                                             |
| Phase 10 | Complete | Conditional result capture, official timing, audited correction, lifecycle conflicts, role gates, and tests are verified.                                                      |
| Phase 11 | Complete | Competitor/team standings, user administration, audit inspection, profile, logout, role gates, and tests are verified.                                                         |
| Phase 12 | Complete | Failure recovery, accessibility hardening, responsive/code-split UI, and the branded Keycloak theme are verified.                                                              |
| Phase 13 | Complete | 96 deterministic unit/component/MSW tests and four real-browser Keycloak, role, conflict, workflow, standings, and audit scenarios are verified.                               |
| Phase 14 | Complete | Multi-stage unprivileged frontend image, SPA fallback, same-origin API proxy, cache/security headers, healthchecks, Compose startup, restart, and E2E acceptance are verified. |
| Phase 15 | Complete | Setup, architecture, security, testing, evaluation, theme, limitations, troubleshooting, and a repeatable demonstration workflow are documented and verified.                  |

## Sources of Truth

Implementation decisions must follow these sources in this order:

1. The implemented NestJS controllers, DTOs, response DTOs, and enums under
   `backend/src/`.
2. `docs/api-contract.md`.
3. `docs/business-rules.md`.
4. `docs/security.md` and the accepted architecture decisions.
5. `frontend/design-reference/premium-v0/`, for visual direction only.

When the v0 reference conflicts with the backend, the backend always wins. Do not
add compatibility aliases for invented mock values and do not silently transform
them into real domain values.

Known v0-only concepts that must not enter production code include:

- The `INJURED` competitor status.
- The `SUSPENDED` team status.
- The `CLOSED_FOR_REGISTRATION` race status.
- Human-readable role values used as authorization identifiers.
- Stored competitor/team win-loss counters.
- Non-UUID identifiers such as `c1`, `t1`, and `r1`.
- Result times expressed as floating-point seconds.
- A UI role switcher that impersonates application roles.

Production types must use the exact API names and values, including
`ADMINISTRATOR`, `RACE_ORGANIZER`, `VIEWER`, `CLOSED`, integer millisecond result
fields, UUID v4 identifiers, and backend-derived standings.

## Definitive Frontend Stack

- React and strict TypeScript.
- Vite.
- React Router.
- Tailwind CSS v4 through the official Vite plugin.
- `keycloak-js` with Authorization Code Flow and PKCE S256.
- TanStack Query for remote server state, caching, mutations, and invalidation.
- React Hook Form and Zod for form state and immediate client validation.
- Lucide React for icons.
- `@fontsource/inter`, `@fontsource/oswald`, and
  `@fontsource/jetbrains-mono`.
- Vitest, React Testing Library, `user-event`, and MSW for frontend tests.
- Playwright for browser-level end-to-end tests.
- npm and a committed `package-lock.json`, consistent with the backend.

New dependencies must have a concrete responsibility and must be documented when
introduced. The frontend must not add another application-wide state manager unless
a demonstrated need remains after using React state, URL state, authentication
context, and TanStack Query.

## Implemented Structure

```text
frontend/
├── design-reference/
│   └── premium-v0/                 # Immutable design reference
├── public/
├── src/
│   ├── api/
│   │   ├── resources/
│   │   ├── api-client.ts
│   │   ├── api-error.ts
│   │   ├── pagination.ts
│   │   └── query-client.ts
│   ├── app/
│   ├── auth/
│   ├── components/
│   │   ├── feedback/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   ├── features/
│   │   ├── audit/
│   │   ├── competitors/
│   │   ├── dashboard/
│   │   ├── races/
│   │   ├── registrations/
│   │   ├── results/
│   │   ├── standings/
│   │   ├── teams/
│   │   └── users/
│   ├── hooks/
│   ├── routes/
│   ├── styles/
│   ├── types/
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
├── .env.example
├── Dockerfile
├── nginx.conf
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Cross-Cutting Rules

- Use response types that match backend DTOs exactly.
- Do not import NestJS DTO classes into the browser application.
- Do not expose TypeORM entities or infer undocumented relations.
- Keep filters, sorting, and pagination in URL search parameters.
- Use the backend error envelope and field-level `details` representation.
- Treat backend `401`, `403`, `404`, and `409` responses distinctly.
- Never store access or refresh tokens in local storage, session storage, IndexedDB,
  logs, query caches, or error reports.
- Never trust a frontend-supplied role or use hidden buttons as a security boundary.
- Do not reproduce backend transition or scoring calculations as an independent
  authority. UI transition hints improve usability; the backend remains final.
- Do not ship mock data in the runtime application.
- Use Spanish user-facing text while preserving exact API enum values internally.
- Provide loading, empty, success, validation, authorization, network, and general
  error states for every remote workflow.
- Confirm destructive or historically significant operations.
- Ensure forms and dialogs are usable by keyboard and have visible focus states.

## Phase 0 - Contract and Product Alignment

**Status: Complete.** Resource modules, API contract types, protected route map,
navigation, and action gates implement the endpoint and role matrices. Automated
tests cover the mapping, the accepted browser-local/UTC conversion, and the
exclusion of mock-only domain concepts.

### Objectives

- Build an endpoint-to-screen implementation matrix from the existing controllers
  and DTOs.
- Record exact request, response, query, error, pagination, and authorization
  requirements for each resource.
- Inventory reusable visual elements from the premium reference without adopting
  its domain types or mocks.
- Resolve product decisions that affect implementation before their corresponding
  screens are built.

### Required decisions

1. Define how users enter race date-times, which time zone is displayed, and how
   values are converted to ISO 8601 for the API. Update the owning documentation.
2. Treat a race as live only when its API status is `IN_PROGRESS`. The initial
   frontend may poll existing result endpoints; no WebSocket behavior may be
   implied.
3. Omit notifications until a real backend capability exists.
4. Replace the v0 global search with resource-specific searches supported by the
   existing API.
5. Keep registration lists restricted to `ADMINISTRATOR` and `RACE_ORGANIZER`, as
   implemented by the backend.
6. Build the first dashboard only from existing endpoints. Do not invent a
   dashboard endpoint. If request volume later justifies an aggregate endpoint,
   specify and implement it as a documented backend change.

### Accepted date-time decision

- Race date-time controls use `datetime-local` in the browser's current IANA time
  zone, which is displayed next to the fields and on the detail page.
- Before a request, local values are parsed as browser-local time and converted to
  an ISO 8601 UTC string with `Date.toISOString()`.
- API values are converted back into browser-local `datetime-local` values when a
  draft is edited, preserving the represented instant.
- The UI validates ordering and future creation dates for immediate feedback; the
  backend remains authoritative, especially when opening registration after time
  has elapsed.

### Deliverables

- Endpoint-to-screen matrix.
- Role-to-route and role-to-action matrix.
- Final route map.
- List of accepted visual tokens and patterns from v0.
- Documented date-time decision.

### Exit criteria

- Every planned field and action maps to an implemented API contract.
- No production type includes a v0-only status, field, identifier, statistic, or
  role value.
- Open product decisions are either resolved or explicitly excluded from the
  affected increment.

## Phase 1 - Application Scaffold and Quality Baseline

### Work

- Scaffold React + TypeScript with Vite inside `frontend/` without overwriting
  `design-reference/` or this roadmap.
- Enable strict TypeScript and configure `tsc --noEmit` as an explicit check.
- Configure ESLint, Prettier, aliases, Vitest, jsdom, and testing setup.
- Configure Tailwind CSS v4 through `@tailwindcss/vite`.
- Import the premium theme tokens and local Fontsource fonts.
- Add environment validation for required `VITE_*` values.
- Add scripts for development, build, type-checking, linting, formatting, unit
  tests, coverage, and browser tests.
- Commit the npm lockfile.

### Environment contract

```text
VITE_API_BASE_URL=/api/v1
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=race-management
VITE_KEYCLOAK_CLIENT_ID=race-frontend
```

Environment-specific public URLs must be injected at build/deployment time. No
client secret may exist in the frontend environment.

### Exit criteria

- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass.
- The empty application renders with the premium theme and local fonts.
- Missing or malformed public configuration fails with an understandable startup
  message.

## Phase 2 - Design System and Application Shell

### Work

- Extract visual primitives from `PremiumDashboard.tsx` rather than copying the
  complete component into runtime code.
- Implement `AppShell`, desktop sidebar, mobile navigation, top bar, page headers,
  panels, KPI cards, badges, tables, pagination, filters, form fields, dialogs,
  toasts, skeletons, and standard feedback states.
- Use semantic HTML and accessible dialog/focus behavior.
- Provide responsive alternatives for dense tables.
- Centralize Spanish labels for API enum values.

### Exit criteria

- The shell works at mobile, tablet, and desktop widths.
- Loading, empty, error, disabled, and confirmation states are demonstrated without
  relying on domain mocks.
- Components meet keyboard, labeling, contrast, and visible-focus requirements.

## Phase 3 - Keycloak Authentication and Authorization

### Work

- Initialize `keycloak-js` exactly once with the configured public client.
- Use Authorization Code Flow with PKCE S256.
- Implement `/login`, explicit login, logout, callback handling, and session
  initialization.
- Keep tokens in adapter memory and refresh them before protected API requests.
- Load validated identity and effective roles from `GET /api/v1/auth/me`.
- Load the local profile from `GET /api/v1/users/me`.
- Implement protected, anonymous, role-restricted, and active-profile route gates.
- Implement `/access-denied` and `/account-disabled`.
- Remove the reference design's role switcher.

### Authorization matrix

| Capability                   | Administrator | Race organizer | Viewer |
| ---------------------------- | :-----------: | :------------: | :----: |
| Read competitors and teams   |      Yes      |      Yes       |  Yes   |
| Manage competitors and teams |      Yes      |       No       |   No   |
| Manage races                 |      Yes      |      Yes       |   No   |
| Manage registrations         |      Yes      |      Yes       |   No   |
| Manage results               |      Yes      |      Yes       |   No   |
| Read results and standings   |      Yes      |      Yes       |  Yes   |
| Manage local user status     |      Yes      |       No       |   No   |
| Read complete audit log      |      Yes      |       No       |   No   |

### Exit criteria

- All three demo roles reach only their allowed routes and visible actions.
- Missing/invalid authentication and insufficient authorization produce different
  experiences.
- A disabled local profile is distinguished from a user with insufficient roles.
- No token or Keycloak client secret appears in persistent browser storage or logs.

## Phase 4 - REST Client and Remote State Foundation

### Work

- Implement a framework-independent fetch client.
- Add the Bearer token immediately before each protected request.
- Deduplicate concurrent token refresh attempts.
- Parse success bodies, `204 No Content`, and the stable backend error envelope.
- Map validation `details` to field errors.
- Serialize query parameters safely and omit empty values.
- Configure TanStack Query keys, cache policies, cancellation, mutations, and
  invalidation per resource.
- Define browser-safe TypeScript types for auth, profiles, competitors, teams,
  races, registrations, results, standings, audit, pagination, and errors.

### Error behavior

- `400`: field/request validation feedback.
- `401`: clear invalid session state and return to authentication safely.
- `403`: access-denied or disabled-profile experience as applicable.
- `404`: missing-resource experience.
- `409`: contextual business-conflict feedback.
- `500`: generic safe message and retry option.
- Network failure: distinguish unavailable API/connectivity from an API rejection.

### Exit criteria

- Unit tests cover query serialization, errors, `204`, pagination, and token-aware
  request behavior.
- MSW tests cover success, validation, conflict, authorization, server, and network
  responses.
- Components do not call `fetch` directly.

## Phase 5 - Routing and Real Dashboard

### Route map

```text
/login
/
/competitors
/competitors/new
/competitors/:id
/competitors/:id/edit
/teams
/teams/new
/teams/:id
/teams/:id/edit
/races
/races/new
/races/:id
/races/:id/edit
/races/:raceId/registrations
/races/:raceId/results
/results/:id/edit
/standings
/users
/users/:id
/audit
/audit/:id
/profile
/access-denied
/account-disabled
/*
```

### Dashboard behavior

- Query an `IN_PROGRESS` race and show the live presentation only when one exists.
- Poll that race's readable results at a conservative interval and show the last
  update time.
- Show upcoming races from existing race queries.
- Use collection `totalItems` for active-competitor counts.
- Show standings from the real standings endpoints.
- Show results from the latest completed race and label that scope accurately.
- If no race is in progress, feature the next scheduled race.
- Hide management shortcuts according to validated roles.
- Do not show registration counts to viewers when obtaining those counts would
  require an endpoint they cannot access.

### Exit criteria

- The dashboard contains no hard-coded league metrics or mock records.
- Every dashboard card handles loading, empty, partial failure, and retry states.
- No N+1 request pattern is introduced without measurement and documentation.

## Phase 6 - Competitors Vertical Slice

**Status: Complete.** Implemented with the exact competitor DTO fields and enums,
API-backed filtering and pagination, read-only role behavior, administrator-only
mutations, allowed lifecycle transitions, ambiguous delete/retire confirmation,
resource invalidation, and automated workflow coverage.

### Work

- List with API-supported search, type, status, sorting, and pagination.
- Detail page.
- Administrator-only creation, full update, status transition, and deletion.
- Confirm deletion/retirement behavior without predicting whether the backend will
  physically delete or retire a competitor.
- Map unique nickname and transition conflicts to understandable feedback.
- Respect exact backend date, weight, height, enum, and length validation.

### Exit criteria

- An administrator can complete the competitor workflow without Postman.
- Organizer and viewer have read-only experiences.
- URL state survives refresh and browser back/forward navigation.
- Tests cover success, field validation, duplicate nickname, authorization, empty
  list, and deletion confirmation.

## Phase 7 - Teams and Memberships Vertical Slice

**Status: Complete.** Implemented with the exact team DTO fields and two backend
statuses, API-backed list state, read-only role behavior, administrator mutations,
separate current and historical memberships, searchable competitor selection,
transactional conflict feedback, confirmations, and resource invalidation.

### Work

- Team list, filters, sorting, pagination, detail, create, full update, status
  transition, and deletion.
- Show current and historical memberships from team detail.
- Add eligible competitors and end active memberships.
- Surface duplicate membership, active-membership conflict, inactive-team, and
  capacity conflicts returned by the backend.
- Do not expose a team status other than `ACTIVE` or `INACTIVE`.

### Exit criteria

- An administrator can create a team and manage its members without Postman.
- Historical memberships remain visibly distinct from active memberships.
- Organizer and viewer remain read-only.
- Tests cover capacity/conflict behavior, role visibility, and cache invalidation.

## Phase 8 - Races Vertical Slice

**Status: Complete.** Implemented with the exact race DTO fields, types and
statuses, the accepted browser-local/UTC date-time conversion, API-backed list
state, read-only viewer behavior, administrator/organizer mutations, draft-only
editing, documented lifecycle transitions, optional cancellation reason,
delete-or-cancel confirmation, conflict feedback, and cache invalidation.

### Work

- Race list with API-supported search, status, type, sort, and pagination.
- Detail, creation, full update, status transitions, delete/cancel behavior.
- Date-time input based on the Phase 0 decision.
- Offer only transitions permitted by the documented lifecycle while treating
  backend validation as authoritative.
- Collect the optional transition reason where the UI action requires context.

```text
DRAFT -> OPEN_FOR_REGISTRATION -> CLOSED -> IN_PROGRESS -> COMPLETED
   \------------------------- CANCELLED -------------------------/
```

### Exit criteria

- Administrator and organizer can manage the full race lifecycle.
- Viewer sees race information without mutation actions.
- Past schedules, invalid deadlines, invalid transitions, and terminal races have
  understandable feedback.

## Phase 9 - Registrations Vertical Slice

**Status: Complete.** Implemented as a race-scoped, administrator/organizer-only
workflow with API-backed status filtering and pagination, participant selection
compatible with individual, team, and mixed races, pending registration creation,
approval, rejection, cancellation, conflict translation, input preservation, and
cross-resource cache invalidation. The registration response contains participant
IDs rather than participant projections, so the list links those exact IDs to
their resource detail instead of issuing N+1 requests or inventing display data.

### Work

- Restrict registration routes to administrator and race organizer.
- List registrations for a race with status and pagination.
- Register exactly one competitor or team, depending on compatible race type.
- Approve with a positive unique starting position.
- Reject with a required clear reason.
- Cancel/delete with confirmation.
- Surface deadline, eligibility, duplicate participation, team composition,
  capacity, race-type, and starting-position conflicts from the backend.

### Exit criteria

- The full registration workflow is possible without Postman.
- The frontend sends neither both participant identifiers nor an empty participant
  selection.
- Viewer cannot navigate to or invoke registration operations.
- Concurrency/business conflicts preserve user input and allow recovery.

## Phase 10 - Results Vertical Slice

**Status: Complete.** Implemented with read access for every application role,
race-scoped status filtering and pagination, paginated approved-registration
selection for managers, conditional finished/non-finished payloads, safe
`MM:SS.mmm` conversion to integer milliseconds, backend-authoritative final-time
display, recoverable conflict feedback, and audited correction with explicit
confirmation for official results. Neither creation nor correction ever sends
`finalTimeMs`, and viewers receive no mutation controls or correction-route access.

### Work

- List race results for all read roles.
- Allow administrator and organizer to record a result for an approved
  registration.
- For `FINISHED`, require final position and positive raw time.
- For non-finished statuses, omit raw time and final position and send zero penalty
  time according to the backend contract.
- Convert human-friendly time entry to safe integer milliseconds.
- Display backend-calculated `finalTimeMs`; never calculate an authoritative final
  time or winner in the browser.
- Support audited correction of existing results, including completed races.
- Use stronger confirmation language for correction of official results.

### Exit criteria

- Result entry, non-finish outcomes, and official correction work without Postman.
- The UI never sends `finalTimeMs` as input.
- Tests cover conditional fields, millisecond conversion, duplicate winner/position
  conflicts, viewer restrictions, and correction invalidation.

## Phase 11 - Standings, Users, Audit, and Profile

**Status: Complete.** Implemented official competitor/team standings with
API-supported filters, sorting and pagination; administrator-only local user
profile management with self-disable prevention; administrator-only immutable
audit list/detail with exact filters and escaped JSON snapshots; and a profile
screen combining validated Keycloak identity, effective roles, local profile
status and logout. Statistics remain server-calculated, audit data is never
interpreted as HTML, and the frontend exposes no credential or role editing.

### Standings

- Competitor and team views with search, filters, sorting, and pagination.
- Overall points table and zero-point result statuses.
- Shared positions and nullable best time rendered correctly.
- Use only backend-calculated points and statistics.

### Users

- Administrator-only profile list, filters, detail, and status changes.
- Distinguish Keycloak identity ownership from local application status.
- Do not offer self-disable as a valid action.

### Audit

- Administrator-only list and detail.
- Filters for action, entity type, actor, entity, and date interval.
- Render previous/new JSON values as escaped data, never as HTML.
- No audit create, update, or delete controls.

### Profile

- Combine safe identity context from `/auth/me` with local profile information from
  `/users/me`.
- Show effective roles and local status.
- Provide Keycloak logout.
- Do not provide credential or role editing.

### Exit criteria

- Standings update after result mutation without client-side recalculation.
- Only administrators can reach users and audit routes.
- Audit rendering cannot execute stored content.
- Profile and logout work for all roles, including the defined disabled-profile
  experience.

## Phase 12 - UX, Accessibility, Keycloak Theme, and Failure Hardening

**Status: Complete.** Added route-level recovery without exposing render details,
route-based code splitting, keyboard-scrollable responsive tables, long-value
wrapping, automatic accessible field associations, first-error focus, focused
submission feedback, duplicate-action protection, appropriate live-region
semantics, and reduced-motion overrides. The `race-management` Keycloak login
theme now inherits the version-pinned `keycloak.v2` templates, uses only local
assets, defaults the realm to Spanish, includes an explicit built-in fallback,
and was verified in the running Keycloak 26.7.0 image at desktop and mobile
widths. Credential collection remains entirely owned by Keycloak.

### Work

- Ensure every form preserves input after recoverable failures and focuses the
  first invalid field.
- Prevent double submission and duplicate destructive actions.
- Add consistent success notifications and contextual retry actions.
- Verify responsive tables, overflow, long names, nullable fields, and empty
  descriptions.
- Add route-level error boundaries and unexpected-render recovery.
- Verify Spanish labels, date/time/measurement formatting, and enum translations.
- Perform keyboard-only and screen-reader-oriented checks.
- Verify reduced-motion behavior where animation is used.

### Branded Keycloak experience

The production login must not use Keycloak's generic visual theme. Build and
maintain a dedicated `race-management` Keycloak theme that visually belongs to
the same product as the React application while preserving Keycloak as the sole
owner of credential collection and authentication.

- Apply the EIA Racing League logo, premium dark palette, typography, spacing,
  controls, focus treatment, and responsive behavior to the Keycloak login UI.
- Cover every user-facing authentication screen enabled by the realm, including
  sign-in, invalid credentials, expired sessions, password recovery, required
  actions, informational messages, and provider-level errors.
- Keep all authentication forms owned and submitted by Keycloak; do not recreate
  username/password inputs or credential handling in React.
- Use local, versioned assets only. Do not depend on third-party font or asset
  CDNs, and do not embed credentials, tokens, or environment-specific secrets.
- Preserve semantic labels, visible keyboard focus, useful error associations,
  sufficient contrast, zoom support, and mobile layouts.
- Pin theme compatibility to the repository's Keycloak version and document the
  verification required before upgrading Keycloak.
- Provide a deliberate fallback to a safe built-in Keycloak theme if the custom
  theme cannot be loaded; authentication must remain functional.
- Configure the development realm to select the custom login theme so a clean
  environment receives the branded experience automatically.

### Exit criteria

- All required loading, empty, validation, conflict, authorization, network, and
  unexpected-error states are visible and understandable.
- Critical workflows are keyboard operable.
- No internal IDs are emphasized unless required for support/audit context.
- Keycloak sign-in and related authentication screens no longer show the generic
  Keycloak appearance and remain visually consistent with the React application.
- The branded login works on mobile and desktop, passes keyboard and contrast
  checks, and never moves credential handling into the frontend.

## Phase 13 - Automated Testing and Main Workflow

**Status: Complete.** Vitest now covers 96 deterministic unit, component, and
MSW-backed cases, including shared feedback semantics and the complete documented
API error range. Playwright runs sequentially against the real local Keycloak and
NestJS services, loads credentials only from external environment variables, and
verifies the branded Spanish authentication experience, invalid credentials,
password recovery, responsive behavior, organizer/viewer policy, field validation,
starting-position conflict preservation, and the complete administrator workflow
through official standings and audit detail.

### Unit and component tests

- Date/time and millisecond conversion.
- Query serialization and pagination.
- API error mapping.
- Role and action visibility.
- Race transition presentation.
- Conditional result fields.
- Loading, empty, error, and confirmation components.

### MSW integration tests

- Successful reads and mutations.
- Field validation failures.
- `401`, `403`, `404`, `409`, `500`, and network failure.
- Query invalidation and refreshed UI after mutations.
- Empty collections and multi-page collections.

### Playwright end-to-end tests

Run against the real Compose environment and demo identities configured through
environment variables:

1. Log in as administrator.
2. Create a competitor.
3. Create a team and add a member.
4. Create a future race.
5. Open registration.
6. Register and approve participants.
7. Close registration and start the race.
8. Record results.
9. Complete the race.
10. Verify updated standings.
11. Verify the audit entry.
12. Verify organizer capabilities.
13. Verify viewer restrictions.
14. Demonstrate a field validation error.
15. Demonstrate a business conflict.
16. Verify the branded Keycloak sign-in, invalid-credential, and recovery/error
    experiences at mobile and desktop widths.

### Exit criteria

- Unit/component and MSW suites pass deterministically.
- The main browser workflow passes from Keycloak login to official standings.
- Browser tests confirm the custom Keycloak theme is active and the authentication
  flow remains accessible and functional.
- Test credentials are supplied externally and no credential is committed.

## Phase 14 - Docker Compose Integration

**Status: Complete.** The frontend now builds in a Node 24 stage and runs from a
26 MB Nginx image as the unprivileged `nginx` user with a read-only filesystem.
Nginx provides React Router fallback, a same-origin `/api/` proxy, immutable
hashed-asset caching, non-cacheable `index.html`, security headers, and a health
endpoint. Compose builds all application images, waits for real backend and
identity health, and publishes the complete product at `http://localhost:5173`.
The four Playwright scenarios passed against the containerized frontend. A full
stack restart preserved PostgreSQL records and recovered every healthcheck; the
branded Keycloak authentication flow also passed after restart. Runtime image
inspection confirmed that source files, tests, development dependencies, and
secret-variable names are absent.

Docker Compose support is a mandatory product requirement, not an optional release
task. It must be implemented and verified before the frontend is considered
complete.

### Frontend image

- Add a multi-stage `frontend/Dockerfile`.
- Build the static Vite application in a Node build stage.
- Serve the built assets from an unprivileged, production-suitable web-server
  stage.
- Add an SPA fallback so direct navigation to React Router paths returns
  `index.html`.
- Add appropriate immutable caching for hashed assets and no-cache behavior for
  `index.html`.
- Add basic security headers without breaking Keycloak redirects or required asset
  loading.

### Keycloak image and theme

- Store the custom theme under `infrastructure/keycloak/themes/race-management/`.
- Copy the versioned theme into the Keycloak image during its Docker build; do not
  mount an untracked local theme as a production requirement.
- Ensure the realm import selects `race-management` as its login theme.
- Keep theme assets cacheable without allowing stale assets to survive a theme or
  Keycloak upgrade unnoticed.
- Build the Keycloak image from a clean context and verify that all themed login,
  recovery, required-action, and error pages render without missing assets.

### Compose changes

- Add a `frontend` service to the repository root `compose.yml`.
- Build it from `frontend/Dockerfile`.
- Publish a documented configurable host port, with `5173` as the local default if
  it remains compatible with the Keycloak realm configuration.
- Join the existing `race_network`.
- Proxy `/api/` from the frontend web server to the internal `backend:3000` service,
  preserving the `/api/v1` path.
- Keep the browser-facing Keycloak URL public and environment-specific; do not use
  the internal Compose hostname `keycloak` in browser configuration.
- Add a frontend healthcheck.
- Add sensible startup ordering without treating `depends_on` as a substitute for
  runtime error handling.
- Update `.env.example` with non-secret frontend configuration and port values.
- Update the Keycloak development redirect URIs/web origins if the final local
  frontend origin changes.

### Deployment behavior

- Browser API requests should use the same frontend origin through `/api/v1` where
  practical. Development should mirror this through the Vite proxy.
- Keycloak continues to use its public browser-reachable URL.
- Production URLs require an environment-specific Keycloak realm configuration;
  wildcard production origins or redirect URIs are not allowed.
- No `VITE_*` value may contain a secret because Vite embeds public variables in
  the browser bundle.

### Verification

- Build the frontend image from a clean context.
- Start PostgreSQL, Keycloak, backend, and frontend with the documented Compose
  command.
- Confirm every service becomes healthy.
- Open the frontend through its published port, confirm the branded Keycloak UI,
  and complete login.
- Refresh a nested React Router URL directly.
- Call the NestJS API through the frontend proxy.
- Complete the main racing workflow without Postman.
- Restart the stack and verify PostgreSQL/Keycloak persistence and frontend
  recovery.
- Inspect the built assets for accidental secrets, tokens, or private URLs.

### Exit criteria

- `compose.yml` includes frontend, NestJS, PostgreSQL, and Keycloak on the intended
  topology.
- One documented command starts the complete application.
- Login, API requests, route refresh, logout, and the main workflow operate from
  the containerized frontend.
- The containerized Keycloak service serves the versioned `race-management` theme
  rather than the generic login appearance.
- The frontend image contains only production runtime assets and required server
  configuration, not development dependencies or source secrets.

## Phase 15 - Documentation, Evaluation, and Demonstration Readiness

**Status: Complete.** The root/frontend setup, system decisions, Keycloak theme,
known limitations, troubleshooting, evaluation traceability, and timed
demonstration workflow now describe the verified implementation. Final recording
and team presentation remain delivery activities outside source implementation.

### Work

- Update the root and frontend README files with verified local and Compose setup.
- Document public frontend variables, ports, Keycloak client behavior, commands,
  testing, and troubleshooting.
- Update architecture, security, testing, roadmap, API, and evaluation documents
  when implementation changes their current status.
- Document the resolved time-zone policy and known limitations.
- Document which visual patterns came from the premium v0 reference and which were
  changed for contract fidelity, accessibility, or security.
- Document the custom Keycloak theme structure, branding assets, local preview,
  accessibility checks, fallback behavior, and upgrade-compatibility procedure.
- Prepare the required demonstration workflow and handled-error examples.

### Exit criteria

- A new developer can run the full system from documented non-secret configuration.
- The graphical interface completes the required demonstration without Postman.
- The evaluation checklist reflects verified behavior rather than planned work.
- No unresolved frontend-critical `Decision pending` remains hidden.

## Recommended Delivery Order

1. Phase 0: contract and product alignment.
2. Phase 1: scaffold and quality baseline.
3. Phase 2: design system and shell.
4. Phase 3: Keycloak authentication and authorization.
5. Phase 4: REST client and remote state.
6. Phase 5: routing and real dashboard.
7. Phase 6: competitors.
8. Phase 7: teams and memberships.
9. Phase 8: races.
10. Phase 9: registrations.
11. Phase 10: results.
12. Phase 11: standings, users, audit, and profile.
13. Phase 12: UX, accessibility, custom Keycloak theme, and failure hardening.
14. Phase 13: automated main-workflow coverage.
15. Phase 14: complete Docker Compose integration and verification.
16. Phase 15: documentation and demonstration readiness.

Docker foundations may be prepared earlier, but Phase 14 remains the formal full
stack acceptance gate after all functional slices exist.

## Per-Phase Definition of Done

A phase is complete only when:

- Its code compiles with strict TypeScript.
- Relevant linting and formatting checks pass.
- Relevant tests pass.
- No runtime mock is introduced.
- API fields and enum values match the implemented backend.
- Authorization behavior matches backend controller policy.
- Loading, empty, error, and success behavior is implemented where applicable.
- Accessibility and responsive behavior have been checked for changed screens.
- Documentation is updated when a contract, decision, command, or configuration
  changes.
- The application remains buildable and the previously completed workflow remains
  functional.

## Final Definition of Done

The frontend is complete when:

- It contains no production dependency on `design-reference/premium-v0/data.ts` or
  other mock data.
- All required screens and role-restricted workflows exist.
- The complete racing workflow can be performed through the UI without Postman.
- Keycloak login/logout and PKCE work for all three roles.
- The frontend never accesses PostgreSQL directly.
- The backend remains the source of truth for authorization, transitions,
  eligibility, timing, scoring, and conflicts.
- Required loading, empty, validation, conflict, authorization, network, and
  unexpected-error states are handled.
- Unit, integration-style, and browser E2E tests pass.
- The full application starts and works through Docker Compose.
- Direct SPA route refresh and the `/api/v1` proxy work in the containerized
  environment.
- No secret, credential, token, raw stack trace, or unintended internal data is
  exposed.
- Documentation and the evaluation checklist match the verified implementation.
