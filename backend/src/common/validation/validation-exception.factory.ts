import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const ownDetails = Object.values(error.constraints ?? {}).map(
      (message) => ({
        field,
        message,
      }),
    );

    return [
      ...ownDetails,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}

export function createValidationException(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    error: 'Bad Request',
    message: 'Request validation failed',
    details: flattenValidationErrors(errors),
  });
}
