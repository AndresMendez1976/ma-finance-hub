// Mileage controller — recurring expenses, mileage entries, create expense, summary
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { MileageService } from './mileage.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { CreateMileageEntryDto } from './dto/create-mileage-entry.dto';

@ApiTags('Mileage & Recurring Expenses')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class MileageController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: MileageService,
    private readonly audit: AuditService,
  ) {}

  // ─── Recurring Expenses ────────────────────────────────────────────────────

  @Get('recurring-expenses')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'frequency', required: false })
  async findAllRecurringExpenses(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string, @Query('frequency') frequency?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllRecurringExpenses(trx, {
        status, frequency,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('recurring-expenses/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneRecurringExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneRecurringExpense(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('recurring-expenses')
  @Roles('owner', 'admin', 'manager')
  async createRecurringExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateRecurringExpenseDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createRecurringExpense(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'recurring_expenses', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('recurring-expenses/:id')
  @Roles('owner', 'admin', 'manager')
  async updateRecurringExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateRecurringExpenseDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateRecurringExpense(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'recurring_expenses', entity_id: String(id) });
      return row;
    });
  }

  @Delete('recurring-expenses/:id')
  @Roles('owner', 'admin')
  async deleteRecurringExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.deleteRecurringExpense(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'recurring_expenses', entity_id: String(id) });
      return row;
    });
  }

  // ─── Mileage Entries ───────────────────────────────────────────────────────

  @Get('mileage-entries')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAllMileageEntries(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string, @Query('project_id') projectId?: string,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllMileageEntries(trx, {
        status,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        from, to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('mileage-entries/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneMileageEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneMileageEntry(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('mileage-entries')
  @Roles('owner', 'admin', 'manager')
  async createMileageEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateMileageEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createMileageEntry(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'mileage_entries', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('mileage-entries/:id')
  @Roles('owner', 'admin', 'manager')
  async updateMileageEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateMileageEntryDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateMileageEntry(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'mileage_entries', entity_id: String(id) });
      return row;
    });
  }

  @Delete('mileage-entries/:id')
  @Roles('owner', 'admin')
  async deleteMileageEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteMileageEntry(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'mileage_entries', entity_id: String(id) });
      return result;
    });
  }

  @Post('mileage-entries/:id/create-expense')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create an expense from a mileage entry' })
  async createExpenseFromMileage(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.createExpenseFromMileage(trx, p.tenantId, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create_expense_from_mileage', entity: 'mileage_entries', entity_id: String(id), metadata: { expense_id: String(expense.id) } });
      return expense;
    });
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  @Get('reports/mileage-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  async getMileageSummary(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('project_id') projectId?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getMileageSummary(trx, {
        from, to,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
      }),
    );
  }
}
