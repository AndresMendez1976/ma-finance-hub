// Client portal module — public portal for clients, admin portal link management
import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalAdminController } from './portal-admin.controller';
import { PortalService } from './portal.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { DatabaseModule } from '../database';

@Module({
  imports: [AuthModule, EntitlementsModule, DatabaseModule],
  controllers: [PortalController, PortalAdminController],
  providers: [PortalService],
  exports: [PortalService],
})
export class ClientPortalModule {}
