# Implementation Roadmap

## Status

This roadmap incorporates the accepted decisions in
[Architecture Decision Records](adr/README.md). It is a delivery order, not evidence
that a phase is implemented.

## Phase 0: Contract and Baseline

- Obtain and verify the academic source PDF before defining the points table.
- Resolve the remaining decisions listed at the end of this document.
- Confirm Node.js 24 compatibility and align Node/Jest TypeScript tooling.
- Create a traceable Git baseline before implementation work.
- Plan the repository move from the current backend-at-root layout to
  `backend/` plus `frontend/`.

Exit criteria: the points policy or its explicit pending status is accepted, the
dependency compatibility matrix is recorded, and no schema-shaping contradiction
remains.

## Phase 1: Repository and Reproducible Infrastructure

- Move the existing NestJS application to `backend/` without changing behavior.
- Scaffold the React/TypeScript/Vite application under `frontend/`.
- Add typed non-secret environment configuration and `.env.example`.
- Add Docker Compose with the API, frontend, one PostgreSQL server, and Keycloak.
- Initialize separate application and Keycloak databases and credentials.
- Add reviewed Keycloak realm import with public frontend client, API audience,
  client roles, and disposable demo users.

Exit criteria: all containers become healthy and Keycloak can issue an access token
with the expected audience and client-role claims.

## Phase 2: Backend Walking Skeleton

- Configure `/api/v1`, global validation, serialization, and uniform errors.
- Configure TypeORM with migrations and `synchronize: false`.
- Implement Passport JWT plus `jwks-rsa` verification.
- Implement authentication, client-role authorization, and lazy `UserProfile`
  provisioning.
- Enforce disabled-profile domain denial.
- Introduce append-only audit writing.
- Add a protected identity endpoint and security E2E coverage.

Exit criteria: a real Keycloak token reaches a protected endpoint, creates or finds
the local profile by `sub`, and produces correct `401`/`403` behavior.

## Phase 3: Competitors

- Implement the competitor schema, DTOs, response model, CRUD, filtering, sorting,
  and pagination.
- Enforce positive measurements, unique nickname, birth-date policy, lifecycle, and
  history-aware deletion.
- Derive statistics from official results once results exist; do not introduce
  counters.

Exit criteria: competitor unit, integration, and E2E scenarios pass.

## Phase 4: Teams and Membership

- Implement team lifecycle and historical membership.
- Enforce one active membership per competitor with database constraints.
- Prevent inactive teams from receiving active members or registering.
- Enforce configurable maximum membership and eligibility.

Exit criteria: concurrent duplicate/active-membership cases are rejected and
membership history remains intact.

## Phase 5: Races

- Implement race scheduling, validation, and the accepted transition graph.
- Use a controllable clock and UTC instants.
- Enforce minimum approved participation before starting.
- Preserve terminal completed/cancelled races.

Exit criteria: transition, date, authorization, and terminal-state tests pass.

## Phase 6: Registrations

- Create pending individual/team registrations.
- Approve or reject with role enforcement and rejection reasons.
- Validate capacity and unique lane assignment atomically at approval.
- Prevent individual/team double participation.
- Cancel only before registration closes and preserve approved history.

Exit criteria: duplicate, deadline, eligibility, capacity, lane, and concurrency
tests pass.

## Phase 7: Results and Standings

- Store result type plus raw, penalty, and final milliseconds.
- Enforce approved registration, unique positions, and one lowest-time winner.
- Complete races only with official results.
- Allow audited administrator/organizer corrections after completion.
- Recalculate individual and team standings from official `RaceResult` rows.

Exit criteria: result creation/correction and all tie-break ordering tests pass
without stored statistics drifting.

## Phase 8: Frontend Workflows and Demo Data

- Implement Keycloak PKCE login/logout and role-aware navigation.
- Deliver dashboard, competitor, team, race, registration, result, standings,
  profile, access-denied, and not-found screens.
- Add reproducible domain seeds and the reviewed realm import.
- Add a Postman or Insomnia verification collection.

Exit criteria: the mandatory demonstration workflow works through the UI without
Postman.

## Phase 9: Hardening and Delivery

- Complete at least the mandatory 15 automated scenarios plus security and
  concurrency coverage.
- Verify persistence after container restarts.
- Verify CORS, secret redaction, safe logging, response DTOs, and audit access.
- Update the ER diagram, API contract, README, checklist, and demonstration guide
  from verified behavior.

Exit criteria: the evaluation checklist has evidence for every mandatory item.

## Module Dependency Order

```text
common/config/database
  -> auth
  -> users
  -> competitors
  -> teams
  -> races
  -> registrations
  -> results
  -> standings

audit is a one-way dependency imported by domain services and does not import them.
```

`registrations` owns the registration/approval transaction. `results` owns result
creation/correction and standings recalculation. Modules consume explicit exported
services rather than another module's TypeORM repository.

## Remaining Decisions

The following items are not resolved by the approved plan and must not be invented
during implementation:

- Official points table, pending the source PDF.
- Formula for `finalTime` from raw and penalty time.
- Handling of equal final times and consistency between time order and assigned
  finishing positions.
- Whether `integer` or `bigint` is used for milliseconds.
- Who may cancel registrations and which nonterminal source states may cancel.
- Exact behavior available to a disabled profile, especially identity/profile
  endpoints and public reads.
- Whether race capacity counts a registered team as one participant or counts its
  members.
- Default/max page sizes, empty-page `totalPages`, and whether `422` is used.
- Physical deletion eligibility for never-used draft races, pending registrations,
  competitors without history, and teams without history.
- Test database reset/isolation strategy.
- Concrete ports, realm/client names, redirect URLs, CORS origins, and environment
  variable schema.
