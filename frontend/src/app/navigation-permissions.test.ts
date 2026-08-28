import { describe, expect, it } from 'vitest';

import { filterNavigationByRoles } from './navigation-permissions';

describe('filterNavigationByRoles', () => {
  it('shows administrator navigation', () => {
    const keys = filterNavigationByRoles(['ADMINISTRATOR']).map(
      (item) => item.key,
    );

    expect(keys).toContain('administration');
  });

  it('hides administrator navigation from organizers', () => {
    const keys = filterNavigationByRoles(['RACE_ORGANIZER']).map(
      (item) => item.key,
    );

    expect(keys).not.toContain('administration');
  });

  it('keeps viewer navigation read-only', () => {
    const keys = filterNavigationByRoles(['VIEWER']).map((item) => item.key);

    expect(keys).not.toContain('administration');
    expect(keys).toEqual(
      expect.arrayContaining([
        'dashboard',
        'competitors',
        'teams',
        'races',
        'standings',
      ]),
    );
  });
});
