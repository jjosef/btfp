import { Module } from '@nestjs/common';
import { ProfessionalVerificationController } from './professional-verification.controller.js';
import { ProfessionalVerificationService } from './professional-verification.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProfessionalVerificationController],
  providers: [ProfessionalVerificationService],
})
export class ProfessionalVerificationModule {}
