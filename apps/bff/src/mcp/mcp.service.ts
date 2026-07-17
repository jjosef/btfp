import { Injectable } from '@nestjs/common';
import { SearchService } from '../search/search.service.js';
import { ThingsService } from '../things/things.service.js';
import { PetTypesService } from '../pet-types/pet-types.service.js';
import { ThingTypesService } from '../thing-types/thing-types.service.js';
import type { ToolDefinition } from './mcp.types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const TOOLS: ToolDefinition[] = [
  {
    name: 'search_things',
    description:
      'Search or browse badthingsforpets.com — things dangerous to pets (plants, foods, medications, ' +
      'products, activities). Combine filters freely; omit all to browse everything (capped at `limit`).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text fuzzy search, e.g. "chocolate" or "aloe"',
        },
        petType: { type: 'string', description: 'e.g. dog, cat, horse' },
        thingType: {
          type: 'string',
          description: 'e.g. plant, food, medication, product, activity',
        },
        limit: {
          type: 'number',
          description: `Max results, default ${DEFAULT_LIMIT}, capped at ${MAX_LIMIT}`,
        },
      },
    },
  },
  {
    name: 'get_thing',
    description: 'Get full details for one thing by id, including its source citation.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'list_pet_types',
    description: 'List all pet types the database covers (e.g. dog, cat, horse).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_thing_types',
    description:
      'List all thing-type categories (e.g. plant, food, medication, product, activity).',
    inputSchema: { type: 'object', properties: {} },
  },
];

@Injectable()
export class McpService {
  constructor(
    private readonly search: SearchService,
    private readonly things: ThingsService,
    private readonly petTypes: PetTypesService,
    private readonly thingTypes: ThingTypesService,
  ) {}

  listTools(): ToolDefinition[] {
    return TOOLS;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'search_things':
        return this.searchThings(args);
      case 'get_thing':
        return this.getThing(args);
      case 'list_pet_types':
        return this.petTypes.list();
      case 'list_thing_types':
        return this.thingTypes.list();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async searchThings(args: Record<string, unknown>) {
    const query = typeof args.query === 'string' ? args.query : undefined;
    const petType = typeof args.petType === 'string' ? args.petType : undefined;
    const thingType = typeof args.thingType === 'string' ? args.thingType : undefined;
    const limit = Math.min(typeof args.limit === 'number' ? args.limit : DEFAULT_LIMIT, MAX_LIMIT);

    const results = query
      ? await this.search.search(query, { petType, thingType })
      : thingType
        ? await this.things.listByThingType(thingType)
        : petType
          ? await this.search.filterByPetType(petType)
          : await this.search.all();

    return results.slice(0, limit);
  }

  private async getThing(args: Record<string, unknown>) {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const thing = await this.things.getById(id);
    if (!thing) throw new Error(`No thing with id ${id}`);
    return thing;
  }
}
