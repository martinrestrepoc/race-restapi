# Security

## Accepted Decisions

The accepted [Architecture Decision Records](adr/README.md) and
[implementation roadmap](roadmap.md) supersede earlier pending statements on the
same topic. Their acceptance does not imply implementation.

## Security Model

Keycloak is the central identity provider. NestJS is a protected OAuth 2.0 resource
server that validates Keycloak-issued access tokens and enforces both role and
domain authorization. The frontend is a separate OpenID Connect client.

Passport JWT/JWKS dependencies, typed Keycloak configuration, persistent Keycloak
26.7.0 infrastructure, a reproducible realm, runtime token validation, reusable
authentication/role/profile guards, `GET /api/v1/auth/me`, lazy local profiles, and
`GET /api/v1/users/me` are implemented. All implemented domain controllers enforce
the role matrix and reject locally disabled profiles. Race, registration, result,
and domain audit writes use the authenticated local-profile identifier. Complete
audit-log list/detail reads are restricted to `ADMINISTRATOR`.

Administrative profile list/detail/status operations are also restricted to
`ADMINISTRATOR` and require an active local profile. Status changes use a row lock,
are audited in the same transaction, and reject self-disable to prevent an
administrator from locking themselves out. These operations manage only local
application access; they do not modify the Keycloak account, credentials, sessions,
or roles.

## Responsibility Boundary

### Keycloak

Keycloak manages:

- User accounts and credentials
- Password hashing and password policies
- Login, logout, and authentication flows
- Sessions and token expiration
- Access-token and refresh-token issuance
- Account recovery and lockout
- Realm roles or client roles
- Identity-provider integrations

### NestJS

NestJS manages:

- Access-token signature verification
- Issuer verification
- Audience verification when configured
- Expiration and relevant token-type verification
- Extraction of the stable `sub` claim
- Mapping to the local `UserProfile`
- Backend role authorization
- Resource/domain authorization and business rules
- Safe audit logging

NestJS does not verify local passwords, own user sessions, or issue access/refresh
tokens.

## Required Keycloak Topology

- A dedicated realm for the project.
- A public frontend client using Authorization Code Flow with PKCE.
- A backend/API audience or client representation suitable for access-token
  validation.
- Explicit allowed redirect URIs.
- Explicit allowed web origins.
- Explicit post-logout redirect URIs.
- Required roles: `ADMINISTRATOR`, `RACE_ORGANIZER`, and `VIEWER`.
- Reproducible realm configuration through a reviewed realm export/import or
  equivalent automation.
- Persistent production-capable storage.
- Separate development and production configuration.

Wildcard redirect URIs and web origins are allowed only when strictly necessary for
local development and must not be used in production. Public frontend clients must
not receive or embed client secrets.

The default realm is `race-management`; the API client and expected production
audience are `race-backend`. The imported public frontend client allows the local
`http://localhost:5173` origin and redirect paths and requires Authorization Code
Flow with PKCE S256. Production URLs require a separate environment-specific realm
configuration.

## Realm Roles or Client Roles

The required roles may be modeled as realm roles or API-specific client roles.

Selected model: Keycloak client roles. The backend reads only known application
roles from `resource_access.race-backend.roles` after token verification.

Do not mix realm and client roles without a documented need and deterministic
mapping. Once selected, document token claim location, audience behavior, role
assignment, and how tests create equivalent tokens.

## Authentication Flow

1. The user opens the frontend.
2. The frontend redirects the user to Keycloak.
3. Keycloak authenticates the user.
4. Keycloak returns an authorization code to an allowlisted redirect URI.
5. The frontend exchanges the code using PKCE.
6. Keycloak issues an access token.
7. The frontend sends the token in the `Authorization: Bearer ...` header.
8. NestJS validates the token.
9. NestJS extracts the authenticated `sub` and roles.
10. NestJS evaluates role and domain permissions.
11. NestJS executes the operation or returns a safe `401`/`403` response.

Login, logout, registration when enabled, and token refresh use Keycloak/OIDC
endpoints. The NestJS API exposes no local replacements.

## Token Validation

Keycloak issues and signs every accepted access token. NestJS validates:

- Cryptographic signature using Keycloak's JWKS
- Exact trusted issuer
- Expiration
- Audience when audience validation is configured
- Token type or authorized-party/client claims when relevant to the adopted design

Signing keys must be resolved using standards-compatible discovery/JWKS behavior
with safe caching and rotation. Algorithms must be allowlisted; the token header
must not choose an unsafe validation policy. Unverified token claims must never drive
authorization.

Possible implementation approaches:

- Standards-based JWT validation using OIDC discovery/JWKS
- A compatible NestJS/Passport strategy
- A maintained Keycloak integration library

Concrete integration: Passport JWT with `jwks-rsa`. Compatibility with NestJS 11,
Passport 0.7, and Node.js 24 has been confirmed.

The implemented Passport strategy accepts only RS256 access tokens, resolves keys
from the configured JWKS URI with caching and rate limiting, and verifies exact
issuer, expiry, and configured audience before mapping the identity. The validated
payload must contain a non-empty `sub` and Keycloak's `typ: Bearer` claim.

## Authorization in NestJS

Use these conceptual components:

- An authentication guard validates the access token.
- A role guard checks required application roles.
- `@Roles()` declares accepted roles on protected handlers/controllers.
- `@CurrentUser()` returns a validated authentication context, including `sub`.
- A public-route decorator may mark explicitly public endpoints if the application
  adopts authentication-by-default.

The authentication guard, role guard, `@Roles()`, and `@CurrentUser()` are
implemented. They protect `/auth/me` and every implemented domain controller.
Read endpoints accept all three application roles; competitor/team mutations require
`ADMINISTRATOR`; race, registration, and result workflows accept
`ADMINISTRATOR` or `RACE_ORGANIZER` according to the API contract.

Rules:

- Extract roles only from an already validated token.
- Never accept roles from query parameters, bodies, cookies created by the
  application, or custom role headers.
- Never bypass guards for convenience.
- Enforce resource-state, ownership, and cross-entity authorization in domain
  services after coarse role checks.
- Frontend route guards and hidden buttons improve UX but never replace backend
  authorization.

Minimum permissions are defined in [Project requirements](project-requirements.md)
and endpoint mappings in [API contract](api-contract.md).

## Local User Profiles

When the domain needs an actor record, resolve a `UserProfile` by Keycloak's `sub`
claim:

- `keycloakUserId` is unique and canonical.
- Email is not a stable identity key.
- Claim snapshots are stored only for a documented domain need.
- Profiles contain no password/hash, token, session, or client-secret data.

Profiles are provisioned lazily by validated `sub`; creation must be idempotent and
concurrency-safe.

The implemented profile contains `ACTIVE` or `DISABLED` status and snapshots the
validated token's email and display name when it is first created. Keycloak remains
authoritative; snapshots are not continuously synchronized. A disabled profile may
read `/users/me` so the client can explain its status, but receives `403 Forbidden`
on implemented domain routes. `/auth/me` remains a token-context endpoint and does
not expose or provision the local profile.

## Security Responses

- Return `401 Unauthorized` for missing, malformed, expired, incorrectly signed, or
  otherwise invalid authentication.
- Return `403 Forbidden` for validly authenticated users without required
  permission.
- Do not use `404` to hide all authorization failures unless a specific resource
  enumeration policy is documented.
- Do not expose signature algorithms, issuer expectations, JWKS URLs, claim parsing,
  or role-evaluation internals to clients.
- Never return raw stack traces.

## Secrets and Environment Configuration

Maintain a non-secret `.env.example` when configuration is introduced. Conceptual
settings include:

```text
KEYCLOAK_ISSUER
KEYCLOAK_AUDIENCE
KEYCLOAK_JWKS_URI
KEYCLOAK_BASE_URL
KEYCLOAK_REALM
KEYCLOAK_CLIENT_ID
KEYCLOAK_ADMIN_USERNAME
KEYCLOAK_ADMIN_PASSWORD
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USERNAME
DATABASE_PASSWORD
```

The backend configuration names above are selected. `KEYCLOAK_CLIENT_ID` identifies
the API client whose client roles are trusted. `KEYCLOAK_AUDIENCE` may be empty only
where audience validation is deliberately disabled; production should configure it.
Administrative credentials belong to the future Keycloak container bootstrap and
must not be passed to the NestJS application.

- Do not commit `.env`, realm exports containing real secrets, credentials, or
  tokens.
- Protect Keycloak administrative credentials and restrict their use.
- Do not log admin credentials, client secrets, authorization codes, or tokens.
- Do not use default production passwords.
- Mark all development credentials as non-production.
- Server-side confidential client secrets, if the design requires them, never reach
  the public frontend.
- Rotate compromised secrets and credentials outside the source repository.

## Keycloak Persistence and Docker

Keycloak must use persistent production-capable database storage. It may:

1. Use the same PostgreSQL server as the application with a separate database and
   credentials; or
2. Use a separate PostgreSQL container.

Selected option: one PostgreSQL container with separate databases and credentials.

The selected option is implemented. An idempotent one-shot service creates or
updates the dedicated Keycloak database role and database, while the PostgreSQL
named volume persists both databases. Keycloak has a management-port readiness
check and starts only after database provisioning succeeds. It never uses the
development embedded database. The local single-node service disables distributed
caching; a high-availability deployment requires an explicit supported cluster
configuration.

Startup import creates the realm only when it is absent. Editing the committed realm
JSON does not overwrite an existing realm in the persistent volume; later realm
changes need an explicit administrative migration or a deliberate local reset.

## Audit and Logging

- Record important application actions with the validated subject/profile.
- Record authentication events available to the application without storing tokens.
- Keycloak login events are not imported in the initial version.
- Redact authorization headers, cookies, tokens, secrets, passwords, and protected
  claim data.
- Restrict complete audit-log access to `ADMINISTRATOR`.
- The implemented audit API exposes no create, update, or delete routes.
- Domain snapshots are explicit and the generic writer removes secret-like keys.
- Audit retention, immutability, and Keycloak event correlation are
  `Decision pending`.

## Browser and Frontend Considerations

- Use Authorization Code Flow with PKCE for the public frontend.
- Allow only known redirect/logout URLs and origins.
- Keep access tokens out of URLs and logs.
- Token storage strategy and XSS/CSRF controls depend on the frontend architecture:
  `Decision pending`.
- Apply HTTPS in non-local environments.
- Configure CORS to explicit frontend origins; production wildcards are forbidden.
- Treat frontend validation and visual authorization as UX only.

## Security Test Expectations

Security tests must cover missing, malformed, expired, wrong-issuer, wrong-audience,
and valid tokens; role denial/allowance; `sub` profile resolution; and `401` versus
`403` behavior. Tests that verify authorization must not override role guards. See
[Testing](testing.md).

## Explicit Prohibitions

The application must not:

- Store user passwords or password hashes
- Implement local password verification
- Add application password-hashing dependencies; password hashing belongs to
  Keycloak
- Issue application-owned access or refresh tokens
- Call `JwtService.sign` or equivalent to create accepted application tokens
- Store access or refresh tokens in PostgreSQL
- Implement local login, registration, or refresh endpoints replacing Keycloak
- Trust manually supplied roles
- Expose Keycloak admin credentials or raw administration data
- Log tokens or return secrets
- Depend only on hidden frontend controls for authorization
