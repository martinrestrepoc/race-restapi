import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ResultStatus } from '../../common/enums/result-status.enum';

export class ResultQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ResultStatus)
  status?: ResultStatus;
}
