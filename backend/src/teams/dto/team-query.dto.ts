import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { TeamStatus } from '../../common/enums/team-status.enum';

export enum TeamSortField {
  NAME = 'name',
  RESPONSIBLE_PERSON = 'responsiblePerson',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export class TeamQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(TeamSortField)
  sortBy: TeamSortField = TeamSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
