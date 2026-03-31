// Tax controller — CRUD tax rates, default rate, tax calculation
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { TaxService } from './tax.service';
import { TaxCalculationService } from './tax-calculation.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { CalculateTaxDto } from './dto/calculate-tax.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@Controller('tax-rates')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class TaxController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: TaxService,
    private readonly calculationService: TaxCalculationService,
    private readonly audit: AuditService,
  ) {}

  // List tax rates
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'jurisdiction', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('jurisdiction') jurisdiction?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        jurisdiction,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get default tax rate
  @Get('default')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getDefault(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.getDefaultRate(trx);
      if (!rate) throw new NotFoundException('No default tax rate set');
      return rate;
    });
  }

  // Get single tax rate
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.findOne(trx, id);
      if (!rate) throw new NotFoundException();
      return rate;
    });
  }

  // Create tax rate
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateTaxRateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.create(trx, p.tenantId, dto) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'tax_rates',
        entity_id: String(rate.id),
        metadata: { name: String(rate.name), jurisdiction: String(rate.jurisdiction) },
      });
      return rate;
    });
  }

  // Calculate tax
  @Post('calculate')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async calculate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CalculateTaxDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.calculationService.calculateTax(trx, dto.subtotal, dto.tax_rate_id),
    );
  }

  // Update tax rate
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'tax_rates',
        entity_id: String(id),
      });
      return rate;
    });
  }

  // Delete tax rate
  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.delete(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'tax_rates',
        entity_id: String(id),
      });
      return result;
    });
  }

  // Seed default tax rates
  @Post('seed')
  @Roles('owner', 'admin')
  async seed(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rates = await this.service.seedDefaults(trx, p.tenantId);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'seed',
        entity: 'tax_rates',
        entity_id: 'batch',
        metadata: { count: String(rates.length) },
      });
      return rates;
    });
  }
}
