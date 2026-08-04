# TypeORM migrations

Every database schema change must be represented by a reviewed TypeORM migration.
Migrations define schema only; reproducible sample data belongs in a separate seed
system.

From `backend/`, the main commands are:

```bash
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
npm run migration:show
```

The commands load database settings from the environment or a local uncommitted
`.env` file. Production must never use `synchronize: true`.

After all migrations are applied, the separate idempotent demonstration seed can be
run with `npm run seed`. It uses fixed UUIDs and one transaction, and never creates
Keycloak users or local identity profiles. Seed changes must not be added to schema
migrations.
