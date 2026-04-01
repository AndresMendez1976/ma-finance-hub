// Equipment module — equipment tracking, usage, utilization, cost reports
import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
