import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamsAndMemberships1785500000000 implements MigrationInterface {
  name = 'CreateTeamsAndMemberships1785500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE team_status_enum AS ENUM ('ACTIVE', 'INACTIVE')",
    );
    await queryRunner.query(`
      CREATE TABLE teams (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        name varchar(120) NOT NULL,
        description varchar(500),
        responsible_person varchar(150) NOT NULL,
        status team_status_enum NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_teams PRIMARY KEY (id),
        CONSTRAINT uq_teams_name UNIQUE (name),
        CONSTRAINT chk_teams_name_not_blank CHECK (length(btrim(name)) > 0),
        CONSTRAINT chk_teams_responsible_person_not_blank
          CHECK (length(btrim(responsible_person)) > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE team_members (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        team_id uuid NOT NULL,
        competitor_id uuid NOT NULL,
        joined_at timestamptz NOT NULL DEFAULT now(),
        left_at timestamptz,
        CONSTRAINT pk_team_members PRIMARY KEY (id),
        CONSTRAINT fk_team_members_team FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT fk_team_members_competitor FOREIGN KEY (competitor_id)
          REFERENCES competitors(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query('CREATE INDEX idx_teams_status ON teams (status)');
    await queryRunner.query(
      'CREATE INDEX idx_teams_created_at ON teams (created_at)',
    );
    await queryRunner.query(`
      CREATE INDEX idx_team_members_team_competitor
      ON team_members (team_id, competitor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_team_members_team_active
      ON team_members (team_id)
      WHERE left_at IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_team_members_active_competitor
      ON team_members (competitor_id)
      WHERE left_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE team_members');
    await queryRunner.query('DROP TABLE teams');
    await queryRunner.query('DROP TYPE team_status_enum');
  }
}
