import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { Competitor } from '../entities/competitor.entity';

export class CompetitorResponseDto {
  id: string;
  name: string;
  nickname: string;
  type: CompetitorType;
  dateOfBirth: string;
  weight: number;
  height: number;
  origin: string;
  status: CompetitorStatus;
  registeredAt: string;
  updatedAt: string;

  static fromEntity(competitor: Competitor): CompetitorResponseDto {
    return {
      id: competitor.id,
      name: competitor.name,
      nickname: competitor.nickname,
      type: competitor.type,
      dateOfBirth: competitor.dateOfBirth,
      weight: competitor.weight,
      height: competitor.height,
      origin: competitor.origin,
      status: competitor.status,
      registeredAt: competitor.registeredAt.toISOString(),
      updatedAt: competitor.updatedAt.toISOString(),
    };
  }
}
