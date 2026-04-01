// Projects module — project management, time tracking, profitability
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';
import { ProjectReportsController } from './project-reports.controller';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [ProjectsController, TimeTrackingController, ProjectReportsController],
  providers: [ProjectsService, TimeTrackingService],
  exports: [ProjectsService, TimeTrackingService],
})
export class ProjectsModule {}
