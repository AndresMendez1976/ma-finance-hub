// Recurring Invoices service — CRUD, lifecycle, invoice generation from templates
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateRecurringInvoiceInput {
  tenant_id: number;
  created_by: string;
  contact_id?: number;
  customer_name: string;
  template_name: string;
  frequency: string;
  next_run_date: string;
  end_date?: string;
  tax_rate?: number;
  notes?: string;
  auto_send?: boolean;
  lines: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

export interface UpdateRecurringInvoiceInput {
  contact_id?: number;
  customer_name?: string;
  template_name?: string;
  frequency?: string;
  next_run_date?: string;
  end_date?: string;
  tax_rate?: number;
  notes?: string;
  auto_send?: boolean;
  lines?: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

@Injectable()
export class RecurringInvoicesService {
  // Compute line amounts and totals
  private computeTotals(lines: { description: string; quantity: number; unit_price: number; account_id?: number }[], taxRate: number) {
    const lineAmounts = lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      account_id: l.account_id,
      amount: Math.round(l.quantity * l.unit_price * 100) / 100,
    }));
    const subtotal = lineAmounts.reduce((s, l) => s + l.amount, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return { lineAmounts, subtotal, taxAmount, total };
  }

  // Advance next_run_date based on frequency
  advanceNextRunDate(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  // Get next invoice number for a tenant (INV-XXXX pattern)
  private async nextInvoiceNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('invoices')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('invoice_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'INV-0001';
    const num = parseInt(String(last.invoice_number).replace('INV-', ''), 10);
    return `INV-${String(num + 1).padStart(4, '0')}`;
  }

  // Create a new recurring invoice template
  async create(trx: Knex.Transaction, input: CreateRecurringInvoiceInput) {
    const taxRate = input.tax_rate ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: input.created_by })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for recurring invoice creation');

    const [recurring] = await trx('recurring_invoices')
      .insert({
        tenant_id: input.tenant_id,
        contact_id: input.contact_id ?? null,
        customer_name: input.customer_name,
        template_name: input.template_name,
        frequency: input.frequency,
        next_run_date: input.next_run_date,
        end_date: input.end_date ?? null,
        status: 'active',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: input.notes ?? null,
        auto_send: input.auto_send ?? false,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = lineAmounts.map((l, i) => ({
      recurring_invoice_id: recurring.id,
      tenant_id: input.tenant_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('recurring_invoice_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...recurring, lines: insertedLines };
  }

  // List recurring invoices with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('recurring_invoices').select('*').orderBy('created_at', 'desc');
    if (filters.status) void query.where('status', filters.status);

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

  // Get single recurring invoice with lines
  async findOne(trx: Knex.Transaction, id: number) {
    const recurring = await trx('recurring_invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!recurring) return null;
    const lines = await trx('recurring_invoice_lines')
      .where({ recurring_invoice_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];
    return { ...recurring, lines };
  }

  // Update recurring invoice template (only active/paused)
  async update(trx: Knex.Transaction, id: number, tenantId: number, input: UpdateRecurringInvoiceInput) {
    const recurring = await trx('recurring_invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!recurring) throw new NotFoundException('Recurring invoice not found');
    if (recurring.status !== 'active' && recurring.status !== 'paused') {
      throw new BadRequestException('Only active or paused recurring invoices can be edited');
    }

    const updates: Record<string, unknown> = {};
    if (input.contact_id !== undefined) updates.contact_id = input.contact_id;
    if (input.customer_name !== undefined) updates.customer_name = input.customer_name;
    if (input.template_name !== undefined) updates.template_name = input.template_name;
    if (input.frequency !== undefined) updates.frequency = input.frequency;
    if (input.next_run_date !== undefined) updates.next_run_date = input.next_run_date;
    if (input.end_date !== undefined) updates.end_date = input.end_date;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.auto_send !== undefined) updates.auto_send = input.auto_send;

    // Recalculate totals if lines or tax_rate changed
    if (input.lines || input.tax_rate !== undefined) {
      const taxRate = input.tax_rate ?? Number(recurring.tax_rate);
      if (input.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;

        // Replace lines
        await trx('recurring_invoice_lines').where({ recurring_invoice_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          recurring_invoice_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id ?? null,
          sort_order: i,
        }));
        await trx('recurring_invoice_lines').insert(lineRows);
      } else {
        // Only tax_rate changed, recalculate from existing subtotal
        const subtotal = Number(recurring.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = Math.round((subtotal + taxAmount) * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('recurring_invoices').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Delete recurring invoice
  async delete(trx: Knex.Transaction, id: number) {
    const recurring = await trx('recurring_invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!recurring) throw new NotFoundException('Recurring invoice not found');

    await trx('recurring_invoice_lines').where({ recurring_invoice_id: id }).del();
    await trx('recurring_invoices').where({ id }).del();
    return { deleted: true };
  }

  // Pause recurring invoice
  async pause(trx: Knex.Transaction, id: number) {
    const recurring = await trx('recurring_invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!recurring) throw new NotFoundException('Recurring invoice not found');
    if (recurring.status !== 'active') throw new BadRequestException('Only active recurring invoices can be paused');

    const [updated] = await trx('recurring_invoices')
      .where({ id })
      .update({ status: 'paused' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Resume recurring invoice
  async resume(trx: Knex.Transaction, id: number) {
    const recurring = await trx('recurring_invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!recurring) throw new NotFoundException('Recurring invoice not found');
    if (recurring.status !== 'paused') throw new BadRequestException('Only paused recurring invoices can be resumed');

    const [updated] = await trx('recurring_invoices')
      .where({ id })
      .update({ status: 'active' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Manually generate an invoice from a recurring template
  async generateNow(trx: Knex.Transaction, tenantId: number, id: number, createdBy: string) {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Recurring invoice not found');
    const recurring = result as Record<string, unknown> & { lines: Record<string, unknown>[] };

    if (recurring.status !== 'active' && recurring.status !== 'paused') {
      throw new BadRequestException('Cannot generate invoice from inactive recurring template');
    }

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for invoice generation');

    const invoiceNumber = await this.nextInvoiceNumber(trx, tenantId);
    const invoiceStatus = recurring.auto_send ? 'sent' : 'draft';

    const [invoice] = await trx('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        customer_name: recurring.customer_name,
        customer_email: null,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: invoiceStatus,
        subtotal: recurring.subtotal,
        tax_rate: recurring.tax_rate,
        tax_amount: recurring.tax_amount,
        total: recurring.total,
        notes: recurring.notes ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    // Copy lines from template
    const lineRows = recurring.lines.map((l, i) => ({
      invoice_id: invoice.id,
      tenant_id: tenantId,
      description: String(l.description),
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      amount: Number(l.amount),
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('invoice_lines').insert(lineRows).returning('*') as Record<string, unknown>[];

    // Advance next_run_date
    const currentRunDate = new Date(String(recurring.next_run_date));
    const nextDate = this.advanceNextRunDate(currentRunDate, String(recurring.frequency));
    await trx('recurring_invoices')
      .where({ id })
      .update({ next_run_date: nextDate.toISOString().split('T')[0] });

    return { ...invoice, lines: insertedLines };
  }

  // Get recurring invoices that are due (next_run_date <= today and status='active')
  async getDueRecurring(trx: Knex.Transaction) {
    const today = new Date().toISOString().split('T')[0];
    const rows = await trx('recurring_invoices')
      .where('next_run_date', '<=', today)
      .where('status', 'active')
      .select('*') as Record<string, unknown>[];
    return rows;
  }
}
