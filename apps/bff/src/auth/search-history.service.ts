import { Injectable, Logger } from '@nestjs/common';

const SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const RESULT_COUNT = 5;
const FETCH_TIMEOUT_MS = 5000;

export interface SearchResultSummary {
  title: string;
  snippet: string;
  link: string;
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{ title?: string; description?: string; url?: string }>;
  };
}

/**
 * Independent evidence that a domain has some history — a business
 * directory listing, news mention, review site, etc. — via the Brave
 * Search API, not by scraping search results pages (a ToS violation for
 * Google/Bing and something their bot defenses actively block anyway).
 * A signal for the human reviewer, same as Bedrock's classification: no
 * results doesn't block verification, it just means this signal is absent.
 *
 * Started as Google Custom Search JSON API, but Google closed that API to
 * new customers (deprecated for anyone without prior access, migration
 * deadline 2027-01-01) — every config was verified correct (project match,
 * API enabled, billing linked, unrestricted fresh key) and it still 403'd,
 * confirmed via Google's own support forum as a known new-customer block,
 * not a setup mistake. Brave needs no GCP project/billing at all.
 */
@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);
  private readonly apiKey = process.env.BRAVE_SEARCH_API_KEY;

  async searchDomain(domain: string): Promise<SearchResultSummary[] | null> {
    if (!this.apiKey) return null;

    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set('q', domain);
    url.searchParams.set('count', String(RESULT_COUNT));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`search API returned ${res.status}`);
      const body = (await res.json()) as BraveSearchResponse;
      return (body.web?.results ?? [])
        .filter((item): item is { title: string; description?: string; url: string } => Boolean(item.title && item.url))
        .map((item) => ({ title: item.title, snippet: item.description ?? '', link: item.url }));
    } catch (err) {
      this.logger.warn(
        `Search history lookup failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
