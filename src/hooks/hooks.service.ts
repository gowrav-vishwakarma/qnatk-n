import { Inject, Injectable } from '@nestjs/common';
import { HookInterface } from './hook.interface';
import { QnatkModuleOptions } from './qnatk-module.options';
import { Transaction } from 'sequelize';
import { ValidationException } from '../Exceptions/ValidationException';

@Injectable()
export class HooksService {
    private hooks: Record<string, HookInterface[]> = {};
    private hookNameConstants: Set<string>;

    constructor(@Inject('HOOKS_OPTIONS') private options: QnatkModuleOptions) {
        this.hookNameConstants = new Set(options.hookNameConstants || []);
    }

    registerHook(events: string | string[], hook: HookInterface) {
        const eventsArray = Array.isArray(events) ? events : [events];
        for (const event of eventsArray) {
            if (!this.hooks[event]) {
                this.hooks[event] = [];
            }
            this.hooks[event].push(hook);
            if (this.options.followPriorityOrder)
                this.hooks[event].sort((a, b) => a.priority - b.priority);
        }
    }

    validateHookName(hookName: string): boolean {
        if (!this.hookNameConstants.has(hookName)) {
            return false;
        }
        return true;
    }

    hasHook(hookName: string): boolean {
        this.validateHookName(hookName);
        return this.hooks[hookName] && this.hooks[hookName].length > 0;
    }

    async triggerHooks<T = any>(
        events: string | string[],
        originalHookContext: any,
        transaction: Transaction,
        extraData?: any,
        uiPassedExtraData?: Record<string, any>,
        mustRun?: boolean,
    ): Promise<T> {
        const eventsArray = Array.isArray(events) ? events : [events];
        let hookContext = originalHookContext;
        for (const event of eventsArray) {
            if (this.hooks[event]) {
                this.validateHookName(event);
                for (const hook of this.hooks[event]) {
                    hookContext = await hook.execute(
                        hookContext, // This is the result of the previous hook or the original data for the first hook
                        transaction, // This is the transaction object
                        originalHookContext, // This is always the original data
                        extraData, // This is any extra info passed when the hooks were triggered
                        uiPassedExtraData, // This is UI passed extra data
                    );
                }
            } else {
                if (mustRun) {
                    throw new ValidationException({
                        [event]: [
                            `No hook found at place: ${
                                event.split(':').reverse().join('/') +
                                '-file.service.hook.ts'
                            }`,
                        ],
                    });
                }
            }
        }
        return hookContext; // Return the last hook's result
    }

    getHooksList() {
        return this.hooks;
    }

    async executeChangeEvents<T = any>(
        baseElement: string,
        newData: any,
        oldData: any,
        transaction: Transaction,
        uiPassedExtraData?: Record<string, any>,
    ): Promise<T> {
        const differences = this.objectDifferences(oldData, newData);
        if (!differences) return newData;

        const kindMapping = {
            N: 'new',
            D: 'deleted',
            E: 'edited',
            A: 'arrayChange',
        };

        for (const difference of differences) {
            // Filter out numeric values from the path
            const filteredPath = difference.path.filter((pathSegment: any) =>
                isNaN(pathSegment),
            );

            // Add the kind of change to the event key
            const eventKey = `ON_${baseElement}_${filteredPath.join('_')}_${
                kindMapping[difference.kind]
            }`.toUpperCase();

            console.log('eventKey', eventKey, 'difference', difference);

            let hookResult = difference.new;

            hookResult = await this.triggerHooks(
                eventKey,
                hookResult,
                transaction,
                {
                    rootObject: newData,
                    difference,
                },
                uiPassedExtraData,
            );
        }
    }

    // isObjectId(value: any): value is ObjectId {
    //   return Types.ObjectId.isValid(value);
    // }

    objectDifferences(oldObj, newObj, path = []) {
        const result = [];

        // if (oldObj instanceof mongoose.Model) oldObj = oldObj.toObject();
        // if (newObj instanceof mongoose.Model) newObj = newObj.toObject();
        //
        // // If the objects are ObjectIds, convert them to strings for comparison
        // if (this.isObjectId(oldObj)) oldObj = oldObj.toString();
        // if (this.isObjectId(newObj)) newObj = newObj.toString();

        if (Array.isArray(oldObj) && Array.isArray(newObj)) {
            if (JSON.stringify(oldObj) === JSON.stringify(newObj))
                return result;
            const maxLen = Math.max(oldObj.length, newObj.length);
            for (let i = 0; i < maxLen; i++) {
                if (!oldObj.hasOwnProperty(i) || oldObj[i] !== newObj[i]) {
                    result.push(
                        ...this.objectDifferences(
                            oldObj[i],
                            newObj[i],
                            path.concat(i),
                        ),
                    );
                }
            }
        } else if (
            typeof oldObj === 'object' &&
            oldObj !== null &&
            typeof newObj === 'object' &&
            newObj !== null
        ) {
            const oldKeys = new Set(Object.keys(oldObj));
            const newKeys = new Set(Object.keys(newObj));
            let isObjectChanged = false;

            for (const key of oldKeys) {
                const newPath = path.concat(key);

                if (newKeys.has(key)) {
                    if (
                        typeof newObj[key] === 'object' &&
                        newObj[key] !== null
                    ) {
                        const subDiffs = this.objectDifferences(
                            oldObj[key],
                            newObj[key],
                            newPath,
                        );
                        result.push(...subDiffs);
                        isObjectChanged =
                            isObjectChanged || subDiffs.length > 0;
                    } else if (oldObj[key] !== newObj[key]) {
                        result.push({
                            kind: 'E',
                            path: newPath,
                            old: oldObj[key],
                            new: newObj[key],
                        });
                        isObjectChanged = true;
                    }
                } else {
                    result.push({
                        kind: 'D',
                        path: newPath,
                        old: oldObj[key],
                        new: undefined,
                    });
                    isObjectChanged = true;
                }
            }

            for (const key of newKeys) {
                if (!oldKeys.has(key)) {
                    result.push({
                        kind: 'N',
                        path: path.concat(key),
                        old: undefined,
                        new: newObj[key],
                    });
                    isObjectChanged = true;
                }
            }

            // If the object has changed, add it to the result
            if (isObjectChanged) {
                result.unshift({
                    kind: 'E',
                    path: path,
                    old: oldObj,
                    new: newObj,
                });
            }
        } else if (oldObj !== newObj) {
            result.push({
                kind: 'E',
                path: path,
                old: oldObj,
                new: newObj,
            });
        }

        return result;
    }
}
