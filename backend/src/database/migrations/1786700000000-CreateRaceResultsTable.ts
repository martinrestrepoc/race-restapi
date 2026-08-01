import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRaceResultsTable1786700000000 implements MigrationInterface {
  name = 'CreateRaceResultsTable1786700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE result_status_enum AS ENUM (
        'FINISHED', 'DISQUALIFIED', 'DID_NOT_FINISH', 'DID_NOT_START'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE race_results (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        race_id uuid NOT NULL,
        registration_id uuid NOT NULL,
        starting_position integer NOT NULL,
        final_position integer,
        raw_time_ms bigint,
        penalty_time_ms bigint NOT NULL DEFAULT 0,
        final_time_ms bigint,
        status result_status_enum NOT NULL,
        notes varchar(1000),
        recorded_by_user_profile_id uuid,
        recorded_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_race_results PRIMARY KEY (id),
        CONSTRAINT uq_results_registration UNIQUE (registration_id),
        CONSTRAINT fk_results_race FOREIGN KEY (race_id)
          REFERENCES races(id) ON DELETE RESTRICT,
        CONSTRAINT fk_results_registration FOREIGN KEY (registration_id)
          REFERENCES race_registrations(id) ON DELETE RESTRICT,
        CONSTRAINT chk_results_starting_position_positive CHECK (starting_position > 0),
        CONSTRAINT chk_results_final_position_positive
          CHECK (final_position IS NULL OR final_position > 0),
        CONSTRAINT chk_results_raw_time_non_negative
          CHECK (raw_time_ms IS NULL OR raw_time_ms >= 0),
        CONSTRAINT chk_results_penalty_time_non_negative CHECK (penalty_time_ms >= 0),
        CONSTRAINT chk_results_final_time_non_negative
          CHECK (final_time_ms IS NULL OR final_time_ms >= 0),
        CONSTRAINT chk_results_values_match_status CHECK (
          (
            status = 'FINISHED'
            AND final_position IS NOT NULL
            AND raw_time_ms > 0
            AND final_time_ms = raw_time_ms + penalty_time_ms
          ) OR (
            status <> 'FINISHED'
            AND final_position IS NULL
            AND raw_time_ms IS NULL
            AND penalty_time_ms = 0
            AND final_time_ms IS NULL
          )
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_results_race_status ON race_results (race_id, status)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_results_race_final_position
      ON race_results (race_id, final_position)
      WHERE status = 'FINISHED' AND final_position IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE race_results');
    await queryRunner.query('DROP TYPE result_status_enum');
  }
}
