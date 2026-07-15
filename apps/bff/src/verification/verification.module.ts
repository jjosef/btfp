import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
