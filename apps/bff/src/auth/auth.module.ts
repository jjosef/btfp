import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { GithubStrategy } from './github.strategy.js';
import { GoogleStrategy } from './google.strategy.js';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, GithubStrategy, GoogleStrategy],
  exports: [AuthService, UsersService],
})
export class AuthModule {}
