// Hardcoded rather than derived from window.location.origin: the prerender
// crawl (apps/web/scripts/prerender.mjs) renders pages against a local
// `vite preview` server, so window.location.origin would bake
// "http://localhost:4321" into the real prerendered HTML shipped to prod.
// Dev serves under a different origin too, but dev is intentionally not a
// crawlable/indexed surface (see docs/infra.md "Dev is not public"), so a
// prod-only canonical origin here is harmless there.
export const SITE_ORIGIN = 'https://badthingsforpets.com';

export const SITE_NAME = 'badthingsforpets.com';

export const SITE_DESCRIPTION =
  'A community-curated database of foods, plants, medications, products, and activities ' +
  'that are dangerous to pets (dogs, cats, horses).';
