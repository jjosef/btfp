/**
 * Used to build the cosmetic slug in /things/:id/:slug URLs — the id stays
 * authoritative for lookup (see ThingDetailPage.tsx and sitemap.controller.ts),
 * so this only needs to be deterministic, not reversible or unique.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
