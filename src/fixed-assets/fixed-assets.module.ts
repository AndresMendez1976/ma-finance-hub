// Fixed Assets module — depreciation, disposal, maintenance scheduling
import { Module } from '@nestjs/common';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import { DepreciationService } from './depreciation.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [FixedAssetsController, MaintenanceController],
  providers: [FixedAssetsService, DepreciationService, MaintenanceService],
  exports: [FixedAssetsService, DepreciationService],
})
export class FixedAssetsModule {}
