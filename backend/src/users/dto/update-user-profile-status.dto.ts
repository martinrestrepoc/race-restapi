import { IsEnum } from 'class-validator';
import { UserProfileStatus } from '../enums/user-profile-status.enum';

export class UpdateUserProfileStatusDto {
  @IsEnum(UserProfileStatus)
  status: UserProfileStatus;
}
