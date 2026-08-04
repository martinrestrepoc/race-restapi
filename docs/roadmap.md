# Implementation Roadmap

This roadmap tracks vertical backend increments. A module is complete only when
its persistence, API contract, business rules, authorization, audit behavior, and
relevant unit, integration, and E2E tests are present.

## Current Status

1. **Technical foundation — substantially implemented.** Typed configuration,
   PostgreSQL/TypeORM, reviewed migrations, Docker Compose, `/api/v1`, global
   validation, uniform errors, pagination, and a disposable E2E database topology
   are present. Seeds remain pending.
2. **Security, local profiles, and authenticated audit actors — implemented.**
   Compatible Passport JWT/JWKS dependencies and typed Keycloak configuration are
   present. Persistent Keycloak infrastructure, the API/frontend clients, client
   roles, PKCE, audience mapping, and three demo identities are reproducible through
   Compose and realm import. RS256/JWKS token validation, reusable authentication and
   role guards, `/auth/me`, lazy `UserProfile` provisioning, `/users/me`, active
   profile enforcement, and authenticated actor attribution are implemented.
   Domain-controller role policies are applied across competitors, teams, races,
   registrations, and results. Administrator profile list/detail/status management
   is implemented with audit and self-disable protection.
3. **Competitors — functional core implemented.** CRUD, lifecycle, history-aware
   deletion, migration, DTOs, unit tests, PostgreSQL E2E tests, and administrator
   mutation/read-role enforcement, and authenticated audit events exist.
4. **Teams and memberships — functional core implemented.** Historical membership,
   configurable capacity, exclusive active membership, locking, migration, unit
   tests, PostgreSQL E2E tests, role enforcement, and mutation audit events exist.
5. **Races — functional core implemented.** Draft editing, lifecycle rules,
   migration, DTOs, service/controller, unit tests, and role enforcement exist.
   Mutation audit events and PostgreSQL-backed workflow E2E coverage exist.
6. **Registrations — functional core implemented.** Eligibility, lifecycle,
   race-serialized creation, atomic approval capacity/starting-position checks,
   migration, unit tests, role enforcement, authenticated performer attribution,
   audit events, and PostgreSQL-backed workflow/concurrency E2E coverage exist.
7. **Results — functional core implemented.** Integer-millisecond final-time
   calculation, official correction, transactional audit writes, constraints, and
   unit tests, role enforcement, and authenticated result/audit actors exist.
   PostgreSQL-backed workflow/correction E2E coverage exists. Corrections are
   reflected by derived standings on the next query.
8. **Standings and audit queries — implemented.** The paginated, filterable,
   administrator-only audit list/detail API is implemented. Overall, competitor,
   and direct-team standings derive the confirmed scoring and tie policy from
   official results, with DTOs, role/profile guards, deterministic pagination, and
   unit/PostgreSQL E2E coverage.
9. **Quality hardening — implemented.** Coverage now measures production TypeScript
   rather than migrations and framework wiring, global anti-regression thresholds
   are enforced, and registration transitions, audit queries, and profile
   administration have expanded unit coverage. The complete unit, E2E, and JWT/JWKS
   security suites are maintained independently.

## Next Increment

Reproducible domain demonstration seeds are implemented with fixed UUIDs,
transactional idempotency, migration preflight, and PostgreSQL E2E verification.
The next major increment is frontend work.
