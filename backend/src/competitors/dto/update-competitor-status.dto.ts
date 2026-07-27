import { IsEnum } from 'class-validator';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';

export class UpdateCompetitorStatusDto {
  @IsEnum(CompetitorStatus)
  status: CompetitorStatus;
}
