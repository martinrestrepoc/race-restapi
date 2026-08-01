import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RaceType } from '../../common/enums/race-type.enum';
import { trimString } from '../../common/transformers/trim-string.transformer';

export class CreateRaceDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString({ strict: true })
  scheduledAt: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  startLocation: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  finishLocation: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999999.99)
  distanceMeters: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  maxParticipants: number;

  @IsEnum(RaceType)
  type: RaceType;

  @IsDateString({ strict: true })
  registrationDeadline: string;
}
