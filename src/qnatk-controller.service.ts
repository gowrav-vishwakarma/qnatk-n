import { Inject, Injectable } from '@nestjs/common';
import { Model, Sequelize } from 'sequelize-typescript';
import { QnatkService } from './qnatk.service';
import { HooksService } from './hooks/hooks.service';
import { QnatkListDTO } from './dto/QnatkListDTO';
import { Transaction } from 'sequelize';
import { ActionDTO, ActionListDTO } from './dto/ActionListDTO';

import { Express } from 'express';

@Injectable()
export class QnatkControllerService {
  constructor(
    protected readonly qnatkService: QnatkService,
    protected readonly hooksService: HooksService,
    protected sequelize: Sequelize,
    @Inject('MODEL_ACTIONS') protected modelActions: ActionListDTO
  ) {}

  async list<UserDTO = any>(
    baseModel: string,
    body: QnatkListDTO,
    user: UserDTO,
    hookName?: string
  ): Promise<Model<any, any>[]> {
    const t = undefined;
    const hookedOptions = await this.hooksService.triggerHooks(
      `before:list-${hookName}:${baseModel}`,
      {
        fetchOptions: body,
        user,
      },
      t
    );

    let executedData = [];

    if (this.hooksService.hasHook(`execute:list-${hookName}:${baseModel}`)) {
      executedData = await this.hooksService.triggerHooks(
        `execute:list-${hookName}:${baseModel}`,
        hookedOptions,
        t
      );
    } else {
      executedData = await this.qnatkService.findAll(
        baseModel,
        hookedOptions.fetchOptions
      );
    }

    const finalData = await this.hooksService.triggerHooks(
      `after:list-${hookName}:${baseModel}`,
      { data: executedData, fetchOptions: body, user },
      t
    );

    return finalData.data;
  }

  async listAndCount<UserDTO = any>(
    baseModel: string,
    body: QnatkListDTO,
    user: UserDTO,
    hookName?: string
  ) {
    const t = undefined;
    const validated_data = await this.hooksService.triggerHooks(
      `before:lac-${hookName}:${baseModel}`,
      {
        fetchOptions: body,
        user,
      },
      t
    );

    let executedData: { rows: any[]; count: number } = {
      rows: [],
      count: 0,
    };
    if (this.hooksService.hasHook(`execute:lac-${hookName}:${baseModel}`)) {
      executedData = await this.hooksService.triggerHooks(
        `execute:lac-${hookName}:${baseModel}`,
        validated_data,
        t
      );
    } else {
      executedData = await this.qnatkService.findAndCountAll(baseModel, body);
    }

    executedData = await this.hooksService.triggerHooks(
      `after:lac-${hookName}:${baseModel}`,
      { ...executedData, fetchOptions: body, user },
      t
    );

    return {
      ...executedData,
      actions: await this.qnatkService.getActions(baseModel),
      fetchOptions: undefined,
      user: undefined,
    };
  }

  async addNew<UserDTO = any>(
    baseModel: string,
    data: any,
    user: UserDTO,
    transaction?: Transaction
  ) {
    const execute = async (t: Transaction) => {
      let model_instance;
      let validated_data = await this.hooksService.triggerHooks(
        `before:create:${baseModel}`,
        { data, user },
        t
      );
      if (this.hooksService.hasHook(`execute:create:${baseModel}`)) {
        validated_data = await this.hooksService.triggerHooks(
          `execute:create:${baseModel}`,
          validated_data,
          t
        );
      } else {
        model_instance = await this.qnatkService.addNew(
          baseModel,
          validated_data.data,
          t
        );
      }

      return await this.hooksService.triggerHooks(
        `after:create:${baseModel}`,
        {
          modelInstance: model_instance,
          ...validated_data,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute);
    }

    return {
      ...final_data,
      message: `Action executed successfully`,
    };
  }

  async addNewWithFile<UserDTO = any>(
    baseModel: string,
    data: any,
    files: Array<Express.Multer.File>,
    user: UserDTO,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    const execute = async (t: Transaction) => {
      let model_instance;

      let validated_data = await this.hooksService.triggerHooks(
        `before:create:${baseModel}`,
        { data, files, user },
        t
      );

      if (this.hooksService.hasHook(`execute:create:${baseModel}`)) {
        validated_data = await this.hooksService.triggerHooks(
          `execute:create:${baseModel}`,
          validated_data,
          t
        );
      } else {
        model_instance = await this.qnatkService.addNew(
          baseModel,
          validated_data.data,
          t
        );
      }

      return await this.hooksService.triggerHooks(
        `after:create:${baseModel}`,
        {
          modelInstance: model_instance,
          ...validated_data,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute).catch((err) => {
        console.log(err);
        throw err;
      });
    }

    return {
      ...final_data,
      message: `Action executed successfully`,
    };
  }

  async executeAction<UserDTO>(
    baseModel: string,
    action: string,
    data: any,
    user: UserDTO,
    skipModelLoad?: boolean,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    // console.log(this.modelActions[baseModel]);
    const actionObject = this.modelActions[baseModel]?.[action];
    const execute = async (t: Transaction) => {
      // console.log('before execute validated_data', data);

      if (!actionObject) {
        throw new Error(`Action ${action} not found for model ${baseModel}`);
      }

      let model_instance = undefined;

      if (!skipModelLoad)
        model_instance = await this.qnatkService.findOneFormActionInfo(
          baseModel,
          actionObject,
          data,
          t
        );

      const validated_data = await this.hooksService.triggerHooks(
        `before:${action}:${baseModel}`,
        {
          action: actionObject,
          data,
          user,
          modelInstance: model_instance,
        },
        t
      );

      const executedData = await this.hooksService.triggerHooks(
        `execute:${action}:${baseModel}`,
        validated_data,
        t,
        undefined,
        undefined,
        true
      );

      return await this.hooksService.triggerHooks(
        `after:${action}:${baseModel}`,
        executedData,
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      await this.hooksService.triggerHooks(
        `beforeTransaction:${baseModel}:${action}`,
        {
          action: actionObject,
          data,
          user,
        },
        null
      );
      final_data = await this.sequelize.transaction(execute);
      // .catch((err) => console.log('Rolled back with ', err));
    }

    return {
      ...final_data,
      modelInstance: actionObject.returnModel
        ? final_data.modelInstance
        : undefined,
      data: undefined,
      user: undefined,
      message: `Action ${action} executed successfully`,
    };
  }

  async executeActionWithFile<UserDTO>(
    baseModel: string,
    action: string,
    data: any,
    user: UserDTO,
    files: Array<Express.Multer.File>,
    skipModelLoad?: boolean,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    // console.log(this.modelActions[baseModel]);
    const actionObject = this.modelActions[baseModel]?.[action];
    const execute = async (t: Transaction) => {
      // console.log('before execute validated_data', data);

      if (!actionObject) {
        throw new Error(`Action ${action} not found for model ${baseModel}`);
      }

      let model_instance = undefined;

      if (!skipModelLoad)
        model_instance = await this.qnatkService.findOneFormActionInfo(
          baseModel,
          actionObject,
          data,
          t
        );

      const validated_data = await this.hooksService.triggerHooks(
        `before:${action}:${baseModel}`,
        {
          action: actionObject,
          data,
          user,
          files,
          modelInstance: model_instance,
        },
        t
      );

      const executedData = await this.hooksService.triggerHooks(
        `execute:${action}:${baseModel}`,
        validated_data,
        t,
        undefined,
        undefined,
        true
      );

      return await this.hooksService.triggerHooks(
        `after:${action}:${baseModel}`,
        executedData,
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      await this.hooksService.triggerHooks(
        `beforeTransaction:${baseModel}:${action}`,
        {
          action: actionObject,
          data,
          user,
        },
        null
      );
      final_data = await this.sequelize.transaction(execute);
      // .catch((err) => console.log('Rolled back with ', err));
    }

    return {
      ...final_data,
      modelInstance: actionObject.returnModel
        ? final_data.modelInstance
        : undefined,
      data: undefined,
      user: undefined,
      message: `Action ${action} executed successfully`,
    };
  }

  async bulkExecuteAction<UserDTO = any>(
    baseModel: string,
    action: any,
    data: any,
    user: UserDTO,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    const actionObject: ActionDTO = this.modelActions[baseModel]?.[action];

    const execute = async (t: Transaction) => {
      if (!actionObject) {
        throw new Error(`Action ${action} not found for model ${baseModel}`);
      }

      const validated_data = await this.hooksService.triggerHooks(
        `before::bulk-${action}:${baseModel}`,
        { data, user },
        t
      );

      const model_instances = await this.qnatkService.findAllFormActionInfo(
        baseModel,
        actionObject,
        validated_data,
        t
      );

      console.log('model_instances', model_instances);

      const executedData = await this.hooksService.triggerHooks(
        `execute:bulk-${action}:${baseModel}`,
        {
          ...validated_data,
          modelInstances: model_instances,
        },
        t
      );

      return await this.hooksService.triggerHooks(
        `after::bulk-${action}:${baseModel}`,
        {
          ...validated_data,
          modelInstance: executedData,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute);
    }

    return {
      ...final_data,
      modelInstance: actionObject.returnModel
        ? final_data.modelInstance
        : undefined,
      data: undefined,
      user: undefined,
      message: `Action ${action} executed successfully`,
    };
  }

  async updateByPk<UserDTO = any>(
    baseModel: string,
    primaryKey: string | number,
    primaryField: string,
    data: any,
    user: UserDTO,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    const execute = async (t: Transaction) => {
      const data_with_id = {
        ...data,
        primaryKey: primaryKey,
        primaryField: primaryField,
      };

      const model_instance = await this.qnatkService.findOneByPk(
        baseModel,
        primaryKey,
        primaryField,
        t
      );

      let validated_data = await this.hooksService.triggerHooks(
        `before:edit:${baseModel}`,
        { data: data_with_id, user, modelInstance: model_instance },
        t
      );

      if (this.hooksService.hasHook(`execute:edit:${baseModel}`)) {
        validated_data = await this.hooksService.triggerHooks(
          `execute:edit:${baseModel}`,
          validated_data,
          t
        );
      } else {
        await this.qnatkService.updateByPk(
          baseModel,
          primaryKey,
          primaryField,
          validated_data.data,
          t
        );
      }

      return await this.hooksService.triggerHooks(
        `after:edit:${baseModel}`,
        {
          ...validated_data,
          modelInstance: model_instance,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute);
    }

    return {
      ...final_data,
      modelInstance: final_data.modelInstance,
      message: `Action Update executed successfully`,
    };
  }

  async updateByPkWithFiles<UserDTO = any>(
    baseModel: string,
    primaryKey: string | number,
    primaryField: string,
    data: any,
    user: UserDTO,
    files: Array<Express.Multer.File>,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    const execute = async (t: Transaction) => {
      const data_with_id = {
        ...data,
        primaryKey: primaryKey,
        primaryField: primaryField,
      };
      const model_instance = await this.qnatkService.findOneByPk(
        baseModel,
        primaryKey,
        primaryField,
        t
      );

      const validated_data = await this.hooksService.triggerHooks(
        `before:edit:${baseModel}`,
        {
          data: data_with_id,
          user,
          files,
          modelInstance: model_instance,
        },
        t
      );

      await this.qnatkService.updateByPk(
        baseModel,
        primaryKey,
        primaryField,
        validated_data.data,
        t
      );

      return await this.hooksService.triggerHooks(
        `after:edit:${baseModel}`,
        {
          ...validated_data,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute);
    }

    return {
      ...final_data,
      modelInstance: final_data.modelInstance,
      message: `Action Update executed successfully`,
    };
  }

  async deleteByPk<UserDTO = any>(
    baseModel: string,
    primaryKey: string | number,
    primaryField: string,
    //data: any,
    user: UserDTO,
    transaction?: Transaction // Add an optional transaction parameter
  ) {
    const execute = async (t: Transaction) => {
      const data_with_id = {
        //...data,
        primaryKey: primaryKey,
        primaryField: primaryField,
      };
      const validated_data = await this.hooksService.triggerHooks(
        `before:delete:${baseModel}`,
        { data: data_with_id, user },
        t
      );

      const model_instance = await this.qnatkService.deleteByPk(
        baseModel,
        primaryKey,
        primaryField,
        // data,
        t
      );

      return await this.hooksService.triggerHooks(
        `after:delete:${baseModel}`,
        {
          ...validated_data,
          modelInstance: model_instance,
        },
        t
      );
    };

    let final_data;
    if (transaction) {
      // Use the existing transaction
      final_data = await execute(transaction);
    } else {
      // Create a new transaction
      final_data = await this.sequelize.transaction(execute);
    }

    return {
      ...final_data,
      modelInstance: final_data.modelInstance,
      message: `Action Delete executed successfully`,
    };
  }
}
