// Reports module — financial statements (Balance Sheet, Income Statement, Cash Flow)
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportPdfService],
  exports: [ReportsService, ReportPdfService],
})
export class ReportsModule {}
