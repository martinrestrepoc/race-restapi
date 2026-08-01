import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationStatus } from '../../common/enums/registration-status.enum';
import { Competitor } from '../../competitors/entities/competitor.entity';
import { Race } from '../../races/entities/race.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity({ name: 'race_registrations' })
@Index('idx_registrations_race_status', ['raceId', 'status'])
@Index('uq_registrations_race_competitor', ['raceId', 'competitorId'], {
  unique: true,
  where: '"competitor_id" IS NOT NULL',
})
@Index('uq_registrations_race_team', ['raceId', 'teamId'], {
  unique: true,
  where: '"team_id" IS NOT NULL',
})
@Index(
  'uq_registrations_race_starting_position',
  ['raceId', 'startingPosition'],
  {
    unique: true,
    where: '"starting_position" IS NOT NULL',
  },
)
@Check(
  'chk_registrations_exactly_one_participant',
  '("competitor_id" IS NOT NULL) <> ("team_id" IS NOT NULL)',
)
@Check(
  'chk_registrations_starting_position_positive',
  '"starting_position" IS NULL OR "starting_position" > 0',
)
export class RaceRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'race_id' })
  raceId: string;

  @Column({ type: 'uuid', name: 'competitor_id', nullable: true })
  competitorId: string | null;

  @Column({ type: 'uuid', name: 'team_id', nullable: true })
  teamId: string | null;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    enumName: 'registration_status_enum',
  })
  status: RegistrationStatus;

  @Column({ type: 'integer', name: 'starting_position', nullable: true })
  startingPosition: number | null;

  @Column({
    type: 'varchar',
    length: 1000,
    name: 'validation_notes',
    nullable: true,
  })
  validationNotes: string | null;

  @Column({
    type: 'uuid',
    name: 'performed_by_user_profile_id',
    nullable: true,
  })
  performedByUserProfileId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'registered_at' })
  registeredAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Race, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'race_id',
    foreignKeyConstraintName: 'fk_registrations_race',
  })
  race: Race;

  @ManyToOne(() => Competitor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'competitor_id',
    foreignKeyConstraintName: 'fk_registrations_competitor',
  })
  competitor: Competitor | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_registrations_team',
  })
  team: Team | null;
}
