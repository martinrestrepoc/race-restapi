import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { UserProfileStatus } from '../enums/user-profile-status.enum';

export enum UserProfileSortField {
  DISPLAY_NAME = 'displayName',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export class UserProfileQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserProfileStatus)
  status?: UserProfileStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(UserProfileSortField)
  sortBy: UserProfileSortField = UserProfileSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
