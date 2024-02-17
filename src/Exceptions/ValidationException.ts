import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

interface ValidationErrors {
  [key: string]: string[];
}

export class ValidationException extends HttpException {
  constructor(errors: ValidationErrors) {
    super({ errors }, HttpStatus.BAD_REQUEST);
  }
}

export const mapValidationErrors = (
  validationErrors: ValidationError[],
): Record<string, string[]> => {
  return validationErrors.reduce((acc, err) => {
    const constraints = err.constraints;
    acc[err.property] = constraints
      ? [Object.values(constraints).join('. ')] // Join messages if there are multiple
      : ['An error occurred'];
    return acc;
  }, {});
};
