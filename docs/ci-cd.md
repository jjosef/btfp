# CI/CD

GitHub Actions builds once, deploys to dev, runs e2e against the live dev deployment, then —
only after a human approves — promotes the exact same build to prod. No more manual
`cdk deploy` for routine changes (that path still works, see [docs/infra.md](./infra.md), and
is the fallback for hotfixes or debugging a broken pipeline).

## The path a change takes

1. **Branch, PR into `main`.** `.github/workflows/ci.yml` runs typecheck/lint/build/format-check
   on the PR. No AWS credentials exist anywhere in this workflow — PRs can't deploy anything,
   by construction (see [OIDC setup](#github-oidc-setup-for-aws) below).
2. **Merge.** `main` requires the `CI / check` status to pass first (branch protection, set up
   once — see [Manual one-time setup](#manual-one-time-setup)). Merging triggers
   `.github/workflows/deploy.yml`.
3. **`build`** — installs, builds every package (`turbo run typecheck lint build`), uploads
   `apps/bff/dist` and `apps/web/dist` as GitHub Actions artifacts. Every later job downloads
   these instead of rebuilding — this is what makes "the same thing promoted to prod" literally
   true, not just "the same source re-built twice."
4. **`deploy-dev`** — assumes the deploy role via OIDC, runs `cdk deploy BtfpDev/*`. The BFF
   Lambda is a container image (`apps/bff/Dockerfile`, `DockerImageCode.fromImageAsset` in
   `infra/cdk/lib/api-stack.ts`) — the Docker build and push to ECR happen automatically inside
   this one `cdk deploy` call. Dev is never prerendered (Basic-Auth-walled, `noindex` — see
   [docs/seo.md](./seo.md)), so that's the whole job.
5. **`e2e`** — runs `apps/e2e`'s Playwright suite against `https://dev.badthingsforpets.com`,
   the exact invocation [docs/e2e-testing.md](./e2e-testing.md) already documented running by
   hand. A failure here stops the pipeline; prod is untouched.
6. **`prod-diff`** — computes `cdk diff BtfpProd/*` and posts it to the job's summary. Runs
   automatically (not gated), specifically so the diff is visible *before* anyone is asked to
   approve the next job — a diff computed inside the gated job itself would only appear after
   the deploy already happened, which defeats the point.
7. **`deploy-prod`** — gated by GitHub's `production` Environment protection rule: this job
   does not start until a required reviewer clicks approve in the Actions UI. Once approved:
   downloads the *same* build artifacts from step 3 (not rebuilt), `cdk deploy BtfpProd/*`,
   then crawls the now-live prod API with `apps/web/scripts/prerender.mjs` and runs
   `cdk deploy BtfpProd/Web` a second time to sync the real per-route HTML — mirrors the manual
   two-pass deploy already documented in `docs/infra.md`, just automated.

## Why promotion is a real guarantee, not just "the same source"

CDK's Docker image assets (`DockerImageCode.fromImageAsset`) are content-hash-addressed: the
hash is computed from the Dockerfile and build context only (not account, region, or stack
name). `deploy-dev` and `deploy-prod` both build from the identical `apps/bff/dist` artifact
downloaded from the same `build` job, so they produce the identical hash — `deploy-prod`'s image
push is a genuine no-op (the tag already exists in the shared bootstrap ECR repo from the dev
push), not a rebuild. `platform: Platform.LINUX_AMD64` is pinned explicitly in `api-stack.ts` so
this holds even if someone later builds locally on Apple Silicon, which would otherwise hash
differently than GitHub's runners and silently produce an undeduplicated second image.

The web bundle is promoted the same way: `web-dist` is downloaded verbatim in `deploy-prod`, not
rebuilt from source — only the prerendered HTML layered on top of it is regenerated per
environment (it has to be; it's a crawl of that environment's own live, and legitimately
different, data).

## GitHub OIDC setup for AWS

No long-lived AWS credentials are stored in GitHub at all. Instead:

- **`infra/cdk/lib/ci-stack.ts`** imports the AWS account's existing
  `token.actions.githubusercontent.com` OIDC identity provider (it predates this project, from
  an unrelated AWS setup — IAM only allows one per URL per account, so this stack references it
  rather than creating a second one).
- It creates one IAM role, `btfp-gha-deploy`. Its trust policy allows that OIDC provider to
  assume it, but only when the token's `sub` claim matches
  `repo:GenomeInc@32485630/btfp@1301972078:ref:refs/heads/main` — i.e. only a workflow run that
  is an actual push to `main` can ever get credentials. (The `@<id>` suffixes are GitHub's
  immutable org/repo IDs — confirmed empirically via a temporary debug step that printed the
  real token, since the plain `owner/repo` form this was first written with doesn't match what
  GitHub actually issues. Using the ID-suffixed form is also the safer match: it survives a
  repo rename and can't be hijacked by transferring the name to a different org later.) A
  PR-triggered run's token has a different `sub` (`repo:GenomeInc@.../btfp@...:pull_request`),
  so `ci.yml` genuinely cannot assume this role even if it tried.
- The role's **only** permission is `sts:AssumeRole` on four existing CDK bootstrap roles
  (`deploy-role`, `file-publishing-role`, `image-publishing-role`, `lookup-role` — created once,
  already, by `cdk bootstrap`). It has no direct S3/Lambda/CloudFormation/ECR permissions of its
  own; every actual resource mutation happens through those already-scoped bootstrap roles. This
  is the standard minimal-surface way to wire GitHub Actions to an account that already uses CDK.
- **This is not as narrow as it sounds.** `cfn-exec-role` (one of the four, assumed internally
  by `deploy-role`) carries `AdministratorAccess` by default — that's CDK's own bootstrap
  default, not something this stack chose. So `btfp-gha-deploy`'s effective reach is full
  account admin, gated only by that `sub` condition. That's exactly why requiring the `ci.yml`
  check on `main` (branch protection, below) is load-bearing and not optional polish: it's the
  only thing standing between "anyone who can push to main" and "anyone who can deploy
  anything."
- Prod additionally requires a human clicking approve (the `production` Environment rule) — that
  gate lives in GitHub's own settings, not in IAM at all.

`infra/cdk/bin/app.ts` deploys `CiStack` once, standalone, the same way as `BtfpDns`/`BtfpEmail`.

## Manual one-time setup

Not automatable from CDK — these are GitHub repo settings.

1. **Secrets** (Settings → Secrets and variables → Actions → *Secrets*): `AWS_DEPLOY_ROLE_ARN`
   (`arn:aws:iam::<account>:role/btfp-gha-deploy`, from `CiStack`'s `DeployRoleArn` output),
   `BTFP_DEV_BASIC_AUTH_USER`, `BTFP_DEV_BASIC_AUTH_PASSWORD`, `BTFP_DEV_JWT_SECRET`,
   `BTFP_PROD_JWT_SECRET`, `BTFP_BRAVE_SEARCH_API_KEY` — same real values already in the
   gitignored `infra/cdk/.env.deploy.local`.
2. **Variables** (same page → *Variables*): `BTFP_HOSTED_ZONE_ID` — not secret, just not worth
   hardcoding.
3. **`production` Environment** (Settings → Environments → New environment, name it
   `production`): add yourself as a required reviewer. This is the actual prod approval gate.
4. **Branch protection on `main`** (Settings → Branches → Add rule): require the `CI / check`
   status check before merging. No required second-reviewer — solo-maintainer repo.

## Known accepted risks

- **e2e pollutes dev's real data.** The generated spec does a real `POST /submit` and a real
  email sign-up against dev's actual DynamoDB tables on every run. Accepted rather than built
  around — dev isn't a pristine/indexed environment anyway. Wipe/reseed it periodically by hand
  if it gets noisy (`docs/infra.md` has the seed command).
- **A `prod-diff`/`deploy-prod` failure between the two `BtfpProd` deploys leaves prod running
  new API/DB code with stale web assets** until the job is re-run or the prerender+web-deploy
  steps are run manually (same commands `docs/infra.md` documents). This is visible (a red job
  in Actions), not silent. Automatic rollback for this narrow window is more infra than this
  project's size warrants.
