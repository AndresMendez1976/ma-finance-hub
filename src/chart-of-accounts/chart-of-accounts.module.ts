import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsController } from './chart-of-accounts.controller';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService],
  exports: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
