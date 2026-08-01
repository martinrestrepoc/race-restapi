import { IsOptional, IsUUID } from 'class-validator';

export class CreateRegistrationDto {
  @IsOptional()
  @IsUUID('4')
  competitorId?: string;

  @IsOptional()
  @IsUUID('4')
  teamId?: string;
}
