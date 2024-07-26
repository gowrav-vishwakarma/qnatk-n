import { BaseHook, ValidateDataOptions } from './base-hook';
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ValidationException } from '../Exceptions/ValidationException';

class TestDTO {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    age: number;
}

class TestHook extends BaseHook {
    async execute() {
        // Implementation not needed for these tests
    }
}

describe('BaseHook', () => {
    let testHook: TestHook;

    beforeEach(() => {
        testHook = new TestHook();
    });

    describe('validateData', () => {
        it('should validate correct data', async () => {
            const data = { name: 'John Doe', age: 30 };
            const result = await testHook.validateData<TestDTO>(data, TestDTO);
            expect(result).toBeInstanceOf(TestDTO);
            expect(result.name).toBe('John Doe');
            expect(result.age).toBe(30);
        });

        it('should convert string to number for age field', async () => {
            const data = { name: 'John Doe', age: '30' };
            const result = await testHook.validateData<TestDTO>(
                data as any,
                TestDTO,
            );
            expect(result).toBeInstanceOf(TestDTO);
            expect(result.name).toBe('John Doe');
            expect(result.age).toBe(30);
            expect(typeof result.age).toBe('number');
        });

        it('should throw ValidationException for non-numeric string in age field', async () => {
            const data = { name: 'John Doe', age: 'thirty' };
            await expect(
                testHook.validateData<TestDTO>(data as any, TestDTO),
            ).rejects.toThrow(ValidationException);
        });

        it('should handle mixed type inputs', async () => {
            const data = { name: 'John Doe', age: '30', extra: 'field' };
            const result = await testHook.validateData<TestDTO>(
                data as any,
                TestDTO,
            );
            expect(result).toBeInstanceOf(TestDTO);
            expect(result.name).toBe('John Doe');
            expect(result.age).toBe(30);
            expect(typeof result.age).toBe('number');
        });

        it('should remove extra fields when removeExtraFields option is true', async () => {
            const data = { name: 'John Doe', age: '30', extra: 'field' };
            const options: ValidateDataOptions = { removeExtraFields: true };
            const result = await testHook.validateData<TestDTO>(
                data as any,
                TestDTO,
                options,
            );
            expect(result).not.toHaveProperty('extra');
            expect(result.age).toBe(30);
            expect(typeof result.age).toBe('number');
        });

        it('should throw ValidationException when errorOnExtraFields option is true and extra fields are present', async () => {
            const data = { name: 'John Doe', age: '30', extra: 'field' };
            const options: ValidateDataOptions = { errorOnExtraFields: true };
            await expect(
                testHook.validateData<TestDTO>(data as any, TestDTO, options),
            ).rejects.toThrow(ValidationException);
        });

        it('should accept an instance of TestDTO', async () => {
            const dtoInstance = plainToInstance(TestDTO, {
                name: 'John Doe',
                age: 30,
            });
            const result = await testHook.validateData<TestDTO>(
                dtoInstance,
                TestDTO,
            );
            expect(result).toBe(dtoInstance);
        });

        it('should handle nested objects', async () => {
            class NestedDTO {
                @IsNotEmpty()
                @IsString()
                address: string;
            }

            class ParentDTO {
                @IsNotEmpty()
                @IsString()
                name: string;

                @IsNotEmpty()
                nested: NestedDTO;
            }

            const data = {
                name: 'John Doe',
                nested: { address: '123 Main St' },
            };
            const result = await testHook.validateData<ParentDTO>(
                data,
                ParentDTO,
            );
            expect(result).toBeInstanceOf(ParentDTO);
            expect(result.nested).toBeInstanceOf(NestedDTO);
        });
    });
});
