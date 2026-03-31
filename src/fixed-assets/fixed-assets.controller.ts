// Fixed Assets controller — CRUD, depreciation scheduling, disposal, reporting
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { DisposeAssetDto } from './dto/dispose-asset.dto';

@ApiTags('Fixed Assets')
@ApiBearerAuth()
@Controller('fixed-assets')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class FixedAssetsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: FixedAssetsService,
    private readonly audit: AuditService,
  ) {}

  // List fixed assets with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        category,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single fixed asset with depreciation entries
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const asset = await this.service.findOne(trx, id);
      if (!asset) throw new NotFoundException();
      return asset;
    });
  }

  // Create new fixed asset
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateFixedAssetDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const asset = await this.service.create(trx, p.tenantId, p.sub, { ...dto });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'fixed_assets',
        entity_id: String(asset.id),
        metadata: { asset_number: String(asset.asset_number) },
      });
      return asset;
    });
  }

  // Update fixed asset
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const asset = await this.service.update(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'fixed_assets',
        entity_id: String(id),
      });
      return asset;
    });
  }

  // Get depreciation schedule for an asset
  @Get(':id/depreciation-schedule')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get depreciation schedule projection for an asset' })
  async getDepreciationSchedule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getDepreciationSchedule(trx, id),
    );
  }

  // Run depreciation for a period across all active assets
  @Post('run-depreciation')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Run depreciation for all active assets for a period' })
  async runDepreciation(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() body: { period_date: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const results = await this.service.runDepreciation(trx, p.tenantId, body.period_date);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'run_depreciation',
        entity: 'fixed_assets',
        entity_id: 'batch',
        metadata: { period_date: body.period_date, entries_created: results.length },
      });
      return results;
    });
  }

  // Dispose of a fixed asset
  @Post(':id/dispose')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Dispose of a fixed asset with journal entry' })
  async dispose(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisposeAssetDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const asset = await this.service.disposeAsset(trx, p.tenantId, id, dto.disposal_date, dto.disposal_price);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'dispose',
        entity: 'fixed_assets',
        entity_id: String(id),
        metadata: { asset_number: String(asset.asset_number), disposal_price: dto.disposal_price },
      });
      return asset;
    });
  }

  // Get fixed assets report
  @Get('/reports/fixed-assets')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get fixed assets summary report' })
  async getReport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getFixedAssetsReport(trx),
    );
  }
}
