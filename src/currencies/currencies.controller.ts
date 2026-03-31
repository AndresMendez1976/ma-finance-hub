// Currencies controller — currencies and exchange rates
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { CurrenciesService } from './currencies.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@ApiTags('Currencies')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class CurrenciesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: CurrenciesService,
    private readonly audit: AuditService,
  ) {}

  // List all active currencies (any role)
  @Get('currencies')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAllCurrencies(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getAllCurrencies(trx),
    );
  }

  // Create exchange rate
  @Post('exchange-rates')
  @Roles('owner', 'admin')
  async createExchangeRate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.createExchangeRate(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'exchange_rates',
        entity_id: String(rate.id),
        metadata: { from: dto.from_currency, to: dto.to_currency, rate: String(dto.rate) },
      });
      return rate;
    });
  }

  // List exchange rates
  @Get('exchange-rates')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'from_currency', required: false })
  @ApiQuery({ name: 'to_currency', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllExchangeRates(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from_currency') from_currency?: string,
    @Query('to_currency') to_currency?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllExchangeRates(trx, {
        from_currency,
        to_currency,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get latest exchange rate
  @Get('exchange-rates/latest')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getLatestRate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getLatestRate(trx, from, to),
    );
  }

  // Update exchange rate
  @Put('exchange-rates/:id')
  @Roles('owner', 'admin')
  async updateExchangeRate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rate = await this.service.updateExchangeRate(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'exchange_rates',
        entity_id: String(id),
      });
      return rate;
    });
  }

  // Delete exchange rate
  @Delete('exchange-rates/:id')
  @Roles('owner', 'admin')
  async deleteExchangeRate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteExchangeRate(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'exchange_rates',
        entity_id: String(id),
      });
      return result;
    });
  }
}
