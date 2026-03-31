// Contacts service — CRUD, search, financial summary
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ContactsService {
  // Create a new contact
  async create(trx: Knex.Transaction, tenantId: number, data: {
    type: string; company_name?: string; first_name: string; last_name?: string;
    email?: string; phone?: string; address_line1?: string; address_line2?: string;
    city?: string; state?: string; zip?: string; country?: string; tax_id?: string;
    notes?: string; default_revenue_account_id?: number; default_expense_account_id?: number;
  }) {
    const [contact] = await trx('contacts').insert({
      tenant_id: tenantId,
      type: data.type,
      company_name: data.company_name ?? null,
      first_name: data.first_name,
      last_name: data.last_name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address_line1: data.address_line1 ?? null,
      address_line2: data.address_line2 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip: data.zip ?? null,
      country: data.country ?? 'US',
      tax_id: data.tax_id ?? null,
      notes: data.notes ?? null,
      status: 'active',
      default_revenue_account_id: data.default_revenue_account_id ?? null,
      default_expense_account_id: data.default_expense_account_id ?? null,
    }).returning('*') as Record<string, unknown>[];
    return contact;
  }

  // List contacts with optional filters and search
  async findAll(trx: Knex.Transaction, filters: {
    type?: string; status?: string; search?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('contacts').select('*').orderBy('created_at', 'desc');
    if (filters.type) void query.where('type', filters.type);
    if (filters.status) void query.where('status', filters.status);
    if (filters.search) {
      const term = `%${filters.search}%`;
      void query.where(function () {
        void this.whereRaw('first_name ILIKE ?', [term])
          .orWhereRaw('last_name ILIKE ?', [term])
          .orWhereRaw('company_name ILIKE ?', [term])
          .orWhereRaw('email ILIKE ?', [term]);
      });
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  // Get single contact
  async findOne(trx: Knex.Transaction, id: number) {
    const contact = await trx('contacts').where({ id }).first() as Record<string, unknown> | undefined;
    if (!contact) return null;
    return contact;
  }

  // Get contact with financial summary
  async findOneWithSummary(trx: Knex.Transaction, id: number) {
    const contact = await trx('contacts').where({ id }).first() as Record<string, unknown> | undefined;
    if (!contact) return null;

    const contactType = String(contact.type);
    let summary: Record<string, unknown> = {};

    // Customer summary: invoices
    if (contactType === 'customer' || contactType === 'both') {
      const invoiceSummary = await trx('invoices')
        .where({ contact_id: id })
        .select(
          trx.raw('COALESCE(SUM(total), 0) as total_invoiced'),
          trx.raw('COALESCE(SUM(paid_amount), 0) as total_paid'),
        )
        .first() as Record<string, unknown> | undefined;

      const totalInvoiced = Number(invoiceSummary?.total_invoiced ?? 0);
      const totalPaid = Number(invoiceSummary?.total_paid ?? 0);
      summary = {
        ...summary,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        balance: Math.round((totalInvoiced - totalPaid) * 100) / 100,
      };
    }

    // Vendor summary: expenses
    if (contactType === 'vendor' || contactType === 'both') {
      const expenseSummary = await trx('expenses')
        .where({ contact_id: id })
        .select(
          trx.raw('COALESCE(SUM(amount), 0) as total_expenses'),
        )
        .first() as Record<string, unknown> | undefined;

      summary = {
        ...summary,
        total_expenses: Number(expenseSummary?.total_expenses ?? 0),
      };
    }

    return { ...contact, summary };
  }

  // Update contact fields
  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const contact = await trx('contacts').where({ id }).first() as Record<string, unknown> | undefined;
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.status !== 'active') throw new BadRequestException('Only active contacts can be updated');

    const allowedFields = [
      'type', 'company_name', 'first_name', 'last_name', 'email', 'phone',
      'address_line1', 'address_line2', 'city', 'state', 'zip', 'country',
      'tax_id', 'notes', 'default_revenue_account_id', 'default_expense_account_id',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    if (Object.keys(updates).length > 0) {
      await trx('contacts').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Import contacts from CSV string
  async importCsv(trx: Knex.Transaction, tenantId: number, csvContent: string) {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) throw new BadRequestException('CSV must contain a header row and at least one data row');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataLines = lines.slice(1);
    const errors: string[] = [];
    let imported = 0;
    const contacts: Record<string, unknown>[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const parts = dataLines[i].split(',').map((p) => p.trim());
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = parts[j] ?? '';
      }

      if (!row.type || !row.first_name) {
        errors.push(`Row ${String(i + 2)}: Missing required fields (type, first_name)`);
        continue;
      }

      if (!['customer', 'vendor', 'both'].includes(row.type)) {
        errors.push(`Row ${String(i + 2)}: Invalid type '${row.type}'`);
        continue;
      }

      const [contact] = await trx('contacts').insert({
        tenant_id: tenantId,
        type: row.type,
        company_name: row.company_name || null,
        first_name: row.first_name,
        last_name: row.last_name || null,
        email: row.email || null,
        phone: row.phone || null,
        address_line1: row.address_line1 || null,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || null,
        country: row.country || 'US',
        tax_id: row.tax_id || null,
        notes: row.notes || null,
        status: 'active',
      }).returning('*') as Record<string, unknown>[];

      contacts.push(contact);
      imported++;
    }

    return { imported, errors, contacts };
  }

  // Export all contacts as CSV string
  async exportCsv(trx: Knex.Transaction): Promise<string> {
    const contacts = await trx('contacts')
      .select('*')
      .orderBy('created_at', 'desc') as Record<string, unknown>[];

    const headers = ['id', 'type', 'company_name', 'first_name', 'last_name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'country', 'tax_id', 'status', 'notes'];
    const csvLines = [headers.join(',')];

    for (const contact of contacts) {
      const row = headers.map((h) => {
        const val = contact[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(row.join(','));
    }

    return csvLines.join('\n');
  }

  // Soft delete — set status to inactive
  async softDelete(trx: Knex.Transaction, id: number) {
    const contact = await trx('contacts').where({ id }).first() as Record<string, unknown> | undefined;
    if (!contact) throw new NotFoundException('Contact not found');

    const [updated] = await trx('contacts')
      .where({ id })
      .update({ status: 'inactive' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }
}
