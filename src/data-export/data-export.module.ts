// Data Export module — full data export ZIP and tenant data deletion
import { Module } from '@nestjs/common';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [DataExportController],
  providers: [DataExportService],
  exports: [DataExportService],
})
export class DataExportModule {}
