import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { GithubStrategy } from './github.strategy.js';
import { GoogleStrategy } from './google.strategy.js';
import { EmailCodeService } from './email-code.service.js';
import { BedrockClassifierService } from './bedrock-classifier.service.js';
import { EmailSenderService } from './email-sender.service.js';
import { HomepageFetcherService } from './homepage-fetcher.service.js';
import { SearchHistoryService } from './search-history.service.js';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    GithubStrategy,
    GoogleStrategy,
    EmailCodeService,
    BedrockClassifierService,
    EmailSenderService,
    HomepageFetcherService,
    SearchHistoryService,
  ],
  exports: [AuthService, UsersService, EmailCodeService],
})
export class AuthModule {}
