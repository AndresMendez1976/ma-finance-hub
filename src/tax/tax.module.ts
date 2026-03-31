// Tax module — sales tax rates, components, calculations
import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TaxCalculationService } from './tax-calculation.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [TaxController],
  providers: [TaxService, TaxCalculationService],
  exports: [TaxService, TaxCalculationService],
})
export class TaxModule {}
