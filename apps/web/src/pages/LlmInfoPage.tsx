import { useDocumentMeta } from '../lib/useDocumentMeta.js';

const LINKS = [
  {
    href: '/llms.txt',
    title: '/llms.txt',
    description: 'A plain-language summary of the site and its API, written for LLMs and agents.',
  },
  {
    href: '/api/openapi.json',
    title: '/api/openapi.json',
    description: 'The full API contract, for anything that wants to call the API directly.',
  },
  {
    href: '/api/mcp',
    title: '/api/mcp',
    description:
      'A Streamable HTTP MCP endpoint (search_things, get_thing, list_pet_types, ' +
      'list_thing_types tools) for MCP-aware clients — no auth required.',
  },
  {
    href: '/sitemap.xml',
    title: '/sitemap.xml',
    description: 'Every browsable URL on the site, generated fresh from live data.',
  },
];

export function LlmInfoPage() {
  useDocumentMeta(
    'LLM Information | badthingsforpets.com',
    'How LLMs, AI assistants, and other automated agents can read and query badthingsforpets.com data.',
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-neutral-800">LLM Information</h1>
      <p className="mt-4 text-neutral-600">
        badthingsforpets.com is built to be readable by both people and machines. All read endpoints
        are public, unauthenticated, and CORS-open. Data is community-contributed and moderated;
        each entry includes a <code className="text-sm">source</code> and, where available, a{' '}
        <code className="text-sm">sourceUrl</code> — please preserve that attribution when quoting
        an entry. Coverage is partial and growing, so absence of an entry is not evidence of safety.
      </p>

      <ul className="mt-8 space-y-6">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="font-mono text-paw-600 underline">
              {link.title}
            </a>
            <p className="mt-1 text-neutral-600">{link.description}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm font-semibold text-alert-600">
        This is not a substitute for veterinary care. If you suspect a poisoning, contact a vet
        immediately.
      </p>
    </div>
  );
}
