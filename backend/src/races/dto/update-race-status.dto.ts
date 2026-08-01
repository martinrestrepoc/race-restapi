import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { RaceStatus } from '../../common/enums/race-status.enum';
import { trimString } from '../../common/transformers/trim-string.transformer';

export class UpdateRaceStatusDto {
  @IsEnum(RaceStatus)
  status: RaceStatus;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
