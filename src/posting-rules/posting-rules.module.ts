import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { JournalModule } from '../journal';
import { PostingRulesService } from './posting-rules.service';
import { PostingRulesController } from './posting-rules.controller';

@Module({
  imports: [AuthModule, EntitlementsModule, JournalModule],
  controllers: [PostingRulesController],
  providers: [PostingRulesService],
  exports: [PostingRulesService],
})
export class PostingRulesModule {}
