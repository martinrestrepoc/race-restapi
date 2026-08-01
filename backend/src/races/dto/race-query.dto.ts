import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RaceStatus } from '../../common/enums/race-status.enum';
import { RaceType } from '../../common/enums/race-type.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

export enum RaceSortField {
  NAME = 'name',
  SCHEDULED_AT = 'scheduledAt',
  REGISTRATION_DEADLINE = 'registrationDeadline',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export class RaceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RaceStatus)
  status?: RaceStatus;

  @IsOptional()
  @IsEnum(RaceType)
  type?: RaceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(RaceSortField)
  sortBy: RaceSortField = RaceSortField.SCHEDULED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}
