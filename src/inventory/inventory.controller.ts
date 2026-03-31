// Inventory controller — products, locations, adjustments, transfers, reports
import { Controller, Get, Post, Put, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { InventoryService } from './inventory.service';
import { InventoryCostingService } from './inventory-costing.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class InventoryController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: InventoryService,
    private readonly costingService: InventoryCostingService,
    private readonly audit: AuditService,
  ) {}

  // ─── Products ───

  // List products with optional filters
  @Get('products')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllProducts(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllProducts(trx, {
        category,
        type,
        search,
        is_active,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Import products from CSV
  @Post('products/import-csv')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Import products from CSV data' })
  async importProductsCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { csv_data: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.importProductsCsv(trx, p.tenantId, dto.csv_data);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'import_csv',
        entity: 'products',
        entity_id: 'batch',
        metadata: { imported: String(result.imported), errors: String(result.errors.length) },
      });
      return result;
    });
  }

  // Export all products as CSV
  @Get('products/export-csv')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Export all products as CSV' })
  async exportProductsCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    const csv = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.exportProductsCsv(trx),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  }

  // Get low stock products
  @Get('products/low-stock')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get products below reorder point' })
  async getLowStockProducts(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getLowStockProducts(trx),
    );
  }

  // Get single product
  @Get('products/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneProduct(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const product = await this.service.findOneProduct(trx, id);
      if (!product) throw new NotFoundException();
      return product;
    });
  }

  // Get product stock by location
  @Get('products/:id/stock')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get product stock levels by location' })
  async getProductStock(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProductStock(trx, id),
    );
  }

  // Get product transaction history
  @Get('products/:id/transactions')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get product transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProductTransactions(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getProductTransactions(trx, id, {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Create new product
  @Post('products')
  @Roles('owner', 'admin', 'manager')
  async createProduct(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateProductDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const product = await this.service.createProduct(trx, p.tenantId, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'products',
        entity_id: String(product.id),
        metadata: { sku: String(product.sku) },
      });
      return product;
    });
  }

  // Update product
  @Put('products/:id')
  @Roles('owner', 'admin', 'manager')
  async updateProduct(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const product = await this.service.updateProduct(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'products',
        entity_id: String(id),
      });
      return product;
    });
  }

  // ─── Inventory Locations ───

  // List locations
  @Get('inventory-locations')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAllLocations(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllLocations(trx),
    );
  }

  // Get single location
  @Get('inventory-locations/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneLocation(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const location = await this.service.findOneLocation(trx, id);
      if (!location) throw new NotFoundException();
      return location;
    });
  }

  // Create location
  @Post('inventory-locations')
  @Roles('owner', 'admin', 'manager')
  async createLocation(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { name: string; address?: string; is_active?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const location = await this.service.createLocation(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'inventory_locations',
        entity_id: String(location.id),
        metadata: { name: String(location.name) },
      });
      return location;
    });
  }

  // Update location
  @Put('inventory-locations/:id')
  @Roles('owner', 'admin', 'manager')
  async updateLocation(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { name?: string; address?: string; is_active?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const location = await this.service.updateLocation(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'inventory_locations',
        entity_id: String(id),
      });
      return location;
    });
  }

  // ─── Inventory Adjustments ───

  // List adjustments
  @Get('inventory-adjustments')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAdjustments(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllAdjustments(trx, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Create adjustment
  @Post('inventory-adjustments')
  @Roles('owner', 'admin', 'manager')
  async createAdjustment(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const adjustment = await this.service.createAdjustment(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'inventory_adjustments',
        entity_id: String(adjustment.id),
        metadata: { adjustment_number: String(adjustment.adjustment_number) },
      });
      return adjustment;
    });
  }

  // Post adjustment (draft → posted, creates inventory transactions + journal entry)
  @Post('inventory-adjustments/:id/post')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Post an inventory adjustment (creates transactions and journal entry)' })
  async postAdjustment(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const adjustment = await this.service.postAdjustment(trx, p.tenantId, id) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'post',
        entity: 'inventory_adjustments',
        entity_id: String(id),
        metadata: { adjustment_number: String(adjustment.adjustment_number) },
      });
      return adjustment;
    });
  }

  // ─── Inventory Transfers ───

  // List transfers
  @Get('inventory-transfers')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTransfers(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllTransfers(trx, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Create transfer
  @Post('inventory-transfers')
  @Roles('owner', 'admin', 'manager')
  async createTransfer(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateTransferDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const transfer = await this.service.createTransfer(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'inventory_transfers',
        entity_id: String(transfer.id),
        metadata: { transfer_number: String(transfer.transfer_number) },
      });
      return transfer;
    });
  }

  // Complete transfer (draft → completed, creates inventory transactions)
  @Post('inventory-transfers/:id/complete')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Complete an inventory transfer (moves stock between locations)' })
  async completeTransfer(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const transfer = await this.service.completeTransfer(trx, p.tenantId, id) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'complete',
        entity: 'inventory_transfers',
        entity_id: String(id),
        metadata: { transfer_number: String(transfer.transfer_number) },
      });
      return transfer;
    });
  }

  // ─── Reports ───

  // Inventory valuation report
  @Get('reports/inventory-valuation')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get inventory valuation report (total value by product)' })
  async getInventoryValuation(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.costingService.getInventoryValuation(trx),
    );
  }

  // Stock status report
  @Get('reports/stock-status')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get stock status report for all active inventory products' })
  async getStockStatus(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getStockStatus(trx),
    );
  }
}
