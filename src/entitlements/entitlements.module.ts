import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { AuthModule } from '../auth';
import { EntitlementService } from './entitlement.service';
import { EntitlementGuard } from './entitlement.guard';
import { TierController } from './tier.controller';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [TierController],
  providers: [EntitlementService, EntitlementGuard],
  exports: [EntitlementService, EntitlementGuard],
})
export class EntitlementsModule {}
