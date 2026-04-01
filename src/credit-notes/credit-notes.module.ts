// Credit Notes module — credit note lifecycle (create, issue, apply, void, PDF)
import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
  exports: [CreditNotesService],
})
export class CreditNotesModule {}
