export type OAuthProvider = 'github' | 'google';

export interface User {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  providerAccountCreatedAt?: string;
  verifiedContributor: boolean;
  verifiedAt?: string;
  createdAt: string;
}
