import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum CompetitorSortField {
  NAME = 'name',
  NICKNAME = 'nickname',
  TYPE = 'type',
  STATUS = 'status',
  REGISTERED_AT = 'registeredAt',
}

export class CompetitorQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CompetitorStatus)
  status?: CompetitorStatus;

  @IsOptional()
  @IsEnum(CompetitorType)
  type?: CompetitorType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(CompetitorSortField)
  sortBy: CompetitorSortField = CompetitorSortField.REGISTERED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
