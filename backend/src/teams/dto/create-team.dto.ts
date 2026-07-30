import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TeamStatus } from '../../common/enums/team-status.enum';
import { trimString } from '../../common/transformers/trim-string.transformer';

export class CreateTeamDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  responsiblePerson: string;

  @IsEnum(TeamStatus)
  status: TeamStatus;
}
