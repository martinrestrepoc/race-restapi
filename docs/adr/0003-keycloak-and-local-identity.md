# ADR 0003: Keycloak and Local Identity

- Status: Accepted
- Date: 2026-07-23

## Context

The role representation, local-profile provisioning strategy, and initial
user-management boundary were previously undefined.

## Decision

Use Keycloak client roles named `ADMINISTRATOR`, `RACE_ORGANIZER`, and `VIEWER`.
NestJS validates Keycloak access tokens and reads roles only from the validated
client-role claim.

The initial version does not call the Keycloak Admin API and does not manage
Keycloak users. Demo users and assignments are provisioned through a reproducible
realm import.

Use lazy local profile provisioning. On the first authenticated request, NestJS
creates a `UserProfile` keyed by the token's `sub` claim.

Local profile statuses are `ACTIVE` and `DISABLED`. A disabled profile cannot
perform domain operations even when its Keycloak token is otherwise valid.

Use Passport JWT with `jwks-rsa` for token verification unless dependency
compatibility analysis identifies a blocking constraint before installation.

## Consequences

- Keycloak remains the only owner of credentials, sessions, and role assignments.
- Lazy provisioning must be concurrency-safe through a unique `keycloakUserId`
  constraint and idempotent lookup/create behavior.
- Authorization requires both a valid token/client role and an active local
  profile.
- The exact response available to a disabled profile, especially `/auth/me`,
  remains to be specified.
