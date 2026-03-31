// Manufacturing controller — BOM CRUD, work order lifecycle, material/labor recording, reports
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ManufacturingService } from './manufacturing.service';
import { CreateBomDto } from './dto/create-bom.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { RecordMaterialsDto } from './dto/record-materials.dto';
import { RecordLaborDto } from './dto/record-labor.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ManufacturingController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ManufacturingService,
    private readonly audit: AuditService,
  ) {}

  // ── BOM Endpoints ───────────────────────────────────────────────────

  @Get('bom')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllBoms(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('product_id') product_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllBoms(trx, {
        status,
        product_id: product_id ? parseInt(product_id, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('bom/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneBom(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bom = await this.service.findOneBom(trx, id);
      if (!bom) throw new NotFoundException();
      return bom;
    });
  }

  @Post('bom')
  @Roles('owner', 'admin', 'manager')
  async createBom(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateBomDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bom = await this.service.createBom(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'bill_of_materials',
        entity_id: String(bom.id),
        metadata: { name: String(bom.name) },
      });
      return bom;
    });
  }

  @Put('bom/:id')
  @Roles('owner', 'admin', 'manager')
  async updateBom(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBomDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bom = await this.service.updateBom(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'bill_of_materials',
        entity_id: String(id),
      });
      return bom;
    });
  }

  @Delete('bom/:id')
  @Roles('owner', 'admin')
  async deleteBom(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteBom(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'bill_of_materials',
        entity_id: String(id),
      });
      return result;
    });
  }

  @Get('bom/:id/cost-estimate')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get cost estimate breakdown for a BOM' })
  async getBomCostEstimate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getBomCostEstimate(trx, id),
    );
  }

  // ── Work Order Endpoints ────────────────────────────────────────────

  @Get('work-orders')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllWorkOrders(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('product_id') product_id?: string,
    @Query('priority') priority?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllWorkOrders(trx, {
        status,
        product_id: product_id ? parseInt(product_id, 10) : undefined,
        priority,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('work-orders/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.findOneWorkOrder(trx, id);
      if (!wo) throw new NotFoundException();
      return wo;
    });
  }

  @Post('work-orders')
  @Roles('owner', 'admin', 'manager')
  async createWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.createWorkOrder(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'work_orders',
        entity_id: String(wo.id),
        metadata: { wo_number: String(wo.wo_number) },
      });
      return wo;
    });
  }

  @Post('work-orders/:id/release')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Release a work order (draft -> released)' })
  async releaseWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.releaseWorkOrder(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'release',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: { wo_number: String(wo.wo_number) },
      });
      return wo;
    });
  }

  @Post('work-orders/:id/start')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Start a work order (released -> in_progress)' })
  async startWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.startWorkOrder(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'start',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: { wo_number: String(wo.wo_number) },
      });
      return wo;
    });
  }

  @Post('work-orders/:id/record-materials')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Record material consumption for a work order' })
  async recordMaterials(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordMaterialsDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.recordMaterials(trx, p.tenantId, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'record_materials',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: { line_count: String(dto.lines.length) },
      });
      return result;
    });
  }

  @Post('work-orders/:id/record-labor')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Record labor for a work order' })
  async recordLabor(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordLaborDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.recordLabor(trx, p.tenantId, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'record_labor',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: { line_count: String(dto.lines.length) },
      });
      return result;
    });
  }

  @Post('work-orders/:id/complete')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Complete a work order and create finished goods inventory' })
  async completeWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.completeWorkOrder(
        trx, p.tenantId, id, dto.quantity_produced, dto.quantity_scrapped ?? 0,
      );
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'complete',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: {
          wo_number: String(wo.wo_number),
          quantity_produced: String(dto.quantity_produced),
          quantity_scrapped: String(dto.quantity_scrapped ?? 0),
        },
      });
      return wo;
    });
  }

  @Post('work-orders/:id/cancel')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Cancel a work order (no material usage or labor)' })
  async cancelWorkOrder(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const wo = await this.service.cancelWorkOrder(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'cancel',
        entity: 'work_orders',
        entity_id: String(id),
        metadata: { wo_number: String(wo.wo_number) },
      });
      return wo;
    });
  }

  // ── Reports ─────────────────────────────────────────────────────────

  @Get('reports/production-cost')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Production cost report for completed work orders' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  async getProductionCostReport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('product_id') product_id?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProductionCostReport(trx, {
        from,
        to,
        product_id: product_id ? parseInt(product_id, 10) : undefined,
      }),
    );
  }

  @Get('reports/bom-cost-analysis')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Cost analysis for all active BOMs' })
  @ApiQuery({ name: 'product_id', required: false })
  async getBomCostAnalysis(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('product_id') product_id?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getBomCostAnalysis(trx, {
        product_id: product_id ? parseInt(product_id, 10) : undefined,
      }),
    );
  }
}
