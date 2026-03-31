// Portal admin controller — internal routes (with JWT) for managing portal links
import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { PortalService } from './portal.service';

@ApiTags('Client Portal Admin')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class PortalAdminController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: PortalService,
    private readonly audit: AuditService,
  ) {}

  // Generate a portal link for a contact
  @Post(':id/generate-portal-link')
  @Roles('owner', 'admin', 'manager')
  async generatePortalLink(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.generateToken(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'generate_portal_link',
        entity: 'contacts',
        entity_id: String(id),
      });
      return result;
    });
  }

  // Check portal status for a contact
  @Get(':id/portal-status')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getPortalStatus(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getPortalStatus(trx, id),
    );
  }
}
