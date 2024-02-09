import { Model } from 'sequelize-typescript';
import { ActionDTO } from './ActionListDTO';
import { FindOptions } from 'sequelize';
import { Express } from 'express';

export interface BeforeHookParams<DataDTO, UserDTO = any> {
  data: DataDTO;
  user: UserDTO;
}

export interface BeforeActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface ILACBefore<UserDTO = any> {
  fetchOptions: FindOptions;
  user: UserDTO;
}
export interface ILACExecute<UserDTO = any> {
  fetchOptions: FindOptions;
  user: UserDTO;
}

export interface ILACAfter<ModelType extends Model, UserDTO = any> {
  count: number;
  rows: ModelType[];
  fetchOptions: FindOptions;
  user: UserDTO;
  [key: string]: any;
}

export interface ActionExecuteSkipModelLoadParams<
  RecordDTO = any,
  UserDTO = any,
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
}

export interface ActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface AfterActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface BulkBeforeActionExecuteParams<RecordDTO = any, UserDTO = any> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
}

export interface BulkActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstances: ModelType;
}

export interface BeforeHookParamsWithFiles<RecordDTO = any, UserDTO = any> {
  data: RecordDTO;
  user: UserDTO;
  files: Array<Express.Multer.File>;
}

export interface AfterHookParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface AfterHookParamsWithFiles<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any,
> {
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
  files: Array<Express.Multer.File>;
}
