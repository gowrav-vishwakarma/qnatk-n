import { Inject, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { ValidationException } from './Exceptions/ValidationException';
import { ActionDTO, ActionListDTO } from './dto/ActionListDTO';

@Injectable()
export class QnatkService {
  constructor(
    private sequelize: Sequelize,
    @Inject('MODEL_ACTIONS')
    private modelActions: Record<string, ActionListDTO>[] = [],
  ) {}

  public sanitizeOptions(options: any) {
    const { limit, offset, sortBy, sortByDescending, ...modelOptions } =
      options;

    const order = [];

    // Check if sortBy is an array and has the required structure
    if (Array.isArray(sortBy) && sortBy.length > 0) {
      const [sortByObject, sortField] = sortBy;
      if (sortByObject.model && sortField) {
        const sequelizeModel = this.sequelize.model(sortByObject.model);
        order.push([
          { model: sequelizeModel, as: sortByObject.as },
          sortField,
          sortByDescending ? 'DESC' : 'ASC',
        ]);
      }
    } else if (typeof sortBy === 'string') {
      // Handle the regular case where sortBy is just a string
      order.push([sortBy, sortByDescending ? 'DESC' : 'ASC']);
    }

    let attributes = [];
    if (modelOptions.attributes) {
      attributes = this.sanitizeAttributes(modelOptions.attributes);
    }

    // Ensure that include is defined at the root level
    if (!modelOptions.include) {
      modelOptions.include = [];
    }

    let where = {};
    // Apply sanitation for where conditions in modelOptions
    if (modelOptions.where) {
      where = modelOptions.where;
    }

    return {
      ...modelOptions,
      limit,
      offset,
      order,
      attributes: attributes.length > 0 ? attributes : undefined,
      where: this.sanitizeWhere(where),
      include: this.sanitizeRecursiveIncludes(modelOptions.include),
    };
  }

  sanitizeAttributes(attributes: any) {
    return attributes.map((attr) => {
      if (typeof attr === 'object' && attr.fn && attr.col) {
        // Handle function call
        return [
          this.sequelize.fn(attr.fn, this.sequelize.col(attr.col)),
          attr.as,
        ];
      } else if (typeof attr === 'object' && attr.literal) {
        // Handle literal
        return this.sequelize.literal(attr.literal);
      }
      return attr;
    });
  }

  // Recursive function to traverse and sanitize options
  sanitizeRecursiveIncludes(opts: any): any {
    if (!Array.isArray(opts)) {
      opts = [opts];
    }
    return opts.map((inc: any) => {
      if (typeof inc === 'string') {
        return { model: this.sequelize.model(inc) };
      } else {
        if (typeof inc.model === 'string') {
          inc.model = this.sequelize.model(inc.model);
        }
        // Recursively sanitize nested options
        if (inc.include) {
          inc.include = this.sanitizeRecursiveIncludes(inc.include);
        }

        // Apply sanitation for where conditions
        if (inc.where) {
          inc.where = this.sanitizeWhere(inc.where);
        }

        if (inc.attributes) {
          inc.attributes = this.sanitizeAttributes(inc.attributes);
        }

        return inc;
      }
    });
  }

  private sanitizeWhere(where: any) {
    const sequelizeOperators = {
      $eq: Op.eq,
      $ne: Op.ne,
      $gte: Op.gte,
      $gt: Op.gt,
      $lte: Op.lte,
      $lt: Op.lt,
      $not: Op.not,
      $in: Op.in,
      $notIn: Op.notIn,
      $like: Op.like,
      $notLike: Op.notLike,
      $iLike: Op.iLike,
      $notILike: Op.notILike,
      $regexp: Op.regexp,
      $notRegexp: Op.notRegexp,
      $iRegexp: Op.iRegexp,
      $notIRegexp: Op.notIRegexp,
      $between: Op.between,
      $notBetween: Op.notBetween,
      $and: Op.and,
      $or: Op.or,
      $fullText: 'fullText',

      // ... other operators
    };

    function sanitizeCondition(condition, sequelize) {
      if (Array.isArray(condition)) {
        return condition.map((c) => sanitizeCondition(c, sequelize));
      } else if (
        condition &&
        typeof condition === 'object' &&
        condition.constructor === Object
      ) {
        const sanitizedCondition = {};

        // Handle full-text search if present in this level of condition
        if (condition.$fullText) {
          const fullTextConditions = [];
          const fullTextArray = Array.isArray(condition.$fullText)
            ? condition.$fullText
            : [condition.$fullText];

          fullTextArray.forEach((ftCondition) => {
            if (ftCondition.table && ftCondition.query) {
              const fields = ftCondition.fields
                .map((field) => `${ftCondition.table}.${field}`)
                .join(', ');
              const matchAgainst = sequelize.literal(
                `MATCH(${fields}) AGAINST('"${ftCondition.query}"' IN BOOLEAN MODE)`,
              );
              fullTextConditions.push(matchAgainst);
            }
          });

          // Delete the $fullText key to avoid processing it as a standard operator
          delete condition.$fullText;

          // Combine full-text conditions with other sanitized conditions in this level
          if (fullTextConditions.length > 0) {
            sanitizedCondition[Op.and] = sanitizedCondition[Op.and]
              ? [...sanitizedCondition[Op.and], ...fullTextConditions]
              : fullTextConditions;
          }
        }

        // Recursively apply to nested objects/operators
        for (const [key, value] of Object.entries(condition)) {
          if (key in sequelizeOperators) {
            sanitizedCondition[sequelizeOperators[key]] = sanitizeCondition(
              value,
              sequelize,
            );
          } else {
            sanitizedCondition[key] = sanitizeCondition(value, sequelize);
          }
        }
        return sanitizedCondition;
      }
      return condition; // Base case: the condition is a primitive or non-plain object, return as-is
    }

    return sanitizeCondition(where, this.sequelize);
  }

  findAll(baseModel: string, options?: any) {
    const sanitizedOptions = this.sanitizeOptions(options);
    // console.log('sanitizedOptions', sanitizedOptions.where);
    return this.sequelize.model(baseModel).findAll(sanitizedOptions);
  }

  async findAndCountAll(baseModel: string, options?: any) {
    const sanitizedOptions = this.sanitizeOptions(options);
    // console.log('sanitizedOptions', sanitizedOptions);
    return this.sequelize
      .model(baseModel)
      .findAndCountAll({ ...sanitizedOptions, distinct: true });
  }

  async getActions(baseModel: string) {
    return this.modelActions[baseModel] || [];
  }

  async addNew(baseModel: string, body: any, transaction: Transaction) {
    try {
      return await this.sequelize.model(baseModel).create(body, {
        transaction,
      });
    } catch (err: any) {
      console.log('err', err);
      // throw err;
      throw new ValidationException({
        Error: [err.message],
      });
    }
  }

  async findOneFormActionInfo(
    baseModel: string,
    action: Partial<ActionDTO>,
    data: any,
    transaction?: Transaction,
  ) {
    if (action.mode === 'NoRecord') return;
    const where = {};
    if (action.loadBy) {
      where[action.loadBy] = data[action.loadBy];
    } else {
      throw new ValidationException({
        Error: [`loadBy not found`],
      });
    }
    const model = await this.sequelize.model(baseModel).findOne({
      where,
      transaction,
    });

    if (!model)
      throw new ValidationException({
        Error: [
          `Record not found for model ${baseModel} with ${JSON.stringify(
            where,
          )}`,
        ],
      });

    return model;
  }

  async findAllFormActionInfo(
    baseModel: string,
    action: ActionDTO,
    data_user: any,
    transaction?: Transaction,
  ) {
    const where = {};
    if (action.loadBy) {
      where[action.loadBy] = data_user.data.records.map(
        (record) => record[action.loadBy],
      );
    } else {
      throw new ValidationException({
        Error: [`loadBy not found`],
      });
    }
    return await this.sequelize.model(baseModel).findAll({
      where,
      transaction,
    });
  }

  async updateByPk(
    baseModel: string,
    primaryKey: string | number,
    primaryField: string,
    body: any,
    transaction: Transaction,
  ) {
    try {
      return await this.sequelize.model(baseModel).update(body, {
        where: {
          [primaryField]: primaryKey,
        },
        transaction,
      });
    } catch (err: any) {
      console.log('err', err);
      // throw err;
      throw new ValidationException({
        Error: [err.message],
      });
    }
  }

  async deleteByPk(
    baseModel: string,
    primaryKey: string | number,
    primaryField: string,
    //body: any,
    transaction: Transaction,
  ) {
    try {
      return await this.sequelize.model(baseModel).destroy({
        where: {
          [primaryField]: primaryKey,
        },
        transaction,
      });
    } catch (err: any) {
      console.log('err', err);
      // throw err;
      throw new ValidationException({
        Error: [err.message],
      });
    }
  }
}
