// Invoices module — invoicing lifecycle (create, send, pay, void, PDF, Stripe payments)
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { SettingsModule } from '../settings';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule, SettingsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
