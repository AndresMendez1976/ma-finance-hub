import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
