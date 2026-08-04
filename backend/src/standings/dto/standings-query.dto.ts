import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { TeamStatus } from '../../common/enums/team-status.enum';

export enum StandingsSortField {
  POSITION = 'position',
  NAME = 'name',
  TOTAL_POINTS = 'totalPoints',
  WINS = 'wins',
  SECOND_PLACES = 'secondPlaces',
  RACES_COMPLETED = 'racesCompleted',
  BEST_FINAL_TIME_MS = 'bestFinalTimeMs',
}

export class StandingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(StandingsSortField)
  sortBy: StandingsSortField = StandingsSortField.POSITION;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}

export class CompetitorStandingsQueryDto extends StandingsQueryDto {
  @IsOptional()
  @IsEnum(CompetitorStatus)
  status?: CompetitorStatus;

  @IsOptional()
  @IsEnum(CompetitorType)
  type?: CompetitorType;
}

export class TeamStandingsQueryDto extends StandingsQueryDto {
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}
