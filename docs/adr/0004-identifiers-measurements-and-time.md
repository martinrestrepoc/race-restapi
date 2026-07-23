# ADR 0004: Identifiers, Measurements, and Time Values

- Status: Accepted
- Date: 2026-07-23

## Decision

- Use UUID v4 for application entity identifiers.
- Use the Keycloak `sub` claim as the unique external identity identifier.
- Store weight in kilograms as PostgreSQL `numeric(6,2)`.
- Store height in centimeters as PostgreSQL `numeric(5,2)`.
- Store date of birth as `date`; calculate age and do not persist it.
- Store race raw, penalty, and final times as integer or bigint milliseconds.
- Never use floating-point fields for race time.
- Store instants using UTC-compatible timestamps and exchange them as ISO 8601
  strings with an explicit offset.

## Consequences

- API field names and documentation must expose units unambiguously.
- Numeric TypeORM mappings require deliberate serialization because PostgreSQL
  numeric values are commonly returned as strings.
- The choice between integer and bigint milliseconds must be finalized in the
  concrete schema before the first migration.
