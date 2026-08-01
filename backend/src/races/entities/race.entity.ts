import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/database/numeric.transformer';
import { RaceStatus } from '../../common/enums/race-status.enum';
import { RaceType } from '../../common/enums/race-type.enum';

@Entity({ name: 'races' })
@Index('idx_races_scheduled_at', ['scheduledAt'])
@Index('idx_races_status', ['status'])
@Index('idx_races_registration_deadline', ['registrationDeadline'])
@Index('idx_races_organizer', ['organizerUserProfileId'])
@Check('chk_races_name_not_blank', 'length(btrim("name")) > 0')
@Check(
  'chk_races_start_location_not_blank',
  'length(btrim("start_location")) > 0',
)
@Check(
  'chk_races_finish_location_not_blank',
  'length(btrim("finish_location")) > 0',
)
@Check('chk_races_distance_positive', '"distance_meters" > 0')
@Check('chk_races_capacity_positive', '"max_participants" > 0')
@Check(
  'chk_races_deadline_before_start',
  '"registration_deadline" < "scheduled_at"',
)
export class Race {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz', name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 200, name: 'start_location' })
  startLocation: string;

  @Column({ type: 'varchar', length: 200, name: 'finish_location' })
  finishLocation: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'distance_meters',
    transformer: numericTransformer,
  })
  distanceMeters: number;

  @Column({ type: 'integer', name: 'max_participants' })
  maxParticipants: number;

  @Column({ type: 'enum', enum: RaceType, enumName: 'race_type_enum' })
  type: RaceType;

  @Column({ type: 'enum', enum: RaceStatus, enumName: 'race_status_enum' })
  status: RaceStatus;

  @Column({ type: 'uuid', name: 'organizer_user_profile_id', nullable: true })
  organizerUserProfileId: string | null;

  @Column({ type: 'timestamptz', name: 'registration_deadline' })
  registrationDeadline: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
