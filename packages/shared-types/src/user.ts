// 'email' isn't OAuth — it's the standalone organizational-email sign-in
// path (see docs/verification-flow.md). Kept in the same union since it's
// still "how this user proved who they are."
export type AuthProvider = 'github' | 'google' | 'email';

export type ProfessionalStatus =
  | 'none'
  | 'pending_email_confirmation'
  | 'awaiting_review'
  | 'verified'
  | 'rejected';

export interface ProfessionalVerification {
  status: ProfessionalStatus;
  domain: string;
  /** Bedrock's guess at the org type, e.g. "veterinary_clinic" — a signal for the human reviewer, not a gate. */
  orgClassification?: string;
  orgClassificationReasoning?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface User {
  id: string;
  provider: AuthProvider;
  providerAccountId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  providerAccountCreatedAt?: string;
  verifiedContributor: boolean;
  verifiedAt?: string;
  professional?: ProfessionalVerification;
  createdAt: string;
}
