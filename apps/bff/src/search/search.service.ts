import { Inject, Injectable } from '@nestjs/common';
import { ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Fuse from 'fuse.js';
import type { Thing } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';

const CACHE_TTL_MS = 60_000;

/**
 * Loads all Things into memory and searches/filters there instead of paying
 * for a managed search service. Fine at the current ~1000-row scale; see
 * docs/data-model.md for the upgrade path if this stops being true.
 */
@Injectable()
export class SearchService {
  private cache: { things: Thing[]; loadedAt: number } | null = null;

  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  async all(): Promise<Thing[]> {
    return this.loadThings();
  }

  async filterByPetType(petTypeId: string): Promise<Thing[]> {
    const things = await this.loadThings();
    return things.filter((t) => t.petTypes.some((p) => p.petTypeId === petTypeId));
  }

  async search(
    query: string,
    filters: { petType?: string; thingType?: string } = {},
  ): Promise<Thing[]> {
    let things = await this.loadThings();
    if (filters.petType) {
      things = things.filter((t) => t.petTypes.some((p) => p.petTypeId === filters.petType));
    }
    if (filters.thingType) {
      things = things.filter((t) => t.thingTypeId === filters.thingType);
    }

    const fuse = new Fuse(things, {
      keys: ['name', 'otherNames', 'details.scientificName', 'details.toxicPrinciples'],
      threshold: 0.35,
    });
    return fuse.search(query).map((r) => r.item);
  }

  invalidate(): void {
    this.cache = null;
  }

  private async loadThings(): Promise<Thing[]> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.things;
    }

    const items: Thing[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await this.db.send(
        new ScanCommand({
          TableName: CONTENT_TABLE_NAME,
          FilterExpression: 'SK = :meta AND begins_with(PK, :thingPrefix)',
          ExpressionAttributeValues: { ':meta': 'META', ':thingPrefix': 'THING#' },
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as Thing[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    this.cache = { things: items, loadedAt: Date.now() };
    return items;
  }
}
