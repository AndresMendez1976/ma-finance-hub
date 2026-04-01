// Estimates module — quotes/proposals with conversion to invoices
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
