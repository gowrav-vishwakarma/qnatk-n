import { Model } from "sequelize-typescript";
import { ActionDTO } from "./ActionListDTO";
import { FindOptions } from "sequelize";
import { Express } from "express";

export interface BeforeHookParams<DataDTO, UserDTO = any> {
  data: DataDTO;
  user: UserDTO;
}

export interface BeforeActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
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
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
}

export interface ActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}
export interface AfterActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface ActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  files: Array<Express.Multer.File>;
  modelInstance: ModelType;
}
export interface BeforeActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  files: Array<Express.Multer.File>;
  modelInstance: ModelType;
}

export interface AfterActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  action: ActionDTO;
  data: RecordDTO;
  user: UserDTO;
  files: Array<Express.Multer.File>;
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
  UserDTO = any
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
  UserDTO = any
> {
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
}

export interface AfterHookParamsWithFiles<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> {
  data: RecordDTO;
  user: UserDTO;
  modelInstance: ModelType;
  files: Array<Express.Multer.File>;
}

// Extend the base interface ----------------

export interface QNATKIBeforeHookParams<DataDTO, UserDTO = any>
  extends BeforeHookParams<DataDTO, UserDTO> {}

export interface QNATKIBeforeActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends BeforeActionExecuteParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIILACBefore<UserDTO = any> extends ILACBefore<UserDTO> {}

export interface QNATKIILACExecute<UserDTO = any>
  extends ILACExecute<UserDTO> {}

export interface QNATKIILACAfter<ModelType extends Model, UserDTO = any>
  extends ILACAfter<ModelType, UserDTO> {}

export interface QNATKIActionExecuteSkipModelLoadParams<
  RecordDTO = any,
  UserDTO = any
> extends ActionExecuteSkipModelLoadParams<RecordDTO, UserDTO> {}

export interface QNATKIActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends ActionExecuteParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIAfterActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends AfterActionExecuteParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIBeforeActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends BeforeActionExecuteWithFilesParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends ActionExecuteWithFilesParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIAfterActionExecuteWithFilesParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends AfterActionExecuteWithFilesParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIBulkBeforeActionExecuteParams<
  RecordDTO = any,
  UserDTO = any
> extends BulkBeforeActionExecuteParams<RecordDTO, UserDTO> {}

export interface QNATKIBulkActionExecuteParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends BulkActionExecuteParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIBeforeHookParamsWithFiles<RecordDTO = any, UserDTO = any>
  extends BeforeHookParamsWithFiles<RecordDTO, UserDTO> {}

export interface QNATKIAfterHookParams<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends AfterHookParams<ModelType, RecordDTO, UserDTO> {}

export interface QNATKIAfterHookParamsWithFiles<
  ModelType extends Model,
  RecordDTO = any,
  UserDTO = any
> extends AfterHookParamsWithFiles<ModelType, RecordDTO, UserDTO> {}
