import type { AuthProvider } from '@btfp/shared-types';

export interface OAuthProfile {
  provider: AuthProvider;
  providerAccountId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  providerAccountCreatedAt?: string;
}

export interface AuthenticatedUser {
  id: string;
  provider: AuthProvider;
  providerAccountId: string;
  displayName: string;
  verifiedContributor: boolean;
}

export interface SessionJwtPayload {
  sub: string;
  provider: AuthProvider;
  providerAccountId: string;
  displayName: string;
  verifiedContributor: boolean;
}
