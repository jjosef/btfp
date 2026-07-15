import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Module({
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
