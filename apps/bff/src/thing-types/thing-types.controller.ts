import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ThingTypesService } from './thing-types.service.js';

@Controller('thing-types')
export class ThingTypesController {
  constructor(private readonly thingTypes: ThingTypesService) {}

  @Get()
  async list() {
    return this.thingTypes.list();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const thingType = await this.thingTypes.getById(id);
    if (!thingType) throw new NotFoundException(`No thing type with id ${id}`);
    return thingType;
  }
}
