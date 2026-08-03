import { UserProfile } from '../entities/user-profile.entity';
import { UserProfileStatus } from '../enums/user-profile-status.enum';

export class UserProfileResponseDto {
  id: string;
  keycloakUserId: string;
  emailSnapshot: string | null;
  displayName: string;
  status: UserProfileStatus;
  createdAt: string;
  updatedAt: string;

  static fromEntity(profile: UserProfile): UserProfileResponseDto {
    return {
      id: profile.id,
      keycloakUserId: profile.keycloakUserId,
      emailSnapshot: profile.emailSnapshot,
      displayName: profile.displayName,
      status: profile.status,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
