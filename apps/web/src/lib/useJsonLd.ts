import { useEffect } from 'react';

/**
 * Injects a <script type="application/ld+json"> tag, keyed by `id` so
 * multiple call sites (e.g. a site-wide WebSite schema plus a per-page
 * Article schema) can coexist without clobbering each other, and so
 * navigating away removes that page's schema rather than leaving stale
 * JSON-LD behind. Same "runs identically live and during the prerender
 * crawl" reasoning as useDocumentMeta.
 */
export function useJsonLd(id: string, schema: Record<string, unknown> | null): void {
  useEffect(() => {
    if (!schema) return;

    let script = document.querySelector<HTMLScriptElement>(`script[data-jsonld-id="${id}"]`);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.jsonldId = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    return () => {
      script?.remove();
    };
  }, [id, schema]);
}
