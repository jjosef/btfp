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
pnpm turbo run lint typecheck build
```

## Conventions

- TypeScript everywhere, `workspace:*` for internal package references.
- Shared types (`Thing`, `PetType`, etc.) live in `packages/shared-types` — add there first
  if a change touches both `apps/bff` and `apps/web`.
- No inline comments beyond a line or two, and only where the *why* isn't obvious from the
  code. See `.claude/skills/` for guided patterns when adding a new thing type, API
  endpoint, or infra resource.
