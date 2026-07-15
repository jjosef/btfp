import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import type { OAuthProfile } from './auth.types.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      // Falls back to a placeholder so the app can still boot without Google
      // OAuth configured; the strategy just won't work until real credentials are set.
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    return {
      provider: 'google',
      providerAccountId: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
      email: profile.emails?.[0]?.value,
      // Google doesn't expose an account-creation date, so Google sign-in is
      // browsing-only and can never pass the contributor age check.
    };
  }
}
