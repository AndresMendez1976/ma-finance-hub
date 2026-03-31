// Portal service — token management, portal data access for clients
import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Knex } from 'knex';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class PortalService {
  // Hash a token for secure storage
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Generate a portal access token for a contact
  async generateToken(trx: Knex.Transaction, tenantId: number, contactId: number) {
    const contact = await trx('contacts').where({ id: contactId }).first() as Record<string, unknown> | undefined;
    if (!contact) throw new NotFoundException('Contact not found');

    const token = randomUUID();
    const tokenHash = this.hashToken(token);

    // Deactivate any existing tokens for this contact
    await trx('client_portal_tokens')
      .where({ contact_id: contactId })
      .update({ is_active: false });

    // Create new token with 90-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await trx('client_portal_tokens').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      token_hash: tokenHash,
      is_active: true,
      expires_at: expiresAt.toISOString(),
    });

    return {
      token,
      url: `/portal/${token}`,
      expires_at: expiresAt.toISOString(),
    };
  }

  // Validate a portal token and return tenant_id + contact_id
  async validateToken(trx: Knex.Transaction, token: string): Promise<{ tenant_id: number; contact_id: number }> {
    const tokenHash = this.hashToken(token);

    const record = await trx('client_portal_tokens')
      .where({ token_hash: tokenHash, is_active: true })
      .first() as Record<string, unknown> | undefined;

    if (!record) throw new UnauthorizedException('Invalid or expired portal token');

    // Check expiration
    const expiresAt = new Date(String(record.expires_at));
    if (expiresAt < new Date()) {
      // Deactivate expired token
      await trx('client_portal_tokens').where({ id: record.id }).update({ is_active: false });
      throw new UnauthorizedException('Portal token has expired');
    }

    return {
      tenant_id: Number(record.tenant_id),
      contact_id: Number(record.contact_id),
    };
  }

  // Get invoices for a contact (exclude drafts)
  async getPortalInvoices(trx: Knex.Transaction, tenantId: number, contactId: number) {
    const invoices = await trx('invoices')
      .where({ tenant_id: tenantId, contact_id: contactId })
      .whereNot({ status: 'draft' })
      .select('id', 'invoice_number', 'issue_date', 'due_date', 'status', 'subtotal', 'tax_amount', 'total', 'paid_amount', 'paid_date')
      .orderBy('issue_date', 'desc') as Record<string, unknown>[];
    return invoices;
  }

  // Get single invoice with lines for portal
  async getPortalInvoice(trx: Knex.Transaction, tenantId: number, contactId: number, invoiceId: number) {
    const invoice = await trx('invoices')
      .where({ id: invoiceId, tenant_id: tenantId, contact_id: contactId })
      .whereNot({ status: 'draft' })
      .first() as Record<string, unknown> | undefined;

    if (!invoice) throw new NotFoundException('Invoice not found');

    const lines = await trx('invoice_lines')
      .where({ invoice_id: invoiceId })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    return { ...invoice, lines };
  }

  // Get estimates for a contact
  async getPortalEstimates(trx: Knex.Transaction, tenantId: number, contactId: number) {
    const estimates = await trx('estimates')
      .where({ tenant_id: tenantId, contact_id: contactId })
      .whereIn('status', ['sent', 'accepted', 'rejected'])
      .select('id', 'estimate_number', 'issue_date', 'expiration_date', 'status', 'subtotal', 'tax_amount', 'total')
      .orderBy('issue_date', 'desc') as Record<string, unknown>[];
    return estimates;
  }

  // Accept an estimate from the portal
  async acceptEstimate(trx: Knex.Transaction, tenantId: number, contactId: number, estimateId: number) {
    const estimate = await trx('estimates')
      .where({ id: estimateId, tenant_id: tenantId, contact_id: contactId })
      .first() as Record<string, unknown> | undefined;

    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'sent') throw new BadRequestException(`Cannot accept estimate with status '${String(estimate.status)}'`);

    const [updated] = await trx('estimates')
      .where({ id: estimateId })
      .update({ status: 'accepted' })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Get account statement for a contact (all invoices + payments)
  async getStatement(trx: Knex.Transaction, tenantId: number, contactId: number) {
    const contact = await trx('contacts').where({ id: contactId }).first() as Record<string, unknown> | undefined;
    if (!contact) throw new NotFoundException('Contact not found');

    const invoices = await trx('invoices')
      .where({ tenant_id: tenantId, contact_id: contactId })
      .whereNot({ status: 'draft' })
      .whereNot({ status: 'voided' })
      .select('id', 'invoice_number', 'issue_date', 'due_date', 'status', 'total', 'paid_amount')
      .orderBy('issue_date', 'asc') as Record<string, unknown>[];

    let totalInvoiced = 0;
    let totalPaid = 0;

    const statementLines = invoices.map((inv) => {
      const total = Number(inv.total) || 0;
      const paid = Number(inv.paid_amount) || 0;
      totalInvoiced += total;
      totalPaid += paid;
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        total,
        paid: paid,
        balance: Math.round((total - paid) * 100) / 100,
      };
    });

    return {
      contact: {
        id: contact.id,
        company_name: contact.company_name,
        first_name: contact.first_name,
        last_name: contact.last_name,
      },
      lines: statementLines,
      summary: {
        total_invoiced: Math.round(totalInvoiced * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        balance_due: Math.round((totalInvoiced - totalPaid) * 100) / 100,
      },
    };
  }

  // Check if a contact has an active portal
  async getPortalStatus(trx: Knex.Transaction, contactId: number) {
    const token = await trx('client_portal_tokens')
      .where({ contact_id: contactId, is_active: true })
      .first() as Record<string, unknown> | undefined;

    if (!token) return { active: false, expires_at: null };

    const expiresAt = new Date(String(token.expires_at));
    if (expiresAt < new Date()) {
      return { active: false, expires_at: null, expired: true };
    }

    return {
      active: true,
      expires_at: token.expires_at,
      created_at: token.created_at,
    };
  }
}
