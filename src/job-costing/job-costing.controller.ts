// Job Costing controller — cost codes, entries, earned value, change orders, progress billings, reports
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { JobCostingService } from './job-costing.service';
import { CreateCostCodeDto } from './dto/create-cost-code.dto';
import { CreateJobCostEntryDto } from './dto/create-job-cost-entry.dto';
import { CreateChangeOrderDto } from './dto/create-change-order.dto';
import { CreateProgressBillingDto } from './dto/create-progress-billing.dto';

@ApiTags('Job Costing')
@ApiBearerAuth()
@Controller('job-costing')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class JobCostingController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: JobCostingService,
    private readonly audit: AuditService,
  ) {}

  // ─── Cost Codes ────────────────────────────────────────────────────────────

  @Get('cost-codes')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'parent_id', required: false })
  async findAllCostCodes(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('parent_id') parentId?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllCostCodes(trx, {
        parent_id: parentId ? parseInt(parentId, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('cost-codes/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneCostCode(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneCostCode(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('cost-codes')
  @Roles('owner', 'admin', 'manager')
  async createCostCode(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateCostCodeDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createCostCode(trx, p.tenantId, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'cost_codes', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('cost-codes/:id')
  @Roles('owner', 'admin', 'manager')
  async updateCostCode(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateCostCodeDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateCostCode(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'cost_codes', entity_id: String(id) });
      return row;
    });
  }

  @Delete('cost-codes/:id')
  @Roles('owner', 'admin')
  async deleteCostCode(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteCostCode(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'cost_codes', entity_id: String(id) });
      return result;
    });
  }

  // ─── Job Cost Entries ──────────────────────────────────────────────────────

  @Get('job-cost-entries')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'cost_code_id', required: false })
  @ApiQuery({ name: 'source_type', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAllEntries(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string, @Query('cost_code_id') costCodeId?: string,
    @Query('source_type') sourceType?: string,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllJobCostEntries(trx, {
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        cost_code_id: costCodeId ? parseInt(costCodeId, 10) : undefined,
        source_type: sourceType,
        from, to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('job-cost-entries/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneJobCostEntry(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('job-cost-entries')
  @Roles('owner', 'admin', 'manager')
  async createEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateJobCostEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createJobCostEntry(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'job_cost_entries', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('job-cost-entries/:id')
  @Roles('owner', 'admin', 'manager')
  async updateEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateJobCostEntryDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateJobCostEntry(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'job_cost_entries', entity_id: String(id) });
      return row;
    });
  }

  @Delete('job-cost-entries/:id')
  @Roles('owner', 'admin')
  async deleteEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteJobCostEntry(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'job_cost_entries', entity_id: String(id) });
      return result;
    });
  }

  // ─── Cost Summary & Earned Value ───────────────────────────────────────────

  @Get('projects/:id/cost-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getCostSummary(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getCostSummary(trx, id),
    );
  }

  @Get('projects/:id/earned-value')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getEarnedValue(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getEarnedValue(trx, id),
    );
  }

  // ─── Unit Price Items ──────────────────────────────────────────────────────

  @Get('unit-price-items')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'project_id', required: false })
  async findAllUnitPriceItems(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllUnitPriceItems(trx, {
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('unit-price-items/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneUnitPriceItem(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneUnitPriceItem(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('unit-price-items')
  @Roles('owner', 'admin', 'manager')
  async createUnitPriceItem(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: {
    project_id: number; description: string; unit: string;
    contract_quantity: number; unit_price: number; cost_code_id?: number;
  }) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createUnitPriceItem(trx, p.tenantId, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'unit_price_items', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('unit-price-items/:id')
  @Roles('owner', 'admin', 'manager')
  async updateUnitPriceItem(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateUnitPriceItem(trx, id, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'unit_price_items', entity_id: String(id) });
      return row;
    });
  }

  @Delete('unit-price-items/:id')
  @Roles('owner', 'admin')
  async deleteUnitPriceItem(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteUnitPriceItem(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'unit_price_items', entity_id: String(id) });
      return result;
    });
  }

  @Post('projects/:id/update-quantities')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Update quantities completed for unit price items' })
  async updateQuantities(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { items: { unit_price_item_id: number; quantity_completed: number }[] },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.updateQuantities(trx, id, dto.items);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update_quantities', entity: 'unit_price_items', entity_id: String(id), metadata: { count: String(dto.items.length) } });
      return result;
    });
  }

  // ─── Change Orders ─────────────────────────────────────────────────────────

  @Get('change-orders')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllChangeOrders(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string, @Query('status') status?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllChangeOrders(trx, {
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('change-orders/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneChangeOrder(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneChangeOrder(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('change-orders')
  @Roles('owner', 'admin', 'manager')
  async createChangeOrder(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateChangeOrderDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createChangeOrder(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'change_orders', entity_id: String(row.id), metadata: { change_order_number: String(row.change_order_number) } });
      return row;
    });
  }

  @Put('change-orders/:id')
  @Roles('owner', 'admin', 'manager')
  async updateChangeOrder(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateChangeOrderDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateChangeOrder(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'change_orders', entity_id: String(id) });
      return row;
    });
  }

  @Post('change-orders/:id/approve')
  @Roles('owner', 'admin')
  async approveChangeOrder(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.approveChangeOrder(trx, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'approve', entity: 'change_orders', entity_id: String(id) });
      return row;
    });
  }

  @Delete('change-orders/:id')
  @Roles('owner', 'admin')
  async deleteChangeOrder(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteChangeOrder(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'change_orders', entity_id: String(id) });
      return result;
    });
  }

  // ─── Progress Billings ─────────────────────────────────────────────────────

  @Get('progress-billings')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllProgressBillings(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string, @Query('status') status?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllProgressBillings(trx, {
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('progress-billings/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneProgressBilling(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('progress-billings')
  @Roles('owner', 'admin', 'manager')
  async createProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateProgressBillingDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createProgressBilling(trx, p.tenantId, p.sub, dto);
      const rowId = row ? String((row as Record<string, unknown>).id) : 'unknown';
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'progress_billings', entity_id: rowId });
      return row;
    });
  }

  @Put('progress-billings/:id')
  @Roles('owner', 'admin', 'manager')
  async updateProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateProgressBilling(trx, id, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'progress_billings', entity_id: String(id) });
      return row;
    });
  }

  @Post('progress-billings/:id/submit')
  @Roles('owner', 'admin', 'manager')
  async submitProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.submitProgressBilling(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'submit', entity: 'progress_billings', entity_id: String(id) });
      return row;
    });
  }

  @Post('progress-billings/:id/approve')
  @Roles('owner', 'admin')
  async approveProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.approveProgressBilling(trx, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'approve', entity: 'progress_billings', entity_id: String(id) });
      return row;
    });
  }

  @Post('progress-billings/:id/create-invoice')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create an invoice from an approved progress billing' })
  async createInvoiceFromBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.createInvoiceFromBilling(trx, p.tenantId, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create_invoice_from_billing', entity: 'progress_billings', entity_id: String(id), metadata: { invoice_id: String(invoice.id) } });
      return invoice;
    });
  }

  @Delete('progress-billings/:id')
  @Roles('owner', 'admin')
  async deleteProgressBilling(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteProgressBilling(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'progress_billings', entity_id: String(id) });
      return result;
    });
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  @Get('reports/job-cost-detail')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'project_id', required: false })
  async getJobCostDetailReport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getJobCostDetailReport(trx, projectId ? parseInt(projectId, 10) : undefined),
    );
  }

  @Get('reports/wip')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getWipReport(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getWipReport(trx),
    );
  }

  @Get('reports/unit-price-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'project_id', required: false })
  async getUnitPriceSummary(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getUnitPriceSummary(trx, projectId ? parseInt(projectId, 10) : undefined),
    );
  }
}
