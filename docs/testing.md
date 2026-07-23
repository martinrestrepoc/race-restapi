# Testing Strategy

## Accepted Decisions

The accepted [Architecture Decision Records](adr/README.md) and
[implementation roadmap](roadmap.md) supersede earlier pending statements on the
same topic. Their acceptance does not imply implementation.

## Current State

Jest, `@nestjs/testing`, and Supertest are installed. The current repository has one
default controller unit test and one default HTTP E2E test for `Hello World!`.
There are no domain, TypeORM, PostgreSQL, Keycloak, role, migration, or seed tests.

The target suite must contain at least 15 meaningful automated tests. Getter/setter
tests do not count.

## Test Levels

### Unit Tests

- Test service business rules, state-transition decisions, scoring, eligibility,
  and error selection without HTTP.
- Build providers with `@nestjs/testing` when NestJS injection behavior matters.
- Mock repositories, the clock, and an already validated authentication context only
  when isolation adds value.
- Avoid mocks that merely restate the implementation.
- Do not test TypeORM decorators or NestJS framework internals.

### Integration Tests

- Test TypeORM entities, constraints, repositories, transactions, locking, and
  complex queries against isolated PostgreSQL.
- Apply actual TypeORM migrations before running database-backed tests.
- Verify uniqueness and referential-integrity behavior at the database boundary.
- Reset state between suites/tests and avoid execution-order dependencies.
- Never use the development or production database.

### End-to-End Tests

- Start a real NestJS application and call it with Supertest.
- Exercise validation pipes, guards, controllers, services, TypeORM, filters, and
  serialization together.
- Cover main workflows, consistent errors, and role restrictions.
- Use isolated PostgreSQL and a realistic non-production token issuer.
- Do not depend on production Keycloak.

### Security and Authorization Tests

- Test token validation separately from application business rules where useful.
- Do not override authentication/role guards in tests whose purpose is to verify
  security.
- Test the difference between invalid authentication (`401`) and insufficient role
  permission (`403`).
- Confirm roles are read only from validated claims.
- Confirm `sub` resolves the correct local `UserProfile`.

## Mandatory Academic Scenarios

At minimum, preserve these 15 scenarios:

1. **Create a valid competitor.** An authorized administrator submits a complete
   valid DTO and receives `201 Created`; the competitor is persisted.
2. **Reject an invalid weight.** A non-positive competitor weight is rejected with
   an understandable field-level validation error and no database write.
3. **Reject a duplicated nickname.** Creating/updating a competitor to an existing
   nickname returns a business conflict and preserves uniqueness.
4. **Create a valid race.** An administrator or race organizer creates a future,
   valid race and receives `201 Created`.
5. **Reject a past race.** A scheduled start in the past is rejected without
   persistence.
6. **Register an active competitor.** An active eligible competitor registers while
   the race is open, before the deadline, and within capacity.
7. **Reject a suspended competitor.** A suspended competitor cannot register for a
   new race.
8. **Reject a duplicate registration.** The same competitor/team cannot register
   twice in one race, including a concurrency-safe database check.
9. **Reject registration after the deadline.** A registration at/after the deadline
   is rejected even if the race otherwise appears open.
10. **Record a valid result.** An approved participant receives a valid official
    result while the race is in progress; statistics update consistently.
11. **Reject two winners.** A second official first-place result for one race is
    rejected atomically.
12. **Prevent viewer race creation.** A valid `VIEWER` token receives
    `403 Forbidden` for race creation and no race is stored.
13. **Allow administrator race creation.** A valid `ADMINISTRATOR` token may create
    a valid race.
14. **Require valid authentication.** A protected request without a valid Keycloak
    access token returns `401 Unauthorized`.
15. **Return missing-resource response.** A request for a nonexistent resource
    returns `404 Not Found` in the documented error format.

Use a controllable clock for deadline/past-date tests so tests do not become flaky.

## Additional Domain Coverage

- Reject empty competitor names and non-positive height.
- Prevent physical deletion of a competitor with official results.
- Reject duplicate team membership and membership in multiple active teams.
- Enforce configurable team capacity.
- Reject registration of empty or inactive teams.
- Enforce race capacity atomically.
- Require two valid participants before starting a race.
- Reject completion without official results.
- Reject edits to completed races and `COMPLETED` -> `DRAFT`.
- Reject cancelled-race registrations.
- Reject a participant competing individually and through a team in the same race.
- Reject duplicate starting and normal finishing positions.
- Reject non-positive completion time and disqualified winners.
- Verify the PDF-approved points table once available and consistent statistics
  after result updates.
- Verify only administrators can read the complete audit log.
- Verify sensitive fields never appear in response DTOs or audit snapshots.

Rules with `Decision pending` should receive tests only after the missing decision is
confirmed and documented.

## Required Security Scenarios

- Reject a protected request without an access token.
- Reject a malformed token.
- Reject an expired token.
- Reject a token with an invalid signature.
- Reject a token from an unexpected issuer.
- Reject an invalid audience when audience validation is enabled.
- Allow a request with a valid Keycloak access token.
- Prevent a viewer from creating a race.
- Allow an administrator to create a race.
- Allow a race organizer to manage races.
- Prevent a race organizer from administrator-only audit operations.
- Resolve the local user profile using the JWT `sub` claim.
- Ignore/reject role values sent in the request body/query/custom headers.
- Return `401` for invalid authentication.
- Return `403` for insufficient roles.
- Verify error responses reveal no token validation details or stack traces.

## Authentication Test Environment

Viable strategies:

1. Run a disposable Keycloak container configured for the test suite.
2. Use Testcontainers to manage a Keycloak container.
3. Use a controlled test OIDC issuer and JWKS server that produces realistic signed
   tokens with issuer/audience/expiry/role claims.
4. Override the authentication guard only in tests that do not verify authentication
   or authorization.

Selected strategy: ordinary E2E tests may override authentication only when
security is not under test; dedicated security E2E uses disposable Keycloak.

- Unit tests may mock a context that is already authenticated and validated.
- E2E security tests must exercise realistic signature, issuer, expiry, audience,
  and role behavior.
- Authorization tests must not bypass role guards.
- No test may depend on the production Keycloak instance.
- Test credentials and keys must be disposable and clearly non-production.

Testcontainers is an optional improvement, not a replacement for deciding the
required test topology.

## PostgreSQL Test Environment

- Never run tests against production PostgreSQL.
- Use an isolated database/container for integration and E2E tests.
- Apply migrations to the test database.
- Reset database state between suites or tests using a deterministic approach.
- Do not use `synchronize: true` as a substitute for migration testing.
- Do not depend on test execution order.
- Use transactions carefully: transaction rollback isolation can hide commit-time or
  cross-connection concurrency behavior.

Whether tests use one database per worker, schema isolation, container recreation,
or controlled truncation is `Decision pending`.

## Error and Contract Assertions

Assert more than status codes:

- Successful creation returns the expected response DTO and no internal fields.
- Validation errors include stable `field` and `message` details.
- `401`, `403`, `404`, and `409` have the common error envelope.
- Errors do not contain stack traces, SQL, tokens, JWKS internals, or secrets.
- Pagination metadata and sorting are deterministic.
- Date-time responses use the documented ISO 8601 format.

## Frontend Tests

Frontend tests are optional but recommended. At minimum, demonstrate that the
separate UI correctly handles:

- Successful responses
- Field validation failures
- Authentication and authorization failures
- Loading, empty, and general error states
- Role-aware action visibility without treating it as backend security

The frontend test framework and repository are `Decision pending`.

## Existing Commands

The following scripts are present in `package.json`:

```bash
npm test
npm run test:watch
npm run test:cov
npm run test:debug
npm run test:e2e
npm run lint
npm run format
```

`npm run lint` and `npm run format` currently write fixes. `npm run build` is also
available as a compile check.

No separate integration-test, database-test, migration, seed, or container-test
script exists.

```text
Recommended script - not currently configured: test:integration
Recommended script - not currently configured: migration:run
Recommended script - not currently configured: seed
```

Do not add scripts until the corresponding implementation and environment exist.

## Completion Evidence

Before completing an implementation change:

- Run the most focused relevant tests.
- Run `npm test` and `npm run test:e2e` when shared behavior changed.
- Run `npm run build`.
- Run lint in awareness that the current script applies fixes.
- Record any unavailable environment-dependent suite honestly.
- Confirm new/changed domain rules are reflected in
  [Business rules](business-rules.md).
