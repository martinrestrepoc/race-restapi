import type { ValidationError } from 'class-validator';
import { createValidationException } from './validation-exception.factory';

describe('createValidationException', () => {
  it('returns stable field-level validation details', () => {
    const errors: ValidationError[] = [
      {
        property: 'weight',
        constraints: {
          isPositive: 'weight must be a positive number',
        },
        children: [],
      },
    ];

    const exception = createValidationException(errors);

    expect(exception.getResponse()).toEqual({
      error: 'Bad Request',
      message: 'Request validation failed',
      details: [
        {
          field: 'weight',
          message: 'weight must be a positive number',
        },
      ],
    });
  });
});
