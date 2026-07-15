import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';
import type { OAuthProfile } from './auth.types.js';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      // Falls back to a placeholder so the app can still boot without GitHub
      // OAuth configured; the strategy just won't work until real credentials are set.
      clientID: process.env.GITHUB_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'not-configured',
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:3001/api/auth/github/callback',
      scope: ['read:user', 'user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const json = (profile as unknown as { _json?: { created_at?: string } })._json;
    return {
      provider: 'github',
      providerAccountId: profile.id,
      displayName: profile.displayName || profile.username || profile.id,
      avatarUrl: profile.photos?.[0]?.value,
      email: profile.emails?.[0]?.value,
      // GitHub's /user response includes the account's public created_at date,
      // which is what the contributor age check is built on.
      providerAccountCreatedAt: json?.created_at,
    };
  }
}
