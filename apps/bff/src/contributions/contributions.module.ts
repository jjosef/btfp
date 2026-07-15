import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller.js';
import { ContributionsService } from './contributions.service.js';
import { ThingsModule } from '../things/things.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [ThingsModule, AuthModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
})
export class ContributionsModule {}
