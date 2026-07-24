# Contributing (code)

```bash
git clone --recurse-submodules git@github.com:GenomeInc/btfp.git
# already cloned without it? `git submodule update --init`
pnpm install
docker compose up -d          # DynamoDB Local
pnpm seed:local                 # load seed data
pnpm dev                        # bff on :3001, web on :5173 (proxies /api to bff)
```

`vendor/mycota` is a git submodule — the reusable auth/dynamo core, pulled from its own
repo ([GenomeInc/mycota](https://github.com/GenomeInc/mycota)) rather than living directly in
this one. It's a monorepo itself (`@mycota/dynamo`, `@mycota/auth`,
`@mycota/professional-verification` — this repo's `pnpm-workspace.yaml` reaches into
`vendor/mycota/packages/*` to link them). If you change something in there, commit and push
from inside `vendor/mycota` itself, then commit the resulting pointer-commit bump here — the
two are separate repos with separate histories.

Copy `apps/bff/.env.example` to `apps/bff/.env` for OAuth/JWT config; the app boots fine
without it, but sign-in won't work until GitHub OAuth credentials are set (see
[verification-flow.md](verification-flow.md)). If you have AWS access, `pnpm secrets:sync dev`
fills in the real `JWT_SECRET`/`GITHUB_CLIENT_SECRET` values instead of leaving placeholders
(see [Secrets](./infra.md#secrets)).

Recommended: install [direnv](https://direnv.net) (`brew install direnv`, then add
`eval "$(direnv hook zsh)"` — or the equivalent for your shell — to your shell rc file) and run
`direnv allow` once in `apps/bff` and `infra/cdk`. Both already have an `.envrc` checked in, so
`cd`-ing into either then just loads its `.env`/`.env.deploy.local` automatically — no more
remembering to `source` anything by hand.

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
