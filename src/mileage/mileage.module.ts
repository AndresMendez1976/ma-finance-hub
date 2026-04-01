// Mileage module — recurring expenses and mileage tracking
import { Module } from '@nestjs/common';
import { MileageController } from './mileage.controller';
import { MileageService } from './mileage.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [MileageController],
  providers: [MileageService],
  exports: [MileageService],
})
export class MileageModule {}
