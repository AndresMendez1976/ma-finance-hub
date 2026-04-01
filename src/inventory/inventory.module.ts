// Inventory module — products, locations, adjustments, transfers, costing
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryCostingService } from './inventory-costing.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryCostingService],
  exports: [InventoryService, InventoryCostingService],
})
export class InventoryModule {}
