import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { JournalModule } from '../journal';
import { PostingRulesService } from './posting-rules.service';
import { PostingRulesController } from './posting-rules.controller';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule, JournalModule],
  controllers: [PostingRulesController],
  providers: [PostingRulesService],
  exports: [PostingRulesService],
})
export class PostingRulesModule {}
