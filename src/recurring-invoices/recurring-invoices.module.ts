// Recurring Invoices module — auto-generation of invoices on schedule
import { Module } from '@nestjs/common';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
