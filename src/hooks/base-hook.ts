import { Transaction } from "sequelize";
import { HookInterface } from "./hook.interface";
import { validateOrReject, ValidationError } from "class-validator";
import { ValidationException } from "../Exceptions/ValidationException";
import { plainToInstance, ClassTransformOptions } from "class-transformer";
import * as fs from "fs";
import * as path from "path";
import { HookContextType } from "../dto/Hooks.dto";

export interface ValidateDataOptions {
  removeExtraFields?: boolean;
  errorOnExtraFields?: boolean;
}

export abstract class BaseHook implements HookInterface {
  priority: number = 0;

  protected autoDtoFileName: string | null = null;

  // Define the `execute` method as abstract so that derived classes must implement it.
  abstract execute(
    hookContext: HookContextType,
    transaction: Transaction | undefined,
    originalHookContext: any,
    extraInfo?: any,
    passedExtraData?: Record<string, any>
  ): Promise<any>;

  /**
   * Validates and transforms input data against a DTO class.
   *
   * This method provides flexible data validation with the following features:
   * 1. Type casting: Attempts to cast input data to the types defined in the DTO.
   * 2. Removal of extra fields: Can remove fields not defined in the DTO.
   * 3. Error on extra fields: Can throw an error if extra fields are present.
   * 4. Custom transformation: Allows customization of the transformation process.
   *
   * @param data The input data to validate and transform.
   * @param DTOClass The class of the DTO to validate against.
   * @param options An object with validation options:
   *                - removeExtraFields: If true, removes fields not in the DTO (default: false).
   *                - errorOnExtraFields: If true, throws an error if extra fields are present (default: false).
   * @param transformOptions Options for the class-transformer library.
   *
   * @returns A promise that resolves to an instance of the DTO class.
   * @throws ValidationException if validation fails or if extra fields are present when errorOnExtraFields is true.
   *
   * @example
   * // Basic usage (backward compatible)
   * const validData = await this.validateData(inputData, UserDTO);
   *
   * @example
   * // Remove extra fields
   * const validData = await this.validateData(inputData, UserDTO, { removeExtraFields: true });
   *
   * @example
   * // Throw error on extra fields
   * const validData = await this.validateData(inputData, UserDTO, { errorOnExtraFields: true });
   *
   * @example
   * // With custom transform options
   * const validData = await this.validateData(inputData, UserDTO, {}, { excludeExtraneousValues: true });
   */
  async validateData<T extends object, U extends T | T[] = T>(
  data: T | T[],
  DTOClass: new () => T,
  options: ValidateDataOptions = {},
  transformOptions: ClassTransformOptions = {},
): Promise<U> {
  const isInputArray = Array.isArray(data);
  const dataToValidate = isInputArray ? data : [data];

  const validatedData = await Promise.all(
    dataToValidate.map(async (item) => {
      let dtoInstance: T;

      if (item instanceof DTOClass) {
        dtoInstance = item;
      } else {
        dtoInstance = plainToInstance(DTOClass, item, {
          ...transformOptions,
        });
      }

      const dtoProperties = Object.getOwnPropertyNames(new DTOClass());
      const extraFields = Object.keys(item).filter(
        (key) => !dtoProperties.includes(key),
      );

      if (options.removeExtraFields) {
        extraFields.forEach((field) => delete (dtoInstance as any)[field]);
      } else if (options.errorOnExtraFields && extraFields.length > 0) {
        throw new ValidationException({
          extraFields: [`Extra fields found: ${extraFields.join(', ')}`],
        });
      }

      try {
        await validateOrReject(dtoInstance);
        return dtoInstance;
      } catch (errors) {
        throw new ValidationException(
          this.mapValidationErrors(errors as ValidationError[]),
        );
      }
    }),
  );

  // Return array if U is explicitly set to array type, otherwise return single item for backward compatibility
  return (Array.isArray(data) || U extends T[] ? validatedData : validatedData[0]) as U;
}


  mapValidationErrors(
    validationErrors: ValidationError[]
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    function processValidationError(
      validationErrors: ValidationError[],
      parentPath?: string
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
    if (process.env.NODE_ENV !== "development" || !this.autoDtoFileName) {
      return;
    }
    const relativeFilePath = `${this.autoDtoFileName}.dto.ts`;
    const filePath = this.getSourceFilePath(relativeFilePath, callerFilePath);
    const dir = path.dirname(filePath);

    // Extract the base file name (excluding folder path)
    const baseFileName = path.basename(this.autoDtoFileName);
    const dtoContent = this.generateDtoContent(data, baseFileName);
    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, dtoContent);
    console.log(`DTO file generated: ${filePath}`);
  }

  private getSourceFilePath(filename: string, callerFilePath: string): string {
    const dir = path.dirname(callerFilePath);
    return path.join(dir, filename);
  }

  private generateDtoContent(data: any, baseFileName: string): string {
    const properties = Object.entries(data)
      .map(([key, value]) => {
        const type = this.getPropertyType(value);
        const decorators = this.getPropertyDecorators(type);
        return `
  ${decorators}
  ${key}: ${type};`;
      })
      .join("\n");

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
      ", "
    )} } from 'class-validator';`;

    return `${imports}

export class ${baseFileName}Dto {${properties}
}`;
  }

  private getPropertyType(value: any): string {
    if (Array.isArray(value)) {
      return "any[]"; // You might want to make this more specific based on array contents
    }
    if (value === null) {
      return "any";
    }
    return typeof value;
  }

  private getPropertyDecorators(type: string): string {
    let decorators = "@IsNotEmpty()";
    switch (type) {
      case "string":
        decorators += "\n  @IsString()";
        break;
      case "number":
        decorators += "\n  @IsNumber()";
        break;
      case "boolean":
        decorators += "\n  @IsBoolean()";
        break;
      case "any[]":
        decorators += "\n  @IsArray()";
        break;
      default:
        decorators += "\n  @IsObject()";
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
    const callerLine = stackTrace?.split("\n")[3]; // 3 is the index of the caller in the stack trace
    const match = callerLine?.match(/\((.*):\d+:\d+\)/);
    return match ? match[1] : "";
  }
}
