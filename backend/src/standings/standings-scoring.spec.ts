import { ResultStatus } from '../common/enums/result-status.enum';
import { pointsForResult } from './standings-scoring';

describe('standings scoring', () => {
  it.each([
    [1, 10],
    [2, 7],
    [3, 5],
    [4, 3],
    [5, 1],
  ])('awards %i place the official number of points', (position, points) => {
    expect(pointsForResult(ResultStatus.FINISHED, position)).toBe(points);
  });

  it('awards zero points after fifth place', () => {
    expect(pointsForResult(ResultStatus.FINISHED, 6)).toBe(0);
    expect(pointsForResult(ResultStatus.FINISHED, 50)).toBe(0);
  });

  it.each([
    ResultStatus.DID_NOT_START,
    ResultStatus.DID_NOT_FINISH,
    ResultStatus.DISQUALIFIED,
  ])('awards zero points to %s', (status) => {
    expect(pointsForResult(status, null)).toBe(0);
    expect(pointsForResult(status, 1)).toBe(0);
  });
});
