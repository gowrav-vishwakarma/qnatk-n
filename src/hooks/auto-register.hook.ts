import 'reflect-metadata'; // Ensure reflect-metadata is imported for metadata reflection
import * as fs from 'fs';
import * as path from 'path';
import { Type } from '@nestjs/common';
import { HookSymbol } from './hook.decorator';
import { HooksService } from './hooks.service';
import { HookInterface } from './hook.interface';
import { ModuleRef } from '@nestjs/core';

function extractEventPattern(filePath) {
    const parts = filePath.split(path.sep);
    let stage = null;
    let eventName = null;
    let baseModel = null;

    // Check both the immediate parent folder and the file name for stage keywords
    const immediateParentFolder = parts[parts.length - 2];
    const fileName = parts[parts.length - 1];
    const possibleStages = ['before', 'execute', 'after'];

    let fileNameContainsStageKeyword = false;

    for (const stageKeyword of possibleStages) {
        if (fileName.includes(stageKeyword)) {
            stage = stageKeyword;
            fileNameContainsStageKeyword = true;
            break;
        }
    }

    if (!stage) {
        // If stage is not in file name, check immediate parent folder
        for (const stageKeyword of possibleStages) {
            if (immediateParentFolder.includes(stageKeyword)) {
                stage = stageKeyword;
                break;
            }
        }
    }

    // Determine eventName and baseModel based on where stage was found
    if (stage) {
        if (fileNameContainsStageKeyword) {
            // If stage keyword is in file name, use immediate parent as eventName
            eventName = immediateParentFolder;
            if (parts.length >= 3) {
                baseModel = parts[parts.length - 3]; // BaseModel is one level up
            }
        } else {
            // If stage keyword is in immediate parent, use usual structure
            if (parts.length >= 4) {
                eventName = parts[parts.length - 3];
                baseModel = parts[parts.length - 4];
            }
        }
    }

    if (!stage || !eventName || !baseModel) {
        return null;
    }

    return `${stage}:${eventName}:${baseModel}`; // Customize this format as needed
}

export async function AutoRegisterHooks(
    moduleRef,
    hooksService,
    directoryPath,
) {
    const hookFilePattern = /\.service\.hook\.(ts|js)$/;

    function findHookFiles(directory) {
        let hookFiles = [];

        const filesAndDirs = fs.readdirSync(directory, { withFileTypes: true });

        for (const entry of filesAndDirs) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                hookFiles = hookFiles.concat(findHookFiles(fullPath));
            } else if (hookFilePattern.test(entry.name)) {
                hookFiles.push(fullPath);
            }
        }

        return hookFiles;
    }

    const allHookFiles = findHookFiles(directoryPath);

    for (const hookFilePath of allHookFiles) {
        const hookModule = await import(hookFilePath);

        for (const exported of Object.values(hookModule)) {
            if (typeof exported === 'function' && exported.prototype) {
                let eventPattern = null;

                eventPattern = Reflect.getMetadata(HookSymbol, exported);

                if (!eventPattern) {
                    eventPattern = extractEventPattern(hookFilePath);
                }

                if (!eventPattern) {
                    throw new Error(
                        `Event pattern not found for hook file: ${hookFilePath}`,
                    );
                }

                const instance = await moduleRef.create(exported);
                hooksService.registerHook(eventPattern, instance);
            }
        }
    }

    // console.log('AutoRegisterHooks', hooksService.getHooksList());
}
