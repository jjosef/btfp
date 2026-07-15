import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ThingsService } from './things.service.js';
import { SearchService } from '../search/search.service.js';

@Controller('things')
export class ThingsController {
  constructor(
    private readonly things: ThingsService,
    private readonly search: SearchService,
  ) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('petType') petType?: string,
    @Query('thingType') thingType?: string,
  ) {
    if (q) return this.search.search(q, { petType, thingType });
    if (thingType) return this.things.listByThingType(thingType);
    if (petType) return this.search.filterByPetType(petType);
    return this.search.all();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const thing = await this.things.getById(id);
    if (!thing) throw new NotFoundException(`No thing with id ${id}`);
    return thing;
  }
}
