import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getSettings(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getSettings(trx, p.tenantId),
    );
  }

  @Put()
  @Roles('owner', 'admin')
  async updateSettings(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      // Ensure settings row exists before updating
      await this.service.getSettings(trx, p.tenantId);
      const row: Record<string, unknown> = await this.service.updateSettings(trx, p.tenantId, dto as Record<string, unknown>);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'tenant_settings',
        metadata: dto as object,
      });
      return row;
    });
  }
}
