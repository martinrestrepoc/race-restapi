import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { trimString } from '../../common/transformers/trim-string.transformer';

export class CreateCompetitorDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nickname: string;

  @IsEnum(CompetitorType)
  type: CompetitorType;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must use YYYY-MM-DD format',
  })
  dateOfBirth: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999.99)
  weight: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999.99)
  height: number;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  origin: string;

  @IsEnum(CompetitorStatus)
  status: CompetitorStatus;
}
