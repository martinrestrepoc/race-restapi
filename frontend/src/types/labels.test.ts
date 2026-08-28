import { describe, expect, it } from 'vitest';

import {
  appRoleLabels,
  competitorStatusLabels,
  raceStatusLabels,
  teamStatusLabels,
} from './labels';

describe('API enum labels', () => {
  it('contains only the implemented application roles', () => {
    expect(Object.keys(appRoleLabels)).toEqual([
      'ADMINISTRATOR',
      'RACE_ORGANIZER',
      'VIEWER',
    ]);
  });

  it('contains only implemented lifecycle statuses', () => {
    expect(Object.keys(competitorStatusLabels)).toEqual([
      'ACTIVE',
      'SUSPENDED',
      'RETIRED',
    ]);
    expect(Object.keys(teamStatusLabels)).toEqual(['ACTIVE', 'INACTIVE']);
    expect(Object.keys(raceStatusLabels)).toEqual([
      'DRAFT',
      'OPEN_FOR_REGISTRATION',
      'CLOSED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
  });
});
