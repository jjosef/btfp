import { useEffect } from 'react';

/**
 * Sets the page title and meta description imperatively — no react-helmet
 * dependency needed for a handful of pages. Runs client-side, but also runs
 * during prerendering (scripts/prerender.mjs), which is the whole point:
 * that's what makes each crawled page's saved HTML have real per-page
 * title/description instead of the generic static shell's.
 */
export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}
