// Invoices controller — CRUD, lifecycle, PDF generation
import { Controller, Get, Post, Put, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class InvoicesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: InvoicesService,
    private readonly audit: AuditService,
  ) {}

  // List invoices with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Batch create multiple invoices
  @Post('batch')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create multiple invoices at once' })
  async batchCreate(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { invoices: CreateInvoiceDto[] },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const results: Record<string, unknown>[] = [];
      for (const invoiceDto of dto.invoices) {
        const invoice = await this.service.create(trx, {
          tenant_id: p.tenantId,
          created_by: p.sub,
          ...invoiceDto,
        }) as Record<string, unknown>;
        results.push(invoice);
      }
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'batch_create',
        entity: 'invoices',
        entity_id: 'batch',
        metadata: { count: String(results.length) },
      });
      return results;
    });
  }

  // Export all invoices as CSV
  @Get('export-csv')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Export all invoices as CSV' })
  async exportCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    const csv = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.exportCsv(trx),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csv);
  }

  // Get single invoice with lines
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.findOne(trx, id);
      if (!invoice) throw new NotFoundException();
      return invoice;
    });
  }

  // Create new draft invoice
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.create(trx, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'invoices',
        entity_id: String(invoice.id),
        metadata: { invoice_number: String(invoice.invoice_number) },
      });
      return invoice;
    });
  }

  // Update draft invoice
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'invoices',
        entity_id: String(id),
      });
      return invoice;
    });
  }

  // Send invoice (draft → sent)
  @Post(':id/send')
  @Roles('owner', 'admin', 'manager')
  async sendInvoice(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.send(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'send',
        entity: 'invoices',
        entity_id: String(id),
        metadata: { invoice_number: invoice.invoice_number },
      });
      return invoice;
    });
  }

  // Mark invoice as paid (creates journal entry)
  @Post(':id/pay')
  @Roles('owner', 'admin', 'manager')
  async payInvoice(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.pay(trx, p.tenantId, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'pay',
        entity: 'invoices',
        entity_id: String(id),
        metadata: { paid_amount: dto.paid_amount, paid_date: dto.paid_date, journal_entry_id: invoice.journal_entry_id },
      });
      return invoice;
    });
  }

  // Void invoice (creates reversal if journal entry exists)
  @Post(':id/void')
  @Roles('owner', 'admin')
  async voidInvoice(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const invoice = await this.service.voidInvoice(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'void',
        entity: 'invoices',
        entity_id: String(id),
        metadata: { invoice_number: invoice.invoice_number },
      });
      return invoice;
    });
  }

  // Generate and download PDF
  @Get(':id/pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async downloadPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.generatePdf(trx, id),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'download_pdf',
        entity: 'invoices',
        entity_id: String(id),
      }),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }
}
