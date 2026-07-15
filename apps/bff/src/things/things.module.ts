import { Module } from '@nestjs/common';
import { ThingsController } from './things.controller.js';
import { ThingsService } from './things.service.js';

@Module({
  controllers: [ThingsController],
  providers: [ThingsService],
  exports: [ThingsService],
})
export class ThingsModule {}
