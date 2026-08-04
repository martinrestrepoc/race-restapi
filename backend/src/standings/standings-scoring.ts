import { ResultStatus } from '../common/enums/result-status.enum';

export const POINTS_BY_POSITION = Object.freeze({
  1: 10,
  2: 7,
  3: 5,
  4: 3,
  5: 1,
} as const);

export const ZERO_POINT_RESULT_STATUSES = Object.freeze([
  ResultStatus.DID_NOT_START,
  ResultStatus.DID_NOT_FINISH,
  ResultStatus.DISQUALIFIED,
]);

export function pointsForResult(
  status: ResultStatus,
  finalPosition: number | null,
): number {
  if (status !== ResultStatus.FINISHED || finalPosition === null) return 0;

  return (
    POINTS_BY_POSITION[finalPosition as keyof typeof POINTS_BY_POSITION] ?? 0
  );
}

export function pointsSql(resultAlias: string): string {
  const positionCases = Object.entries(POINTS_BY_POSITION)
    .map(([position, points]) => `WHEN ${position} THEN ${points}`)
    .join(' ');

  return `CASE WHEN ${resultAlias}.status = 'FINISHED' THEN CASE ${resultAlias}.final_position ${positionCases} ELSE 0 END ELSE 0 END`;
}
