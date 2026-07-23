# ADR 0005: Runtime, Infrastructure, and Testing

- Status: Accepted with compatibility gates
- Date: 2026-07-23

## Decision

Target Node.js 24 after confirming compatibility with the complete dependency set.
Align `@types/node` with the runtime and align Jest with `ts-jest` before expanding
the suite.

Use one PostgreSQL container hosting separate application and Keycloak databases
with separate credentials. Both databases require persistent storage.

Testing uses:

- Unit tests with mocked, already-authenticated contexts.
- Ordinary E2E tests with authentication overridden only when security is not the
  behavior under test.
- Dedicated security E2E tests using a disposable Keycloak environment.
- Isolated PostgreSQL with real migrations for integration and E2E tests.

## Consequences

- Compatibility verification is a phase-zero gate, not an implementation
  assumption.
- Authorization/security tests must never override the guards they are validating.
- Database initialization must create two isolated databases and credentials.
- The database reset/isolation strategy for parallel tests remains pending.
