import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserProfilesAndActorForeignKeys1787500000000 implements MigrationInterface {
  name = 'CreateUserProfilesAndActorForeignKeys1787500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE user_profile_status_enum AS ENUM ('ACTIVE', 'DISABLED')",
    );
    await queryRunner.query(`
      CREATE TABLE user_profiles (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        keycloak_user_id varchar(255) NOT NULL,
        email_snapshot varchar(320),
        display_name varchar(200) NOT NULL,
        status user_profile_status_enum NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_user_profiles PRIMARY KEY (id),
        CONSTRAINT uq_user_profiles_keycloak_user_id UNIQUE (keycloak_user_id),
        CONSTRAINT chk_user_profiles_keycloak_user_id_not_blank
          CHECK (length(btrim(keycloak_user_id)) > 0),
        CONSTRAINT chk_user_profiles_display_name_not_blank
          CHECK (length(btrim(display_name)) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_user_profiles_status ON user_profiles (status)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_registrations_performed_by ON race_registrations (performed_by_user_profile_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_results_recorded_by ON race_results (recorded_by_user_profile_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_profile_id)',
    );
    await queryRunner.query(`
      ALTER TABLE races
      ADD CONSTRAINT fk_races_organizer_user_profile
      FOREIGN KEY (organizer_user_profile_id) REFERENCES user_profiles(id)
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE race_registrations
      ADD CONSTRAINT fk_registrations_performed_by_user_profile
      FOREIGN KEY (performed_by_user_profile_id) REFERENCES user_profiles(id)
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE race_results
      ADD CONSTRAINT fk_results_recorded_by_user_profile
      FOREIGN KEY (recorded_by_user_profile_id) REFERENCES user_profiles(id)
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_actor_user_profile
      FOREIGN KEY (actor_user_profile_id) REFERENCES user_profiles(id)
      ON DELETE RESTRICT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE audit_logs DROP CONSTRAINT fk_audit_logs_actor_user_profile',
    );
    await queryRunner.query(
      'ALTER TABLE race_results DROP CONSTRAINT fk_results_recorded_by_user_profile',
    );
    await queryRunner.query(
      'ALTER TABLE race_registrations DROP CONSTRAINT fk_registrations_performed_by_user_profile',
    );
    await queryRunner.query(
      'ALTER TABLE races DROP CONSTRAINT fk_races_organizer_user_profile',
    );
    await queryRunner.query('DROP INDEX idx_audit_logs_actor');
    await queryRunner.query('DROP INDEX idx_results_recorded_by');
    await queryRunner.query('DROP INDEX idx_registrations_performed_by');
    await queryRunner.query('DROP TABLE user_profiles');
    await queryRunner.query('DROP TYPE user_profile_status_enum');
  }
}
