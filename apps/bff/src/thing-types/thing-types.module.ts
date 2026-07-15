import { Module } from '@nestjs/common';
import { ThingTypesController } from './thing-types.controller.js';
import { ThingTypesService } from './thing-types.service.js';

@Module({
  controllers: [ThingTypesController],
  providers: [ThingTypesService],
  exports: [ThingTypesService],
})
export class ThingTypesModule {}
