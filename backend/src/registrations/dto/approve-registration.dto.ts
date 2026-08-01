import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ApproveRegistrationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  startingPosition: number;
}
