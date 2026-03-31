// Expenses controller — CRUD, approve, post, void, summary
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PostExpenseDto } from './dto/post-expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ExpensesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ExpensesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'vendor', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string, @Query('category') category?: string,
    @Query('vendor') vendor?: string, @Query('from') from?: string,
    @Query('to') to?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, { status, category, vendor, from, to, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined }),
    );
  }

  // Batch create multiple expenses
  @Post('batch')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create multiple expenses at once' })
  async batchCreate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { expenses: CreateExpenseDto[] },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const results: Record<string, unknown>[] = [];
      for (const expenseDto of dto.expenses) {
        const expense = await this.service.create(trx, p.tenantId, p.sub, expenseDto);
        results.push(expense);
      }
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'batch_create',
        entity: 'expenses',
        entity_id: 'batch',
        metadata: { count: String(results.length) },
      });
      return results;
    });
  }

  @Get('summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async summary(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('from') from?: string, @Query('to') to?: string) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.summary(trx, from, to));
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.findOne(trx, id);
      if (!expense) throw new NotFoundException();
      return expense;
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateExpenseDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.create(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'expenses', entity_id: String(expense.id), metadata: { expense_number: String(expense.expense_number) } });
      return expense;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.update(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'expenses', entity_id: String(id) });
      return expense;
    });
  }

  @Post(':id/approve')
  @Roles('owner', 'admin', 'manager')
  async approve(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.approve(trx, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'approve', entity: 'expenses', entity_id: String(id) });
      return expense;
    });
  }

  @Post(':id/post')
  @Roles('owner', 'admin', 'manager')
  async postExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: PostExpenseDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.post(trx, p.tenantId, id, dto.fiscal_period_id, dto.payment_account_id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'post', entity: 'expenses', entity_id: String(id), metadata: { journal_entry_id: expense.journal_entry_id } });
      return expense;
    });
  }

  @Post(':id/void')
  @Roles('owner', 'admin')
  async voidExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.voidExpense(trx, p.tenantId, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'void', entity: 'expenses', entity_id: String(id) });
      return expense;
    });
  }
}
