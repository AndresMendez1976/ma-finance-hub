// Recurring Invoices controller — CRUD, lifecycle, manual generation
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { CreateRecurringInvoiceDto } from './dto/create-recurring-invoice.dto';

@ApiTags('Recurring Invoices')
@ApiBearerAuth()
@Controller('recurring-invoices')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class RecurringInvoicesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: RecurringInvoicesService,
    private readonly audit: AuditService,
  ) {}

  // Create recurring invoice template
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateRecurringInvoiceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const recurring = await this.service.create(trx, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'recurring_invoices',
        entity_id: String(recurring.id),
        metadata: { template_name: dto.template_name },
      });
      return recurring;
    });
  }

  // List recurring invoices
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // List recurring invoices due today
  @Get('due')
  @Roles('owner', 'admin', 'manager')
  async getDue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getDueRecurring(trx),
    );
  }

  // Get single recurring invoice with lines
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const recurring = await this.service.findOne(trx, id);
      if (!recurring) throw new NotFoundException();
      return recurring;
    });
  }

  // Update recurring invoice template
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRecurringInvoiceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const recurring = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'recurring_invoices',
        entity_id: String(id),
      });
      return recurring;
    });
  }

  // Pause recurring invoice
  @Post(':id/pause')
  @Roles('owner', 'admin', 'manager')
  async pause(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const recurring = await this.service.pause(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'pause',
        entity: 'recurring_invoices',
        entity_id: String(id),
      });
      return recurring;
    });
  }

  // Resume recurring invoice
  @Post(':id/resume')
  @Roles('owner', 'admin', 'manager')
  async resume(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const recurring = await this.service.resume(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'resume',
        entity: 'recurring_invoices',
        entity_id: String(id),
      });
      return recurring;
    });
  }

  // Manually generate invoice from recurring template
  @Post(':id/generate-now')
  @Roles('owner', 'admin', 'manager')
  async generateNow(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.generateNow(trx, p.tenantId, id, p.sub) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'generate_invoice',
        entity: 'recurring_invoices',
        entity_id: String(id),
        metadata: { invoice_id: String(invoice.id), invoice_number: String(invoice.invoice_number) },
      });
      return invoice;
    });
  }

  // Delete recurring invoice
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
        entity: 'recurring_invoices',
        entity_id: String(id),
      });
      return result;
    });
  }
}
