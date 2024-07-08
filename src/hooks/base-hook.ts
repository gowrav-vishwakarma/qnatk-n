import { Transaction } from 'sequelize';
import { HookInterface } from './hook.interface';
import { validateOrReject, ValidationError } from 'class-validator';
import { ValidationException } from '../Exceptions/ValidationException';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseHook implements HookInterface {
  priority: number = 0;

  protected autoDtoFileName: string | null = null;

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

  protected generateDtoFile(data: any, callerFilePath: string): void {
    if (process.env.NODE_ENV !== 'development' || !this.autoDtoFileName) {
      return;
    }

    const dtoContent = this.generateDtoContent(data);
    const filePath = this.getSourceFilePath(
      `${this.autoDtoFileName}.dto.ts`,
      callerFilePath,
    );

    fs.writeFileSync(filePath, dtoContent);
    console.log(`DTO file generated: ${filePath}`);
  }

  private getSourceFilePath(filename: string, callerFilePath: string): string {
    const dir = path.dirname(callerFilePath);
    return path.join(dir, filename);
  }

  private generateDtoContent(data: any): string {
    const properties = Object.entries(data)
      .map(([key, value]) => {
        const type = this.getPropertyType(value);
        const decorators = this.getPropertyDecorators(type);
        return `
  ${decorators}
  ${key}: ${type};`;
      })
      .join('\n');

    const importedDecorators = new Set<string>();
    Object.values(data).forEach((value) => {
      const type = this.getPropertyType(value);
      this.getPropertyDecorators(type)
        .match(/@\w+/g)
        ?.forEach((decorator) => {
          importedDecorators.add(decorator.slice(1));
        });
    });

    const imports = `import { ${Array.from(importedDecorators).join(
      ', ',
    )} } from 'class-validator';`;

    return `${imports}

export class ${this.autoDtoFileName}Dto {${properties}
}`;
  }

  private getPropertyType(value: any): string {
    if (Array.isArray(value)) {
      return 'any[]'; // You might want to make this more specific based on array contents
    }
    if (value === null) {
      return 'any';
    }
    return typeof value;
  }

  private getPropertyDecorators(type: string): string {
    let decorators = '@IsNotEmpty()';
    switch (type) {
      case 'string':
        decorators += '\n  @IsString()';
        break;
      case 'number':
        decorators += '\n  @IsNumber()';
        break;
      case 'boolean':
        decorators += '\n  @IsBoolean()';
        break;
      case 'any[]':
        decorators += '\n  @IsArray()';
        break;
      default:
        decorators += '\n  @IsObject()';
    }
    return decorators;
  }

  // This method should be called at the beginning of the execute method in child classes
  protected checkAndGenerateDto(data: any): void {
    if (this.autoDtoFileName) {
      const callerFilePath = this.getCallerFilePath();
      this.generateDtoFile(data, callerFilePath);
    }
  }

  private getCallerFilePath(): string {
    const stackTrace = new Error().stack;
    const callerLine = stackTrace?.split('\n')[3]; // 3 is the index of the caller in the stack trace
    const match = callerLine?.match(/\((.*):\d+:\d+\)/);
    return match ? match[1] : '';
  }
}
