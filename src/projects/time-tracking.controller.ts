// Time tracking controller — CRUD, timer, approval, billing, summary
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';

@ApiTags('Time Tracking')
@ApiBearerAuth()
@Controller('time-entries')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class TimeTrackingController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: TimeTrackingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'employee_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'billable', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('project_id') projectId?: string, @Query('employee_id') employeeId?: string,
    @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('billable') billable?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        employee_id: employeeId ? parseInt(employeeId, 10) : undefined,
        status,
        from,
        to,
        billable: billable !== undefined ? billable === 'true' : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.findOne(trx, id);
      if (!entry) throw new NotFoundException();
      return entry;
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateTimeEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.create(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'time_entries', entity_id: String(entry.id) });
      return entry;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateTimeEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.update(trx, id, dto as unknown as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'time_entries', entity_id: String(id) });
      return entry;
    });
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'manager')
  async remove(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.delete(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'time_entries', entity_id: String(id) });
      return result;
    });
  }

  @Post('start-timer')
  @Roles('owner', 'admin', 'manager')
  async startTimer(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() body: { project_id: number; description?: string; billable?: boolean; hourly_rate?: number }) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.startTimer(trx, p.tenantId, p.sub, body);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'start_timer', entity: 'time_entries', entity_id: String(entry.id) });
      return entry;
    });
  }

  @Post('stop-timer')
  @Roles('owner', 'admin', 'manager')
  async stopTimer(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() body: { id: number }) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.stopTimer(trx, body.id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'stop_timer', entity: 'time_entries', entity_id: String(body.id) });
      return entry;
    });
  }

  @Post(':id/approve')
  @Roles('owner', 'admin', 'manager')
  async approve(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry = await this.service.approve(trx, id, p.sub);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'approve', entity: 'time_entries', entity_id: String(id) });
      return entry;
    });
  }

  @Post('bill')
  @Roles('owner', 'admin', 'manager')
  async bill(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() body: { time_entry_ids: number[]; contact_id: number }) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.billTimeEntries(trx, p.tenantId, p.sub, body);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'bill_time', entity: 'time_entries', entity_id: body.time_entry_ids.join(','), metadata: { invoice_id: String(invoice.id) } });
      return invoice;
    });
  }
}
