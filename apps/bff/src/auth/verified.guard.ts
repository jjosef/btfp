import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './auth.types.js';

@Injectable()
export class VerifiedGuard extends JwtAuthGuard {
  override canActivate(context: ExecutionContext): boolean {
    const isAuthenticated = super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    if (!request.user?.verifiedContributor) {
      throw new ForbiddenException('Complete the contributor quiz before submitting');
    }
    return true;
  }
}
