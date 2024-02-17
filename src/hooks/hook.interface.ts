import { Transaction } from 'sequelize';

export interface ChangeEventHookExtraInfo {
  rootObject: any;
  difference: any;
}
export interface HookInterface {
  priority: number;
  execute: (
    previousData: any,
    originalData: any,
    transaction: Transaction | undefined,
    extraInfo?: any,
    passedExtraData?: Record<string, any>,
  ) => Promise<any>;
}
