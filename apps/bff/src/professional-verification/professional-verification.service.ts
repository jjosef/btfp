import { Injectable } from '@nestjs/common';
import type { User } from '@btfp/shared-types';
import { UsersService } from '../auth/users.service.js';
import { EmailCodeService } from '../auth/email-code.service.js';

interface UserAccountRef {
  provider: string;
  providerAccountId: string;
}

/**
 * Thin wrapper around AuthModule's EmailCodeService for the "I'm already
 * signed in and want to add org verification to this account" flow (the
 * request/confirm logic itself is shared with the standalone email
 * sign-in path — see auth/email-code.service.ts) plus the review queue,
 * which is specific to this flow.
 */
@Injectable()
export class ProfessionalVerificationService {
  constructor(
    private readonly users: UsersService,
    private readonly emailCode: EmailCodeService,
  ) {}

  async request(user: UserAccountRef, email: string): Promise<{ orgClassification?: string }> {
    return this.emailCode.request(user, email);
  }

  async confirm(user: UserAccountRef, code: string): Promise<boolean> {
    return this.emailCode.confirm(user, code);
  }

  async listPending(): Promise<User[]> {
    return this.users.listAwaitingReview();
  }

  async review(
    userId: string,
    approve: boolean,
    reviewerId: string,
    reason?: string,
  ): Promise<User> {
    return this.users.reviewProfessional(userId, approve, reviewerId, reason);
  }
}
