# Contributing (code)

```bash
pnpm install
docker compose up -d          # DynamoDB Local
pnpm seed:local                 # load seed data
pnpm dev                        # bff on :3001, web on :5173 (proxies /api to bff)
```

Copy `apps/bff/.env.example` to `apps/bff/.env` for OAuth/JWT config; the app boots fine
without it, but sign-in won't work until GitHub OAuth credentials are set (see
[verification-flow.md](verification-flow.md)).

## Before opening a PR

```bash
pnpm format          # oxfmt, writes in place
pnpm turbo run lint typecheck build   # oxlint + tsc + build
```

Linting is [oxlint](https://oxc.rs), formatting is [oxfmt](https://oxc.rs) — both Rust-based
replacements for ESLint/Prettier, configured at `.oxlintrc.json`/`.oxfmtrc.json` in the repo
root. `oxfmt` is still alpha software; if it ever produces something clearly wrong, that's
worth a GitHub issue upstream rather than working around it silently here.

For end-to-end coverage of a real user flow, see [e2e-testing.md](e2e-testing.md) — generate
a Playwright test from a plain-English description rather than writing one by hand.

## Conventions

- TypeScript everywhere, `workspace:*` for internal package references.
- Shared types (`Thing`, `PetType`, etc.) live in `packages/shared-types` — add there first
  if a change touches both `apps/bff` and `apps/web`.
- No inline comments beyond a line or two, and only where the *why* isn't obvious from the
  code. See `.claude/skills/` for guided patterns when adding a new thing type, API
  endpoint, or infra resource.
