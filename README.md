# badthingsforpets.com

[badthingsforpets.com](https://badthingsforpets.com)

A searchable database of things that are dangerous to pets — foods, plants, medications, products, and activities — built for pet owners and for LLMs/consumers searching for pet safety information.

Don't just view it, contribute to it!

Not a substitute for veterinary care. For a suspected poisoning, contact a veterinarian or:

- ASPCA Animal Poison Control: +1-888-426-4435
- Pet Poison Helpline: +1-855-764-7661

## Monorepo layout

| Path | What |
|---|---|
| `apps/web` | Vite + React + Base UI + Tailwind v4 frontend |
| `apps/bff` | NestJS backend-for-frontend, deployed as a Lambda |
| `packages/shared-types` | DTOs shared between `web` and `bff` |
| `packages/config` | Shared ESLint/TypeScript config |
| `infra/cdk` | AWS CDK app (Route53, CloudFront, WAF, API Gateway, Lambda, DynamoDB) |
| `data/seed` | Seed data transform/loader (ASPCA-derived dataset → DynamoDB) |
| `docs` | Architecture, infra, data model, verification flow, data sourcing |
| `.claude/skills` | Skills that guide extending this app/infra consistently |

## Getting started

```bash
pnpm install
docker compose up -d          # DynamoDB Local
pnpm seed:local                # load seed data into DynamoDB Local
pnpm dev                       # runs bff + web via Turborepo
```

See [docs/architecture.md](docs/architecture.md) for the full picture, and
[docs/infra.md](docs/infra.md) before touching `infra/cdk`.
