import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRaceRegistrationsTable1786300000000 implements MigrationInterface {
  name = 'CreateRaceRegistrationsTable1786300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE registration_status_enum AS ENUM (
        'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE race_registrations (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        race_id uuid NOT NULL,
        competitor_id uuid,
        team_id uuid,
        status registration_status_enum NOT NULL,
        starting_position integer,
        validation_notes varchar(1000),
        performed_by_user_profile_id uuid,
        registered_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_race_registrations PRIMARY KEY (id),
        CONSTRAINT fk_registrations_race FOREIGN KEY (race_id)
          REFERENCES races(id) ON DELETE RESTRICT,
        CONSTRAINT fk_registrations_competitor FOREIGN KEY (competitor_id)
          REFERENCES competitors(id) ON DELETE RESTRICT,
        CONSTRAINT fk_registrations_team FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT chk_registrations_exactly_one_participant
          CHECK ((competitor_id IS NOT NULL) <> (team_id IS NOT NULL)),
        CONSTRAINT chk_registrations_starting_position_positive
          CHECK (starting_position IS NULL OR starting_position > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_registrations_race_status
      ON race_registrations (race_id, status)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_registrations_race_competitor
      ON race_registrations (race_id, competitor_id)
      WHERE competitor_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_registrations_race_team
      ON race_registrations (race_id, team_id)
      WHERE team_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_registrations_race_starting_position
      ON race_registrations (race_id, starting_position)
      WHERE starting_position IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE race_registrations');
    await queryRunner.query('DROP TYPE registration_status_enum');
  }
}
