// Company Groups controller — multi-company management
import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseIntPipe, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Knex } from 'knex';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { AuditService } from '../auth/audit.service';
import { TenantContextService } from '../auth/tenant-context.service';
import { KNEX_CONNECTION } from '../database';
import { CompanyGroupsService } from './company-groups.service';

@ApiTags('Company Groups')
@ApiBearerAuth()
@Controller('company-groups')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
export class CompanyGroupsController {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly service: CompanyGroupsService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  @Roles('owner')
  @ApiOperation({ summary: 'Create a company group' })
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { name: string },
  ) {
    const userId = await this.getUserId(p.sub);
    const group = await this.service.create(this.db, userId, dto.name);
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'company_groups', entity_id: String(group.id) }),
    );
    return group;
  }

  @Get()
  @Roles('owner')
  @ApiOperation({ summary: 'List company groups for current user' })
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    const userId = await this.getUserId(p.sub);
    return this.service.findAll(this.db, userId);
  }

  @Get(':id')
  @Roles('owner')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    const userId = await this.getUserId(p.sub);
    return this.service.findOne(this.db, id, userId);
  }

  @Post(':id/add-tenant')
  @Roles('owner')
  @ApiOperation({ summary: 'Add a tenant to the company group' })
  async addTenant(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { tenant_id: number },
  ) {
    const userId = await this.getUserId(p.sub);
    const result = await this.service.addTenant(this.db, id, dto.tenant_id, userId);
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'add_tenant', entity: 'company_groups', entity_id: String(id), metadata: { added_tenant_id: String(dto.tenant_id) } }),
    );
    return result;
  }

  @Delete(':id/remove-tenant/:tenantId')
  @Roles('owner')
  @ApiOperation({ summary: 'Remove a tenant from the company group' })
  async removeTenant(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    const result = await this.service.removeTenant(this.db, id, tenantId);
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'remove_tenant', entity: 'company_groups', entity_id: String(id), metadata: { removed_tenant_id: String(tenantId) } }),
    );
    return result;
  }

  @Get(':id/consolidated-dashboard')
  @Roles('owner')
  @ApiOperation({ summary: 'Get consolidated dashboard for all tenants in group' })
  async getConsolidatedDashboard(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = await this.getUserId(p.sub);
    return this.service.getConsolidatedDashboard(this.db, id, userId);
  }

  private async getUserId(sub: string): Promise<number> {
    const user = await this.db('users').where({ external_subject: sub }).select('id').first() as Record<string, unknown> | undefined;
    if (!user) throw new Error('User not found');
    return Number(user.id);
  }
}
