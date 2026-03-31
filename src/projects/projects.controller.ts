// Projects controller — CRUD, profitability, expense linking
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ProjectsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ProjectsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string, @Query('contact_id') contactId?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        contact_id: contactId ? parseInt(contactId, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const project = await this.service.findOne(trx, id);
      if (!project) throw new NotFoundException();
      return project;
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateProjectDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const project = await this.service.create(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'projects', entity_id: String(project.id), metadata: { project_number: String(project.project_number) } });
      return project;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const project = await this.service.update(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'projects', entity_id: String(id) });
      return project;
    });
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.delete(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'projects', entity_id: String(id) });
      return result;
    });
  }

  @Get(':id/profitability')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async profitability(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProjectProfitability(trx, id),
    );
  }

  @Get(':id/time-entries')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async timeEntries(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProjectTimeEntries(trx, id),
    );
  }

  @Get(':id/expenses')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async expenses(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProjectExpenses(trx, id),
    );
  }

  @Post(':id/link-expense')
  @Roles('owner', 'admin', 'manager')
  async linkExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() body: { expense_id: number }) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const link = await this.service.linkExpense(trx, id, body.expense_id, p.tenantId);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'link_expense', entity: 'projects', entity_id: String(id), metadata: { expense_id: String(body.expense_id) } });
      return link;
    });
  }

  @Delete(':id/unlink-expense/:expenseId')
  @Roles('owner', 'admin', 'manager')
  async unlinkExpense(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Param('expenseId', ParseIntPipe) expenseId: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.unlinkExpense(trx, id, expenseId);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'unlink_expense', entity: 'projects', entity_id: String(id), metadata: { expense_id: String(expenseId) } });
      return result;
    });
  }
}
