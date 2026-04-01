// Job Costing module — cost codes, entries, earned value, change orders, progress billings
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { JobCostingController } from './job-costing.controller';
import { JobCostingService } from './job-costing.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [JobCostingController],
  providers: [JobCostingService],
  exports: [JobCostingService],
})
export class JobCostingModule {}
