// Bank rules module — automated transaction categorization rules
import { Module } from '@nestjs/common';
import { BankRulesController, BankAccountApplyRulesController } from './bank-rules.controller';
import { BankRuleService } from './bank-rule.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [BankRulesController, BankAccountApplyRulesController],
  providers: [BankRuleService],
  exports: [BankRuleService],
})
export class BankRulesModule {}
