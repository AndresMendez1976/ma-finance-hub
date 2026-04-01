// Tracking dimensions module — custom tracking categories and values
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { TrackingController, TrackingValuesController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [TrackingController, TrackingValuesController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
