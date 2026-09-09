# ADR 0007: Controlled JWKS Issuer for Security Tests

- Status: Accepted; supersedes the dedicated-security-issuer decision in ADR 0005
- Date: 2026-09-09

## Context

ADR 0005 selected a disposable Keycloak environment for dedicated security E2E
tests. The implemented suite instead needs deterministic control over signing
keys, issuer, audience, expiration, token type, and malformed-token cases while
still exercising the real Passport JWT strategy and JWKS lookup behavior.

## Decision

Dedicated security E2E tests use disposable RSA keys and a controlled local JWKS
issuer. They exercise the real NestJS authentication strategy, guards, claims
mapping, and HTTP error handling without contacting development or production
Keycloak.

Ordinary application E2E tests may override authentication only when authentication
or authorization is not the behavior being tested. Browser E2E continues to use
the real non-production Keycloak service for Authorization Code Flow with PKCE,
login, roles, and end-user workflow verification.

PostgreSQL-backed suites run serially against an isolated database, apply the real
migrations, and clean their state so tests do not depend on execution order.

## Consequences

- Cryptographic failure cases are deterministic and do not require a Keycloak
  container for the dedicated security suite.
- The suite still validates signature, issuer, audience, expiration, token type,
  role mapping, and the distinction between `401` and `403` through production
  authentication code.
- The controlled issuer is test infrastructure, not an application-owned token
  issuer and never replaces Keycloak in a deployed environment.
- Changes to Passport, JWT/JWKS configuration, or claims mapping require rerunning
  the dedicated security suite and the real-Keycloak browser flow.
