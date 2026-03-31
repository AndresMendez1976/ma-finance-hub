// Portal controller — public routes (no JWT) for client portal access
import { Controller, Get, Param, NotFoundException, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { KNEX_CONNECTION } from '../database';
import { Knex } from 'knex';

@ApiTags('Client Portal')
@Controller('portal')
export class PortalController {
  constructor(
    private readonly service: PortalService,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}

  // Helper to run portal operations in a transaction with tenant context
  private async withPortalContext<T>(token: string, fn: (trx: Knex.Transaction, tenantId: number, contactId: number) => Promise<T>): Promise<T> {
    return this.knex.transaction(async (trx) => {
      const { tenant_id, contact_id } = await this.service.validateToken(trx, token);
      // Set RLS context for tenant isolation
      await trx.raw('SET LOCAL app.current_tenant_id = ?', [String(tenant_id)]);
      return fn(trx, tenant_id, contact_id);
    });
  }

  // List invoices for the portal contact
  @Get(':token/invoices')
  async getInvoices(@Param('token') token: string) {
    return this.withPortalContext(token, (trx, tenantId, contactId) =>
      this.service.getPortalInvoices(trx, tenantId, contactId),
    );
  }

  // Get single invoice with lines
  @Get(':token/invoices/:id')
  async getInvoice(@Param('token') token: string, @Param('id') id: string) {
    const invoiceId = parseInt(id, 10);
    if (isNaN(invoiceId)) throw new NotFoundException('Invoice not found');
    return this.withPortalContext(token, (trx, tenantId, contactId) =>
      this.service.getPortalInvoice(trx, tenantId, contactId, invoiceId),
    );
  }

  // Get invoice PDF
  @Get(':token/invoices/:id/pdf')
  async getInvoicePdf(@Param('token') token: string, @Param('id') id: string) {
    const invoiceId = parseInt(id, 10);
    if (isNaN(invoiceId)) throw new NotFoundException('Invoice not found');
    return this.withPortalContext(token, async (trx, tenantId, contactId) => {
      // Verify the invoice belongs to this contact
      const invoice = await this.service.getPortalInvoice(trx, tenantId, contactId, invoiceId) as Record<string, unknown> & { lines: Record<string, unknown>[] };
      return { invoice_id: invoice.id, message: 'PDF generation available via invoice endpoint' };
    });
  }

  // List estimates for the portal contact
  @Get(':token/estimates')
  async getEstimates(@Param('token') token: string) {
    return this.withPortalContext(token, (trx, tenantId, contactId) =>
      this.service.getPortalEstimates(trx, tenantId, contactId),
    );
  }

  // Accept an estimate
  @Get(':token/estimates/:id/accept')
  async acceptEstimate(@Param('token') token: string, @Param('id') id: string) {
    const estimateId = parseInt(id, 10);
    if (isNaN(estimateId)) throw new NotFoundException('Estimate not found');
    return this.withPortalContext(token, (trx, tenantId, contactId) =>
      this.service.acceptEstimate(trx, tenantId, contactId, estimateId),
    );
  }

  // Get account statement
  @Get(':token/statements')
  async getStatement(@Param('token') token: string) {
    return this.withPortalContext(token, (trx, tenantId, contactId) =>
      this.service.getStatement(trx, tenantId, contactId),
    );
  }
}
