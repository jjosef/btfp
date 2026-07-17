import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '@btfp/shared-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const API_ORIGIN = process.env.PRERENDER_API_ORIGIN ?? 'https://badthingsforpets.com';
const CONCURRENCY = 5;

// Crawls the already-built dist/ (served locally via `vite preview`, with
// /api/* proxied to a real API — see vite.config.ts's `preview.proxy`) and
// saves each route's fully-rendered HTML as a real file at that route's
// path, so CloudFront's SPA-fallback function (which appends /index.html to
// any extensionless request — see web-stack.ts) serves real content instead
// of the generic empty shell.
//
// Every route App.tsx actually defines gets prerendered, not just the
// "content" ones — a route with no prerendered file 403s on direct
// navigation (bookmark, hard refresh, shared link), not just for crawlers,
// since the CloudFront function now looks for a specific per-path file
// instead of always falling back to the generic shell. /moderation renders
// its logged-out "please sign in" state here (same as an anonymous visitor
// would see), which is still more correct than a 403.
//
// Known limitation: a thing added after this last ran has no prerendered
// file until the next run/deploy — see docs/seo.md for why that's an
// accepted tradeoff rather than solved with runtime infra.

async function fetchRoutes() {
  const res = await fetch(`${API_ORIGIN}/api/things`);
  if (!res.ok) throw new Error(`Failed to fetch things list: HTTP ${res.status}`);
  const things = await res.json();
  return [
    { path: '/', waitFor: 'networkidle' },
    { path: '/submit', waitFor: 'networkidle' },
    { path: '/moderation', waitFor: 'networkidle' },
    { path: '/llm-info', waitFor: 'networkidle' },
    ...things.map((t) => ({
      path: `/things/${t.id}/${slugify(t.name)}`,
      // The bare id (no slug) is still a valid URL — see ThingDetailPage's
      // optional :slug? param — so it gets a copy of the same rendered
      // HTML rather than falling through to a 403.
      extraPaths: [`/things/${t.id}`],
      waitFor: 'title',
    })),
  ];
}

async function writeHtml(routePath, html) {
  const outDir = path.join(DIST_DIR, routePath);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html, 'utf-8');
}

async function renderRoute(browser, baseUrl, route) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    if (route.waitFor === 'title') {
      await page.waitForFunction(() => document.title !== 'badthingsforpets.com', {
        timeout: 10_000,
      });
    }
    const html = await page.content();
    await writeHtml(route.path, html);
    for (const extraPath of route.extraPaths ?? []) {
      await writeHtml(extraPath, html);
    }
    console.log(`  ${route.path}`);
  } catch (err) {
    console.warn(`  SKIPPED ${route.path}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await page.close();
  }
}

async function renderInBatches(browser, baseUrl, routes) {
  for (let i = 0; i < routes.length; i += CONCURRENCY) {
    const batch = routes.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((route) => renderRoute(browser, baseUrl, route)));
  }
}

async function main() {
  console.log(`Fetching route list from ${API_ORIGIN}...`);
  const routes = await fetchRoutes();
  console.log(`Prerendering ${routes.length} routes...`);

  const server = await preview({ preview: { port: 4321, strictPort: false } });
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch();

  try {
    await renderInBatches(browser, baseUrl, routes);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
