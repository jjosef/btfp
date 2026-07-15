# Verification flow

Goal: let people contribute without a heavyweight account-registration flow, while keeping
out low-effort spam/vandalism. Two gates, both required:

1. **GitHub OAuth sign-in, with an account-age check.** GitHub's `/user` API exposes a
   public `created_at` for the account, which Google's OAuth does not — that's why GitHub
   is the qualifying provider and Google (also supported) is browsing/favoriting only.
   `MIN_ACCOUNT_AGE_DAYS` (default 30, see `.env.example`) sets the minimum age.
2. **A three-question pop quiz**, generated from real seeded Things (`VerificationService`)
   against real ASPCA-listed safe plants as distractors (`quiz-bank.ts`). Framed as fun,
   not a form — see `QuizDialog.tsx`. Must pass all three to unlock contributing.

Passing both flips `verifiedContributor: true` on the user record
(`UsersService.markVerified`). This is re-checked on every contribution submit via
`VerifiedGuard`, not just cached client-side.

## Known simplifications (MVP)

- The quiz is regenerated and graded per attempt with no persistence or rate limiting —
  someone could brute-force it by resubmitting. Fine for a launch-scale spam deterrent, not
  bulletproof.
- `GET /contributions/pending` (the moderation queue) is gated on `verifiedContributor`
  only, with no separate admin role. Add an allowlist before opening contributions up
  publicly.
- Session is a long-lived (30-day) JWT in an httpOnly cookie. There's no revocation
  mechanism — rotating `JWT_SECRET` invalidates all sessions if you need a hard reset.

## Setting up real OAuth credentials

Register OAuth apps at GitHub (Settings → Developer settings → OAuth Apps) and, if you want
Google sign-in too, Google Cloud Console. Set the client id/secret and callback URLs in
`apps/bff/.env` (copy from `.env.example`). Callback URLs must match exactly what's
registered with each provider.
