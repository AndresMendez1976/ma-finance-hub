import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateChartDto } from './dto/create-chart.dto';
import { UpdateChartDto } from './dto/update-chart.dto';

@ApiTags('Chart of Accounts')
@ApiBearerAuth()
@Controller('chart-of-accounts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.chart_of_accounts')
export class ChartOfAccountsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ChartOfAccountsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.findAll(trx));
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> | undefined = await this.service.findOne(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post()
  @Roles('owner', 'admin')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateChartDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> = await this.service.create(trx, { tenant_id: p.tenantId, name: dto.name, description: dto.description });
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'chart_of_accounts', entity_id: String(row.id) });
      return row;
    });
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChartDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> | undefined = await this.service.update(trx, id, dto);
      if (!row) throw new NotFoundException();
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'chart_of_accounts', entity_id: String(row.id), metadata: dto });
      return row;
    });
  }
}
