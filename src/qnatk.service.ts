import { Inject, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { ValidationException } from './Exceptions/ValidationException';
import { ActionDTO, ActionListDTO } from './dto/ActionListDTO';

@Injectable()
export class QnatkService {
    constructor(
        protected sequelize: Sequelize,
        @Inject('MODEL_ACTIONS')
        protected modelActions: Record<string, ActionListDTO>[] = [],
    ) {}

    /*
    {
    "scope": false / 'simpleScope', ['simpleScope', { name: 'complexScope', params: [1, 2] }, 'anotherSimpleScope'],
    }
    works in includes as well with same way
    */
    private sanitizeScope(scope: any): any {
        if (scope === false) {
            return false;
        }
        if (Array.isArray(scope)) {
            return scope.map((s) => {
                if (typeof s === 'object' && s.name && s.params) {
                    return { method: [s.name, ...s.params] };
                }
                return s;
            });
        }
        if (typeof scope === 'string') {
            return [scope];
        }
        if (typeof scope === 'object' && scope.name && scope.params) {
            return [{ method: [scope.name, ...scope.params] }];
        }
        return undefined;
    }

    public sanitizeOptions(options: any) {
        const {
            limit,
            offset,
            sortBy,
            sortByDescending,
            scope,
            ...modelOptions
        } = options;

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

        // Add this part to handle the scope parameter
        const scopes = this.sanitizeScope(scope);

        return {
            ...modelOptions,
            limit,
            offset,
            order,
            attributes: attributes.length > 0 ? attributes : undefined,
            where: this.sanitizeWhere(where),
            include: this.sanitizeRecursiveIncludes(modelOptions.include),
            scope: scopes,
        };
    }

    sanitizeAttributes(attributes: any) {
        return attributes.map((attr) => {
            if (typeof attr === 'object' && attr.fn) {
                // Handle function call with multiple arguments
                const args = Array.isArray(attr.args)
                    ? attr.args.map((arg) => this.processArgument(arg))
                    : [this.processArgument(attr.col)];

                return [this.sequelize.fn(attr.fn, ...args), attr.as];
            } else if (typeof attr === 'object' && attr.literal) {
                // Handle literal
                return this.sequelize.literal(attr.literal);
            }
            return attr;
        });
    }

    private processArgument(arg: any) {
        if (typeof arg === 'object' && arg.col) {
            return this.sequelize.col(arg.col);
        } else if (typeof arg === 'object' && arg.fn) {
            // Handle nested function calls
            const nestedArgs = Array.isArray(arg.args)
                ? arg.args.map((nestedArg) => this.processArgument(nestedArg))
                : [this.processArgument(arg.col)];
            return this.sequelize.fn(arg.fn, ...nestedArgs);
        } else if (
            typeof arg === 'string' &&
            arg.startsWith('$') &&
            arg.endsWith('$')
        ) {
            // Handle special string literals (e.g., '$CURRENT_TIMESTAMP$')
            return this.sequelize.literal(arg.slice(1, -1));
        } else {
            // For other string literals or types
            return arg;
        }
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
                    const sequelizeModel = this.sequelize.model(inc.model);
                    if (inc.scope === false) {
                        inc.model = sequelizeModel.unscoped();
                    } else if (inc.scope) {
                        const sanitizedScope = this.sanitizeScope(inc.scope);
                        inc.model = sequelizeModel.scope(sanitizedScope);
                    } else {
                        inc.model = sequelizeModel;
                    }
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
                            ? [
                                  ...sanitizedCondition[Op.and],
                                  ...fullTextConditions,
                              ]
                            : fullTextConditions;
                    }
                }

                // Recursively apply to nested objects/operators
                for (const [key, value] of Object.entries(condition)) {
                    if (key in sequelizeOperators) {
                        sanitizedCondition[sequelizeOperators[key]] =
                            sanitizeCondition(value, sequelize);
                    } else if (value === '$null$') {
                        sanitizedCondition[key] = { [Op.is]: null };
                    } else if (value === '$notNull$') {
                        sanitizedCondition[key] = { [Op.not]: null };
                    } else {
                        sanitizedCondition[key] = sanitizeCondition(
                            value,
                            sequelize,
                        );
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
        const model = this.sequelize.model(baseModel);
        if (sanitizedOptions.scope === false) {
            return model.unscoped().findAll(sanitizedOptions);
        } else if (sanitizedOptions.scope) {
            return model
                .scope(sanitizedOptions.scope)
                .findAll(sanitizedOptions);
        } else {
            return model.findAll(sanitizedOptions);
        }
    }

    async findAndCountAll(baseModel: string, options?: any) {
        const sanitizedOptions = this.sanitizeOptions(options);
        const model = this.sequelize.model(baseModel);
        if (sanitizedOptions.scope === false) {
            return model.unscoped().findAndCountAll({
                ...sanitizedOptions,
                distinct: true,
            });
        } else if (sanitizedOptions.scope) {
            return model.scope(sanitizedOptions.scope).findAndCountAll({
                ...sanitizedOptions,
                distinct: true,
            });
        } else {
            return model.findAndCountAll({
                ...sanitizedOptions,
                distinct: true,
            });
        }
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
            let loadBy;
            if (typeof action.loadBy === 'string') {
                loadBy = {
                    paramField: action.loadBy,
                    tableField: action.loadBy,
                };
            } else {
                loadBy = action.loadBy;
            }
            where[loadBy.tableField] = data[loadBy.paramField];
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
            let loadBy = { paramField: '', tableField: '' };
            if (typeof action.loadBy === 'string') {
                loadBy.paramField = action.loadBy;
                loadBy.tableField = action.loadBy;
            }
            where[loadBy.tableField] = data_user.data.records.map(
                (record) => record[loadBy.paramField],
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

    async findOneByPk(
        baseModel: string,
        primaryKey: string | number,
        primaryField: string,
        transaction: Transaction,
    ) {
        return await this.sequelize.model(baseModel).findOne({
            where: {
                [primaryField]: primaryKey,
            },
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
                individualHooks: true,
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
