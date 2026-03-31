// Manufacturing module — BOM, work orders, material consumption, labor tracking
import { Module } from '@nestjs/common';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
