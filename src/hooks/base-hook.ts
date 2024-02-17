import { Transaction } from 'sequelize';
import { HookInterface } from './hook.interface';
import { validateOrReject, ValidationError } from 'class-validator';
import { ValidationException } from '../Exceptions/ValidationException';
import { plainToInstance } from 'class-transformer';

export abstract class BaseHook implements HookInterface {
  priority: number = 0;

  // Define the `execute` method as abstract so that derived classes must implement it.
  abstract execute(
    previousData: any,
    transaction: Transaction | undefined,
    originalData: any,
    extraInfo?: any,
    passedExtraData?: Record<string, any>,
  ): Promise<any>;

  // Method to validate data against a DTO and return the DTO object
  async validateData<T extends object>(
    data: T,
    DTOClass: new () => T,
  ): Promise<T> {
    let dtoInstance;

    // Check if data is already an instance of DTOClass
    if (data instanceof DTOClass) {
      dtoInstance = data;
    } else {
      // Convert plain data to DTO instance
      dtoInstance = plainToInstance(DTOClass, data);
    }

    try {
      await validateOrReject(dtoInstance);
      return dtoInstance;
    } catch (errors) {
      console.log(errors);
      throw new ValidationException(
        this.mapValidationErrors(errors as ValidationError[]),
      );
    }
  }

  mapValidationErrors(
    validationErrors: ValidationError[],
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    function processValidationError(
      validationErrors: ValidationError[],
      parentPath?: string,
    ) {
      validationErrors.forEach((error) => {
        const path = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;

        // If there are constraints on the current error object, add them to the errors object
        if (error.constraints) {
          errors[path] = Object.values(error.constraints);
        }

        // If there are children, recursively process them
        if (error.children && error.children.length > 0) {
          processValidationError(error.children, path);
        }
      });
    }

    processValidationError(validationErrors);
    return errors;
  }
}
