// Tracking controller — CRUD tracking dimensions and values
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { TrackingService } from './tracking.service';
import { CreateDimensionDto } from './dto/create-dimension.dto';
import { CreateValueDto } from './dto/create-value.dto';

@ApiTags('Tracking Dimensions')
@ApiBearerAuth()
@Controller('tracking-dimensions')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class TrackingController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: TrackingService,
    private readonly audit: AuditService,
  ) {}

  // List all tracking dimensions with values
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllDimensions(trx),
    );
  }

  // Get active dimensions only
  @Get('active')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getActive(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getActiveDimensions(trx),
    );
  }

  // Get single tracking dimension
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dimension = await this.service.findOneDimension(trx, id);
      if (!dimension) throw new NotFoundException();
      return dimension;
    });
  }

  // Create new tracking dimension
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateDimensionDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dimension = await this.service.createDimension(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'tracking_dimensions',
        entity_id: String(dimension.id),
        metadata: { name: String(dimension.name) },
      });
      return dimension;
    });
  }

  // Update tracking dimension
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateDimensionDto> & { is_active?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dimension = await this.service.updateDimension(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'tracking_dimensions',
        entity_id: String(id),
      });
      return dimension;
    });
  }

  // Delete tracking dimension
  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteDimension(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'tracking_dimensions',
        entity_id: String(id),
      });
      return result;
    });
  }

  // Add value to a dimension
  @Post(':id/values')
  @Roles('owner', 'admin', 'manager')
  async addValue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateValueDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const value = await this.service.addValue(trx, p.tenantId, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'tracking_dimension_values',
        entity_id: String(value.id),
        metadata: { dimension_id: String(id), value: String(value.value) },
      });
      return value;
    });
  }
}

// Separate controller for tracking values to handle PUT/DELETE on /tracking-values/:id
import { Controller as Ctrl } from '@nestjs/common';

@ApiTags('Tracking Dimensions')
@ApiBearerAuth()
@Ctrl('tracking-values')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class TrackingValuesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: TrackingService,
    private readonly audit: AuditService,
  ) {}

  // Update a tracking dimension value
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async updateValue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { value?: string; is_active?: boolean; sort_order?: number },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const value = await this.service.updateValue(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'tracking_dimension_values',
        entity_id: String(id),
      });
      return value;
    });
  }

  // Delete a tracking dimension value
  @Delete(':id')
  @Roles('owner', 'admin')
  async deleteValue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteValue(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'tracking_dimension_values',
        entity_id: String(id),
      });
      return result;
    });
  }
}
