import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { EmailCodeService } from './email-code.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser, OAuthProfile } from './auth.types.js';
import { RequestEmailSignInDto } from './dto/request-email-sign-in.dto.js';
import { ConfirmEmailSignInDto } from './dto/confirm-email-sign-in.dto.js';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'btfp_session';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly users: UsersService,
    private readonly emailCode: EmailCodeService,
  ) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin(): void {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    await this.completeOAuthLogin(req, res);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    await this.completeOAuthLogin(req, res);
  }

  /**
   * Standalone sign-in with just an organizational email — no GitHub/Google
   * account required. Same domain/MX validation and Bedrock classification
   * as adding org verification to an existing session
   * (`ProfessionalVerificationController`), but this creates the identity
   * and the session in one flow rather than requiring one to already exist.
   */
  @Post('email/request')
  async requestEmailSignIn(@Body() dto: RequestEmailSignInDto) {
    const user = await this.users.findOrCreateByEmail(dto.email);
    return this.emailCode.request(
      { provider: user.provider, providerAccountId: user.providerAccountId },
      dto.email,
    );
  }

  @Post('email/confirm')
  async confirmEmailSignIn(@Body() dto: ConfirmEmailSignInDto, @Res() res: FastifyReply) {
    const providerAccountId = dto.email.toLowerCase();
    const user = await this.users.getByProviderAccount('email', providerAccountId);
    if (!user) throw new BadRequestException('Request a code first');

    const confirmed = await this.emailCode.confirm(
      { provider: 'email', providerAccountId },
      dto.code,
    );
    if (!confirmed) throw new UnauthorizedException('Invalid or expired code');

    this.setSessionCookie(res, this.authService.issueSessionToken(user));
    res.send({ confirmed: true });
  }

  /**
   * E2E-testing only: lets automated tests complete real sign-in without
   * reading an inbox. Refuses outright in prod (mirrors UsersService.getTestCode
   * — belt and suspenders, since the plaintext code is never even written to
   * the prod table in the first place). See docs/e2e-testing.md.
   */
  @Get('email/test-code')
  async getEmailTestCode(@Query('email') email?: string) {
    if (process.env.STAGE === 'prod') throw new NotFoundException();
    if (!email) throw new BadRequestException('email query param required');

    const code = await this.users.getTestCode('email', email.toLowerCase());
    if (!code) throw new NotFoundException('No pending code for that email');
    return { code };
  }

  /**
   * E2E-testing only: the pop quiz (QuizDialog) is regenerated with random
   * correct answers per attempt, so a generated Playwright script can't
   * hardcode them any more than it can read a real inbox for the email
   * code above. Same gating, same reasoning, requires an authenticated
   * session so it can only verify the caller's own account. See
   * docs/e2e-testing.md.
   */
  @Post('test/verify')
  @UseGuards(JwtAuthGuard)
  async testVerify(@CurrentUser() user: AuthenticatedUser) {
    if (process.env.STAGE === 'prod') throw new NotFoundException();
    await this.users.markVerified(user.provider, user.providerAccountId);
    return { verified: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    // Live DB state, not the JWT's claims — those go stale the moment the
    // quiz is passed or a professional verification is approved, since
    // neither reissues the session token. See VerifiedGuard for the same fix.
    const account = await this.users.getByProviderAccount(user.provider, user.providerAccountId);
    return account ?? user;
  }

  @Get('logout')
  logout(@Res() res: FastifyReply) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.redirect(WEB_ORIGIN);
  }

  private async completeOAuthLogin(req: FastifyRequest, res: FastifyReply) {
    const profile = req.user as unknown as OAuthProfile;
    const user = await this.users.upsertFromOAuth(profile);
    this.setSessionCookie(res, this.authService.issueSessionToken(user));
    res.redirect(`${WEB_ORIGIN}/?signedIn=1`);
  }

  private setSessionCookie(res: FastifyReply, token: string) {
    res.setCookie(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
