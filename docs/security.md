# Security

## Security Model

Keycloak is the central identity provider. NestJS is a protected OAuth 2.0 resource
server that validates Keycloak-issued access tokens and enforces both role and
domain authorization. The frontend is a separate OpenID Connect client.

No Keycloak integration is currently installed or configured. This document defines
the required target.

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
- Mapping to a local `UserProfile`, if used
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

Realm/client names, exact redirect URLs, frontend client type details, backend
audience configuration, and import automation are `Decision pending`.

## Realm Roles or Client Roles

The required roles may be modeled as realm roles or API-specific client roles.

Selected model:

```text
Decision pending
```

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

Concrete integration library:

```text
Decision pending
```

The choice must preserve issuer, signature, expiry, audience, algorithm, and key
rotation checks. No required JWT/Keycloak package is currently installed.

## Authorization in NestJS

Use these conceptual components:

- An authentication guard validates the access token.
- A role guard checks required application roles.
- `@Roles()` declares accepted roles on protected handlers/controllers.
- `@CurrentUser()` returns a validated authentication context, including `sub`.
- A public-route decorator may mark explicitly public endpoints if the application
  adopts authentication-by-default.

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

Whether profiles are pre-provisioned, lazily created, or synchronized by an
administrative process is `Decision pending`.

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
KEYCLOAK_REALM
KEYCLOAK_FRONTEND_CLIENT_ID
KEYCLOAK_API_CLIENT_ID
KEYCLOAK_ADMIN_USERNAME
KEYCLOAK_ADMIN_PASSWORD
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USERNAME
DATABASE_PASSWORD
```

Final variable names and which values are derived are `Decision pending`.

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

Selected option: `Decision pending`.

In both cases, isolate credentials and schemas/databases, persist storage with named
volumes, and configure practical health checks/startup dependencies. A development
embedded database is not the definitive production architecture.

## Audit and Logging

- Record important application actions with the validated subject/profile.
- Record authentication events available to the application without storing tokens.
- Keycloak's own event logging remains distinct unless a correlation/import design
  is explicitly adopted.
- Redact authorization headers, cookies, tokens, secrets, passwords, and protected
  claim data.
- Restrict complete audit-log access to `ADMINISTRATOR`.
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
