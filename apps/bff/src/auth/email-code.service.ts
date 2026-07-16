import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { UsersService } from './users.service.js';
import { BedrockClassifierService } from './bedrock-classifier.service.js';
import { EmailSenderService } from './email-sender.service.js';
import { isFreeEmailDomain } from './free-email-domains.js';

const CODE_TTL_MS = 15 * 60 * 1000;

interface UserAccountRef {
  provider: string;
  providerAccountId: string;
}

/**
 * The shared core behind both organizational-email flows: adding org
 * verification to an already-signed-in account (professional-verification
 * module), and signing in standalone with just a work email, no GitHub/
 * Google account needed (auth module). Lives in AuthModule since it needs
 * UsersService and both flows need it — putting it in
 * professional-verification would make AuthModule depend on that module
 * for the standalone sign-in routes, circularly, since
 * professional-verification already depends on AuthModule for UsersService.
 */
@Injectable()
export class EmailCodeService {
  constructor(
    private readonly users: UsersService,
    private readonly bedrock: BedrockClassifierService,
    private readonly emailSender: EmailSenderService,
  ) {}

  async request(user: UserAccountRef, email: string): Promise<{ orgClassification?: string }> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) throw new BadRequestException('Invalid email address');
    if (isFreeEmailDomain(domain)) {
      throw new BadRequestException(
        'Please use an organizational email address, not a personal/free provider.',
      );
    }

    try {
      const records = await dns.resolveMx(domain);
      if (records.length === 0) throw new Error('no MX records');
    } catch {
      throw new BadRequestException(`Couldn't verify that ${domain} can receive email — check for typos.`);
    }

    const canRequest = await this.users.canRequestNewCode(user.provider, user.providerAccountId);
    if (!canRequest) {
      throw new BadRequestException('Please wait a minute before requesting another code.');
    }

    const classification = await this.bedrock.classifyDomain(domain);

    const code = String(randomInt(100000, 999999));
    await this.users.setProfessionalPending({
      provider: user.provider,
      providerAccountId: user.providerAccountId,
      email,
      domain,
      code,
      codeExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      orgClassification: classification?.classification,
      orgClassificationReasoning: classification?.reasoning,
    });

    await this.emailSender.sendVerificationCode(email, code);

    return { orgClassification: classification?.classification };
  }

  async confirm(user: UserAccountRef, code: string): Promise<boolean> {
    return this.users.confirmProfessionalCode(user.provider, user.providerAccountId, code);
  }
}
