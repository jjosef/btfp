# Verification flow

Goal: let people contribute without a heavyweight account-registration flow, while keeping
out low-effort spam/vandalism. Two independent paths to `verifiedContributor: true`, either
of which unlocks contributing.

## Path 1: quiz

1. **GitHub OAuth sign-in, with an account-age check.** GitHub's `/user` API exposes a
   public `created_at` for the account, which Google's OAuth does not — that's why GitHub
   is the qualifying provider and Google (also supported) is browsing/favoriting only.
   `MIN_ACCOUNT_AGE_DAYS` (default 30, see `.env.example`) sets the minimum age.
2. **A three-question pop quiz**, generated from real seeded Things (`VerificationService`)
   against real ASPCA-listed safe plants as distractors (`quiz-bank.ts`). Framed as fun,
   not a form — see `QuizDialog.tsx`. Must pass all three to unlock contributing.

## Path 2: professional (organizational email)

For vets and scientists — proves you control an organizational email, doesn't assume
you have (or want) a GitHub or Google account. Two entry points into the same
underlying mechanism (`apps/bff/src/auth/email-code.service.ts`):

- **Standalone sign-in**, no prior account needed: `POST /auth/email/request` +
  `/auth/email/confirm` (`AuthController`, unauthenticated). Confirming the code creates a
  new `User` (`provider: 'email'`, keyed by the address itself —
  `UsersService.findOrCreateByEmail`) and issues a session, same as finishing a GitHub
  OAuth login. `EmailSignInDialog.tsx` in the frontend.
- **Add-on to an existing session**: someone already signed in via GitHub/Google can layer
  org verification onto that same account instead — `POST /verification/professional/request`
  + `/confirm` (`ProfessionalVerificationController`, requires `JwtAuthGuard`). Delegates to
  the identical underlying service. `ProfessionalVerificationDialog.tsx` in the frontend.

Either way, the mechanism itself:

1. **Domain gate**: the claimed email's domain must not be a personal/free provider
   (`free-email-domains.ts` — a hardcoded blocklist, not an npm package, so it's auditable),
   must resolve real MX records, and is rate-limited to one code per minute
   (`UsersService.canRequestNewCode`) to make the public, unauthenticated request endpoint
   harder to use as a spam vector.
2. **Bedrock classification** (`bedrock-classifier.service.ts`): Claude Haiku, via Bedrock's
   Converse API with forced tool-call output, guesses what kind of org the domain looks like
   (veterinary clinic, university/research, etc.) from the domain name alone — no web
   access. This is **assistive only, never a gate**: an LLM guessing from a domain string
   can't actually prove an organization is real, and if Bedrock errors or is unavailable,
   verification proceeds without a label rather than blocking.
   **Requires a one-time manual step**: AWS/Anthropic require submitting a "use case
   details" form for the account before Anthropic models on Bedrock will actually respond —
   until that's done, `bedrock:InvokeModel` calls fail and classification is silently
   skipped (the gate above still works fine without it).
3. **Proof of ownership**: a 6-digit code (SHA-256 hashed at rest, 15-minute expiry) is
   emailed via SES to the claimed address. Confirming it moves status to
   `awaiting_review` — proves the person controls the inbox, but doesn't yet grant anything.
4. **Human review**: any verified contributor can see the queue (domain + Bedrock's guess,
   not the full email — keeps the local-part private from reviewers) at
   `GET /verification/professional/pending` and approve/reject it. Same
   "any verified contributor can moderate" pattern as contribution review — see the gap
   noted below.

Approving sets `verifiedContributor: true` (same unlock as the quiz) and, on any
contribution later approved from that user, stamps `details.verifiedOrgDomain` on the
resulting `Thing` (`ContributionsService.approve`) — shown as a badge on
`ThingDetailPage`.

**SES starts in sandbox mode** — can only send to individually-verified recipient
addresses. Moving to production access is an AWS Support request via the console, not
automatable. See `docs/infra.md`.

## A bug worth knowing about (fixed)

The session JWT's `verifiedContributor` claim is set once at sign-in and was never
reissued when the quiz was passed or a professional verification approved — the latter
can even happen from a *different* browser session (the reviewer's), so there was no way
to refresh the approved user's own cookie at that moment anyway. `VerifiedGuard` and
`GET /auth/me` now re-check the live DB record instead of trusting the JWT's cached claim
(`UsersService.getByProviderAccount` on every guarded request). Costs an extra DynamoDB
read per request — negligible at this scale, and it closes a real staleness gap: without
it, a user who passed the quiz would appear "not verified" until they logged out and back
in, and a revoked/rejected user's stale token would still pass the old guard.

## Known simplifications (MVP)

- The quiz is regenerated and graded per attempt with no persistence or rate limiting —
  someone could brute-force it by resubmitting. Fine for a launch-scale spam deterrent, not
  bulletproof.
- `GET /contributions/pending` and `GET /verification/professional/pending` are both
  gated on `verifiedContributor` only, with no separate admin role. Add an allowlist
  before opening contributions up publicly.
- Session is a long-lived (30-day) JWT in an httpOnly cookie. The *contributor gate* is now
  live-checked (see above), but identity itself still can't be revoked before the token
  expires — rotating `JWT_SECRET` invalidates all sessions if you need a hard reset.
- Org-email ownership proves someone works there, not that they're specifically a vet or
  scientist (could be anyone at that domain). Labeled as "verified organization," not
  "verified veterinarian," on purpose.

## Setting up real OAuth credentials

Register OAuth apps at GitHub (Settings → Developer settings → OAuth Apps) and, if you want
Google sign-in too, Google Cloud Console. Set the client id/secret and callback URLs in
`apps/bff/.env` (copy from `.env.example`). Callback URLs must match exactly what's
registered with each provider.
