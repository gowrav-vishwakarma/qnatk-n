import { DynamicModule, Module, Global, Inject } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ModuleRef } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { QnatkModuleOptions } from './hooks/qnatk-module.options';
import { HooksService } from './hooks/hooks.service';
import { AutoRegisterHooks } from './hooks/auto-register.hook';
import { QnatkService } from './qnatk.service';
import { QnatkControllerService } from './qnatk-controller.service';
import { ActionListDTO } from './dto/ActionListDTO';

@Global()
@Module({
    imports: [],
    providers: [],
    exports: [],
})
export class QnatkModule {
    static forRoot(
        options: QnatkModuleOptions,
        additionalImports: any[] = [],
        additionalProviders: any[] = [],
        additionalExports: any[] = [],
    ): DynamicModule {
        return {
            module: QnatkModule,
            imports: [EventEmitterModule.forRoot(), ...additionalImports],
            providers: [
                {
                    provide: 'HOOKS_OPTIONS',
                    useValue: options,
                },

                HooksService,
                ...additionalProviders,
            ],
            exports: [HooksService, EventEmitterModule, ...additionalExports],
        };
    }

    constructor(
        private moduleRef: ModuleRef,
        private hooksService: HooksService,
        @Inject('HOOKS_OPTIONS') private options: QnatkModuleOptions,
    ) {}

    async onModuleInit() {
        await AutoRegisterHooks(
            this.moduleRef,
            this.hooksService,
            this.options.hooksDirectory,
        );
    }
}
