// Equipment controller — CRUD equipment, usage, utilization, cost report
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateEquipmentUsageDto } from './dto/create-equipment-usage.dto';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class EquipmentController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: EquipmentService,
    private readonly audit: AuditService,
  ) {}

  // ─── Equipment CRUD ────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string, @Query('category') category?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status, category,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('reports/equipment-cost')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getEquipmentCostReport(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getEquipmentCostReport(trx),
    );
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOne(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateEquipmentDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.create(trx, p.tenantId, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'equipment', entity_id: String(row.id), metadata: { equipment_number: String(row.equipment_number) } });
      return row;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateEquipmentDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.update(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'equipment', entity_id: String(id) });
      return row;
    });
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.remove(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'equipment', entity_id: String(id) });
      return row;
    });
  }

  // ─── Utilization ───────────────────────────────────────────────────────────

  @Get(':id/utilization')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getUtilization(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from?: string, @Query('to') to?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getUtilization(trx, id, from, to),
    );
  }

  // ─── Equipment Usage CRUD ──────────────────────────────────────────────────

  @Get('usage/list')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'equipment_id', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAllUsage(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('equipment_id') equipmentId?: string, @Query('project_id') projectId?: string,
    @Query('from') from?: string, @Query('to') to?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllUsage(trx, {
        equipment_id: equipmentId ? parseInt(equipmentId, 10) : undefined,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
        from, to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('usage/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneUsage(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.findOneUsage(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post('usage')
  @Roles('owner', 'admin', 'manager')
  async createUsage(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateEquipmentUsageDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.createUsage(trx, p.tenantId, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'equipment_usage', entity_id: String(row.id) });
      return row;
    });
  }

  @Put('usage/:id')
  @Roles('owner', 'admin', 'manager')
  async updateUsage(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateEquipmentUsageDto>) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row = await this.service.updateUsage(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'equipment_usage', entity_id: String(id) });
      return row;
    });
  }

  @Delete('usage/:id')
  @Roles('owner', 'admin')
  async deleteUsage(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteUsage(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'delete', entity: 'equipment_usage', entity_id: String(id) });
      return result;
    });
  }
}
