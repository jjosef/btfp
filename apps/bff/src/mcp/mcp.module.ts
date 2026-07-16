import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';
import { SearchModule } from '../search/search.module.js';
import { ThingsModule } from '../things/things.module.js';
import { PetTypesModule } from '../pet-types/pet-types.module.js';
import { ThingTypesModule } from '../thing-types/thing-types.module.js';

@Module({
  imports: [SearchModule, ThingsModule, PetTypesModule, ThingTypesModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
