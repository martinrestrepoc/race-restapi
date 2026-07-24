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
