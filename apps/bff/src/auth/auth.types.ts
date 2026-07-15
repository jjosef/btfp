import type { OAuthProvider } from '@btfp/shared-types';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  providerAccountCreatedAt?: string;
}

export interface AuthenticatedUser {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  verifiedContributor: boolean;
}

export interface SessionJwtPayload {
  sub: string;
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  verifiedContributor: boolean;
}
