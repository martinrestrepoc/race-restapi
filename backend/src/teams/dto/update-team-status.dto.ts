import { IsEnum } from 'class-validator';
import { TeamStatus } from '../../common/enums/team-status.enum';

export class UpdateTeamStatusDto {
  @IsEnum(TeamStatus)
  status: TeamStatus;
}
