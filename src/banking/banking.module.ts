// Banking module — bank accounts, transactions, reconciliation
import { Module } from '@nestjs/common';
import { BankAccountsController, BankTransactionsController } from './banking.controller';
import { BankingService } from './banking.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [BankAccountsController, BankTransactionsController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}
