import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfileStatus } from '../enums/user-profile-status.enum';

@Entity({ name: 'user_profiles' })
@Index('uq_user_profiles_keycloak_user_id', ['keycloakUserId'], {
  unique: true,
})
@Index('idx_user_profiles_status', ['status'])
@Check(
  'chk_user_profiles_keycloak_user_id_not_blank',
  'length(btrim("keycloak_user_id")) > 0',
)
@Check(
  'chk_user_profiles_display_name_not_blank',
  'length(btrim("display_name")) > 0',
)
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'keycloak_user_id' })
  keycloakUserId: string;

  @Column({
    type: 'varchar',
    length: 320,
    name: 'email_snapshot',
    nullable: true,
  })
  emailSnapshot: string | null;

  @Column({ type: 'varchar', length: 200, name: 'display_name' })
  displayName: string;

  @Column({
    type: 'enum',
    enum: UserProfileStatus,
    enumName: 'user_profile_status_enum',
    default: UserProfileStatus.ACTIVE,
  })
  status: UserProfileStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
