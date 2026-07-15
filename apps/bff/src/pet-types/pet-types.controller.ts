import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PetTypesService } from './pet-types.service.js';

@Controller('pet-types')
export class PetTypesController {
  constructor(private readonly petTypes: PetTypesService) {}

  @Get()
  async list() {
    return this.petTypes.list();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const petType = await this.petTypes.getById(id);
    if (!petType) throw new NotFoundException(`No pet type with id ${id}`);
    return petType;
  }
}
