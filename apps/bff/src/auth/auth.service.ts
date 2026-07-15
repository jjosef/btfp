import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@btfp/shared-types';
import type { SessionJwtPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  issueSessionToken(user: User): string {
    const payload: SessionJwtPayload = {
      sub: user.id,
      provider: user.provider,
      providerAccountId: user.providerAccountId,
      displayName: user.displayName,
      verifiedContributor: user.verifiedContributor,
    };
    return this.jwt.sign(payload);
  }

  verifySessionToken(token: string): SessionJwtPayload {
    return this.jwt.verify<SessionJwtPayload>(token);
  }

  isAccountOldEnough(providerAccountCreatedAt: string | undefined, minDays: number): boolean {
    if (!providerAccountCreatedAt) return false;
    const ageMs = Date.now() - new Date(providerAccountCreatedAt).getTime();
    return ageMs / (1000 * 60 * 60 * 24) >= minDays;
  }
}
