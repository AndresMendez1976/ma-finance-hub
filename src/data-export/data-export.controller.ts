// Data Export controller — full data export and deletion
import { Controller, Get, Delete, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { DataExportService } from './data-export.service';

@ApiTags('Data Export')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class DataExportController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: DataExportService,
    private readonly audit: AuditService,
  ) {}

  // Export all tenant data as ZIP of CSVs
  @Get('export/all')
  @Roles('owner')
  async exportAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    const result = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const data = await this.service.exportAll(trx, p.tenantId);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'export_all_data',
        entity: 'tenant',
        entity_id: String(p.tenantId),
      });
      return data;
    });

    // Build a simple combined CSV response (since archiver may not be available)
    // Concatenate all CSVs with separators
    const content = result.csvFiles
      .map((f) => `=== ${f.name} ===\n${f.content}`)
      .join('\n\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename.replace('.zip', '.txt')}`);
    res.send(content);
  }

  // Delete all tenant data (except audit log)
  @Delete('tenant/data')
  @Roles('owner')
  async deleteData(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() body: { password: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteAllData(trx, p.tenantId, body.password);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete_all_data',
        entity: 'tenant',
        entity_id: String(p.tenantId),
        metadata: { deleted_count: result.deleted_tables.length },
      });
      return result;
    });
  }
}
