// Equipment module — equipment tracking, usage, utilization, cost reports
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
