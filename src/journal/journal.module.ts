import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
