// CRM module — pipelines, stages, opportunities, activities
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
