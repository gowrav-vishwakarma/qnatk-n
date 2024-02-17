import 'reflect-metadata';

export const HookSymbol = Symbol('Hook');

export function Hook(eventPattern: string | string[]): ClassDecorator {
  return function (constructor: Function) {
    Reflect.defineMetadata(HookSymbol, eventPattern, constructor);
  };
}
