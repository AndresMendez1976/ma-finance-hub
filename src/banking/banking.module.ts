// Banking module — bank accounts, transactions, reconciliation
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { BankAccountsController, BankTransactionsController, PlaidController } from './banking.controller';
import { BankingService } from './banking.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [BankAccountsController, BankTransactionsController, PlaidController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
