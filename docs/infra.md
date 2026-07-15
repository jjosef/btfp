# Infra

AWS CDK (TypeScript), everything in `us-east-1` (required for CloudFront's ACM cert and its
CLOUDFRONT-scope WAF WebACL; also simplest for a single-region MVP). No VPC, no NAT gateway
— Lambda talks to DynamoDB directly over the AWS SDK, which is both cheaper and simpler.

## Stacks

- **`BtfpDns`** — one Route53 public hosted zone for `badthingsforpets.com`. Deployed once,
  standalone, before anything else.
- **`BtfpDev`** / **`BtfpProd`** — CDK Stages, each composing:
  - **Data** — DynamoDB `Content` + `Users` tables, on-demand billing.
  - **Api** — one Lambda running the NestJS BFF, behind an API Gateway HTTP API.
  - **Web** — S3 (private, OAC) + CloudFront + WAFv2 + ACM cert + Route53 alias record(s).

`BtfpDev` serves `dev.badthingsforpets.com`; `BtfpProd` serves `badthingsforpets.com` and
`www.badthingsforpets.com`.

## Budget (rough, at low/unknown traffic)

| Item | Cost |
|---|---|
| Route53 hosted zone | ~$0.50/mo |
| ACM certificate | free |
| Lambda + API Gateway | ~free under ~1M requests/mo |
| DynamoDB (on-demand) | pennies at this scale |
| CloudFront | pennies at this scale |
| WAF (2 rule groups) | ~$6-8/mo |

Dev + prod together should land well under $50/mo unless traffic spikes hard. The two
biggest levers if it doesn't: drop WAF's rate-limit rule, or merge dev+prod's WAF into a
single shared WebACL.

## Deploy order (not yet done — needs AWS credentials + your go-ahead)

1. `aws sso login --profile <your-profile>`
2. `pnpm --filter @btfp/infra cdk bootstrap` (once per account/region)
3. `pnpm --filter @btfp/infra cdk deploy BtfpDns` — copy the `HostedZoneId` output
4. Set `BTFP_HOSTED_ZONE_ID` (env var, see `infra/cdk/lib/config.ts`) to that value
5. Set the NS records from `BtfpDns`'s `NameServers` output at your domain registrar
6. `pnpm --filter @btfp/bff build` — the Api stack deploys the Lambda from
   `apps/bff/dist`, so it must exist first
7. `pnpm --filter @btfp/web build` — the Web stack's `BucketDeployment` uploads
   `apps/web/dist` to S3 and invalidates CloudFront as part of `cdk deploy`, so this must
   exist first too
8. `pnpm --filter @btfp/infra cdk deploy BtfpDev/* BtfpProd/*`
