import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @IsOptional()
  @IsUUID('4')
  actorUserProfileId?: string;

  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Type(() => String)
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Type(() => String)
  to?: string;
}
