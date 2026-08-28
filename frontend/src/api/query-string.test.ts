import { describe, expect, it } from 'vitest';

import { serializeQuery } from './query-string';

describe('serializeQuery', () => {
  it('encodes values and omits empty parameters', () => {
    expect(
      serializeQuery({
        active: false,
        limit: 20,
        page: 2,
        search: 'camello veloz',
        status: undefined,
        type: '',
      }),
    ).toBe('?active=false&limit=20&page=2&search=camello+veloz');
  });

  it('returns an empty suffix when there are no effective parameters', () => {
    expect(serializeQuery()).toBe('');
    expect(serializeQuery({ search: '', status: null })).toBe('');
  });
});
