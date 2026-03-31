// Estimates module — quotes/proposals with conversion to invoices
import { Module } from '@nestjs/common';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
