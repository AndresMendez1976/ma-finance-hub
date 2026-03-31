import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class AccountsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: AccountsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('chart_id') chartId?: string) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, chartId ? Number(chartId) : undefined),
    );
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
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateAccountDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> = await this.service.create(trx, { tenant_id: p.tenantId, ...dto });
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'accounts', entity_id: String(row.id) });
      return row;
    });
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> | undefined = await this.service.update(trx, id, dto);
      if (!row) throw new NotFoundException();
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'accounts', entity_id: String(row.id), metadata: dto });
      return row;
    });
  }
}
