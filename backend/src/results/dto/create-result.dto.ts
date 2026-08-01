import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ResultStatus } from '../../common/enums/result-status.enum';
import { trimString } from '../../common/transformers/trim-string.transformer';

export class CreateResultDto {
  @IsUUID('4')
  registrationId: string;

  @IsEnum(ResultStatus)
  status: ResultStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  finalPosition?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  rawTimeMs?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  penaltyTimeMs = 0;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
