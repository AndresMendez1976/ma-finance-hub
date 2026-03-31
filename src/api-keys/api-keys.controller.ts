// API Keys controller — create, list, revoke API keys
import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ApiKeysController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ApiKeysService,
    private readonly audit: AuditService,
  ) {}

  // Create a new API key
  @Post()
  @Roles('owner', 'admin')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.create(trx, p.tenantId, dto.name, dto.permissions);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'api_keys',
        entity_id: String(result.id),
        metadata: { name: dto.name, key_prefix: result.key_prefix },
      });
      return result;
    });
  }

  // List all API keys (key not included)
  @Get()
  @Roles('owner', 'admin')
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx),
    );
  }

  // Revoke an API key
  @Delete(':id')
  @Roles('owner', 'admin')
  async revoke(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.revoke(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'revoke',
        entity: 'api_keys',
        entity_id: String(id),
      });
      return result;
    });
  }
}
