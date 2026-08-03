import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRacesTable1785900000000 implements MigrationInterface {
  name = 'CreateRacesTable1785900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE race_type_enum AS ENUM ('INDIVIDUAL', 'TEAM', 'MIXED')",
    );
    await queryRunner.query(`
      CREATE TYPE race_status_enum AS ENUM (
        'DRAFT', 'OPEN_FOR_REGISTRATION', 'CLOSED',
        'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE races (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        name varchar(150) NOT NULL,
        description varchar(1000),
        scheduled_at timestamptz NOT NULL,
        start_location varchar(200) NOT NULL,
        finish_location varchar(200) NOT NULL,
        distance_meters numeric(12,2) NOT NULL,
        max_participants integer NOT NULL,
        type race_type_enum NOT NULL,
        status race_status_enum NOT NULL,
        organizer_user_profile_id uuid,
        registration_deadline timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_races PRIMARY KEY (id),
        CONSTRAINT chk_races_name_not_blank CHECK (length(btrim(name)) > 0),
        CONSTRAINT chk_races_start_location_not_blank CHECK (length(btrim(start_location)) > 0),
        CONSTRAINT chk_races_finish_location_not_blank CHECK (length(btrim(finish_location)) > 0),
        CONSTRAINT chk_races_distance_positive CHECK (distance_meters > 0),
        CONSTRAINT chk_races_capacity_positive CHECK (max_participants > 0),
        CONSTRAINT chk_races_deadline_before_start CHECK (registration_deadline < scheduled_at)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_races_scheduled_at ON races (scheduled_at)',
    );
    await queryRunner.query('CREATE INDEX idx_races_status ON races (status)');
    await queryRunner.query(
      'CREATE INDEX idx_races_registration_deadline ON races (registration_deadline)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_races_organizer ON races (organizer_user_profile_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE races');
    await queryRunner.query('DROP TYPE race_status_enum');
    await queryRunner.query('DROP TYPE race_type_enum');
  }
}
