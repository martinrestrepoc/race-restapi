import dataSource from '../typeorm.datasource';
import { seedDemoData } from './demo.seed';

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    if (await dataSource.showMigrations()) {
      throw new Error(
        'Pending migrations detected. Run npm run migration:run before seeding.',
      );
    }

    const summary = await seedDemoData(dataSource);
    process.stdout.write(`Demo seed completed: ${JSON.stringify(summary)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  process.stderr.write(`Demo seed failed: ${message}\n`);
  process.exitCode = 1;
});
