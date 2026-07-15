import { Module } from '@nestjs/common';
import { PetTypesController } from './pet-types.controller.js';
import { PetTypesService } from './pet-types.service.js';

@Module({
  controllers: [PetTypesController],
  providers: [PetTypesService],
  exports: [PetTypesService],
})
export class PetTypesModule {}
