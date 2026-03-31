// Maintenance controller — CRUD maintenance records, schedules, upcoming/overdue
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class MaintenanceController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly maintenanceService: MaintenanceService,
    private readonly audit: AuditService,
  ) {}

  // List maintenance records with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'fixed_asset_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'maintenance_type', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('fixed_asset_id') fixedAssetId?: string,
    @Query('status') status?: string,
    @Query('maintenance_type') maintenanceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.maintenanceService.findAll(trx, {
        fixed_asset_id: fixedAssetId ? parseInt(fixedAssetId, 10) : undefined,
        status,
        maintenance_type: maintenanceType,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single maintenance record
  @Get('upcoming')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get maintenance due in the next N days' })
  @ApiQuery({ name: 'days', required: false })
  async getUpcoming(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('days') days?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.maintenanceService.getUpcoming(trx, days ? parseInt(days, 10) : 30),
    );
  }

  // Get overdue maintenance
  @Get('overdue')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get overdue maintenance records' })
  async getOverdue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.maintenanceService.getOverdue(trx),
    );
  }

  // Get single maintenance record
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const record = await this.maintenanceService.findOne(trx, id);
      if (!record) throw new NotFoundException();
      return record;
    });
  }

  // Create new maintenance record
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateMaintenanceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const record = await this.maintenanceService.create(trx, p.tenantId, { ...dto });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'maintenance_records',
        entity_id: String(record.id),
        metadata: { title: String(record.title) },
      });
      return record;
    });
  }

  // Update maintenance record
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const record = await this.maintenanceService.update(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'maintenance_records',
        entity_id: String(id),
      });
      return record;
    });
  }

  // --- Maintenance Schedules ---

  // List maintenance schedules
  @Get('/schedules')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'fixed_asset_id', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSchedules(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('fixed_asset_id') fixedAssetId?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.maintenanceService.findAllSchedules(trx, {
        fixed_asset_id: fixedAssetId ? parseInt(fixedAssetId, 10) : undefined,
        is_active: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single maintenance schedule
  @Get('/schedules/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneSchedule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const schedule = await this.maintenanceService.findOneSchedule(trx, id);
      if (!schedule) throw new NotFoundException();
      return schedule;
    });
  }

  // Create new maintenance schedule
  @Post('/schedules')
  @Roles('owner', 'admin', 'manager')
  async createSchedule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateMaintenanceScheduleDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const schedule = await this.maintenanceService.createSchedule(trx, p.tenantId, { ...dto });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'maintenance_schedules',
        entity_id: String(schedule.id),
        metadata: { title: String(schedule.title) },
      });
      return schedule;
    });
  }

  // Update maintenance schedule
  @Put('/schedules/:id')
  @Roles('owner', 'admin', 'manager')
  async updateSchedule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const schedule = await this.maintenanceService.updateSchedule(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'maintenance_schedules',
        entity_id: String(id),
      });
      return schedule;
    });
  }

  // Generate maintenance record from schedule
  @Post('/schedules/:id/generate')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Generate a maintenance record from a schedule and advance next due date' })
  async generateFromSchedule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const record = await this.maintenanceService.generateFromSchedule(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'generate_from_schedule',
        entity: 'maintenance_schedules',
        entity_id: String(id),
        metadata: { maintenance_record_id: String(record.id) },
      });
      return record;
    });
  }
}
