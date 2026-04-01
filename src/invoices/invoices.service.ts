// Invoices service — CRUD, lifecycle transitions, journal entry creation on payment, Stripe payment links
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { SettingsService } from '../settings/settings.service';

export interface CreateInvoiceInput {
  tenant_id: number;
  created_by: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  issue_date: string;
  due_date: string;
  tax_rate?: number;
  notes?: string;
  lines: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

export interface UpdateInvoiceInput {
  customer_name?: string;
  customer_email?: string;
  customer_address?: string;
  issue_date?: string;
  due_date?: string;
  tax_rate?: number;
  notes?: string;
  lines?: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

export interface PayInvoiceInput {
  paid_date: string;
  paid_amount: number;
  fiscal_period_id?: number;
  cash_account_id?: number;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly settingsService: SettingsService) {}
  // Generate next invoice number for a tenant
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

  // Create a new draft invoice
  async create(trx: Knex.Transaction, input: CreateInvoiceInput) {
    const taxRate = input.tax_rate ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);
    const invoiceNumber = await this.nextInvoiceNumber(trx, input.tenant_id);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: input.created_by })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for invoice creation');

    const [invoice] = await trx('invoices')
      .insert({
        tenant_id: input.tenant_id,
        invoice_number: invoiceNumber,
        customer_name: input.customer_name,
        customer_email: input.customer_email ?? null,
        customer_address: input.customer_address ?? null,
        issue_date: input.issue_date,
        due_date: input.due_date,
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: input.notes ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = lineAmounts.map((l, i) => ({
      invoice_id: invoice.id,
      tenant_id: input.tenant_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('invoice_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...invoice, lines: insertedLines };
  }

  // List invoices with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('invoices').select('*').orderBy('created_at', 'desc');
    if (filters.status) void query.where('status', filters.status);
    if (filters.from) void query.where('issue_date', '>=', filters.from);
    if (filters.to) void query.where('issue_date', '<=', filters.to);

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

  // Get single invoice with lines
  async findOne(trx: Knex.Transaction, id: number) {
    const invoice = await trx('invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invoice) return null;
    const lines = await trx('invoice_lines')
      .where({ invoice_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];
    return { ...invoice, lines };
  }

  // Update a draft invoice
  async update(trx: Knex.Transaction, id: number, tenantId: number, input: UpdateInvoiceInput) {
    const invoice = await trx('invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'draft') throw new BadRequestException('Only draft invoices can be edited');

    const updates: Record<string, unknown> = {};
    if (input.customer_name !== undefined) updates.customer_name = input.customer_name;
    if (input.customer_email !== undefined) updates.customer_email = input.customer_email;
    if (input.customer_address !== undefined) updates.customer_address = input.customer_address;
    if (input.issue_date !== undefined) updates.issue_date = input.issue_date;
    if (input.due_date !== undefined) updates.due_date = input.due_date;
    if (input.notes !== undefined) updates.notes = input.notes;

    // Recalculate totals if lines or tax_rate changed
    if (input.lines || input.tax_rate !== undefined) {
      const taxRate = input.tax_rate ?? Number(invoice.tax_rate);
      if (input.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;

        // Replace lines
        await trx('invoice_lines').where({ invoice_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          invoice_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id ?? null,
          sort_order: i,
        }));
        await trx('invoice_lines').insert(lineRows);
      } else {
        // Only tax_rate changed, recalculate from existing subtotal
        const subtotal = Number(invoice.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = Math.round((subtotal + taxAmount) * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('invoices').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Send invoice (draft → sent)
  async send(trx: Knex.Transaction, id: number) {
    const invoice = await trx('invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'draft') throw new BadRequestException(`Cannot send invoice with status '${String(invoice.status)}'`);

    const [updated] = await trx('invoices')
      .where({ id })
      .update({ status: 'sent' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Pay invoice — creates a journal entry (Debit Cash, Credit Revenue/AR)
  async pay(trx: Knex.Transaction, tenantId: number, id: number, input: PayInvoiceInput) {
    const invoice = await trx('invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'sent' && invoice.status !== 'draft') {
      throw new BadRequestException(`Cannot pay invoice with status '${String(invoice.status)}'`);
    }

    const lines = await trx('invoice_lines')
      .where({ invoice_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    // Determine cash account: use provided or default to account_code '1000'
    let cashAccountId = input.cash_account_id;
    if (!cashAccountId) {
      const cashAccount = await trx('accounts')
        .where({ account_code: '1000' })
        .select('id')
        .first() as Record<string, unknown> | undefined;
      if (cashAccount) cashAccountId = Number(cashAccount.id);
    }

    let journalEntryId: number | null = null;

    // Create journal entry if we have a fiscal period and cash account
    if (input.fiscal_period_id && cashAccountId) {
      const period = await trx('fiscal_periods').where({ id: input.fiscal_period_id }).first() as Record<string, unknown> | undefined;
      if (!period || period.status !== 'open') throw new BadRequestException('Fiscal period not found or not open');

      // Get next entry number
      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: input.fiscal_period_id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      // Create journal entry
      const [entry] = await trx('journal_entries')
        .insert({
          tenant_id: tenantId,
          fiscal_period_id: input.fiscal_period_id,
          entry_number: entryNumber,
          reference: `PAY-${String(invoice.invoice_number)}`,
          memo: `Payment for invoice ${String(invoice.invoice_number)} - ${String(invoice.customer_name)}`,
          status: 'posted',
          posted_at: trx.fn.now(),
        })
        .returning('*') as Record<string, unknown>[];

      journalEntryId = Number(entry.id);

      // Debit Cash for total paid
      const journalLines: Record<string, unknown>[] = [{
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: cashAccountId,
        debit: input.paid_amount,
        credit: 0,
        description: `Payment received - ${String(invoice.invoice_number)}`,
      }];

      // Credit revenue accounts from invoice lines, or AR (1100) as fallback
      const totalToCredit = input.paid_amount;
      const lineTotal = lines.reduce((s, l) => s + Number(l.amount), 0);

      if (lines.some((l) => l.account_id)) {
        // Distribute credit proportionally to line accounts
        let credited = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const accountId = line.account_id;
          if (!accountId) continue;
          const proportion = Number(line.amount) / lineTotal;
          const creditAmt = i === lines.length - 1
            ? Math.round((totalToCredit - credited) * 100) / 100
            : Math.round(totalToCredit * proportion * 100) / 100;
          credited += creditAmt;
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: entry.id,
            account_id: accountId,
            debit: 0,
            credit: creditAmt,
            description: String(line.description),
          });
        }
        // If some lines had no account_id, credit remainder to AR
        if (credited < totalToCredit) {
          const arAccount = await trx('accounts').where({ account_code: '1100' }).select('id').first() as Record<string, unknown> | undefined;
          if (arAccount) {
            journalLines.push({
              tenant_id: tenantId,
              journal_entry_id: entry.id,
              account_id: arAccount.id,
              debit: 0,
              credit: Math.round((totalToCredit - credited) * 100) / 100,
              description: `Accounts Receivable - ${String(invoice.invoice_number)}`,
            });
          }
        }
      } else {
        // No account_id on lines — credit AR
        const arAccount = await trx('accounts').where({ account_code: '1100' }).select('id').first() as Record<string, unknown> | undefined;
        const creditAccountId = arAccount ? Number(arAccount.id) : cashAccountId;
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: creditAccountId,
          debit: 0,
          credit: totalToCredit,
          description: `Revenue - ${String(invoice.invoice_number)}`,
        });
      }

      await trx('journal_lines').insert(journalLines);
    }

    // Update invoice
    const [updated] = await trx('invoices')
      .where({ id })
      .update({
        status: 'paid',
        paid_date: input.paid_date,
        paid_amount: input.paid_amount,
        journal_entry_id: journalEntryId,
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Void invoice — creates reversal journal entry if one exists
  async voidInvoice(trx: Knex.Transaction, tenantId: number, id: number) {
    const invoice = await trx('invoices').where({ id }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'voided') throw new BadRequestException('Invoice is already voided');

    // If invoice has a journal entry, void it
    if (invoice.journal_entry_id) {
      const jeId = Number(invoice.journal_entry_id);
      const entry = await trx('journal_entries').where({ id: jeId }).first() as Record<string, unknown> | undefined;

      if (entry && entry.status === 'posted') {
        // Create reversal
        const originalLines = await trx('journal_lines')
          .where({ journal_entry_id: jeId })
          .select('*') as Record<string, unknown>[];

        const lastEntry = await trx('journal_entries')
          .where({ tenant_id: tenantId, fiscal_period_id: entry.fiscal_period_id })
          .max('entry_number as max_num')
          .first() as Record<string, unknown> | undefined;
        const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

        const [reversal] = await trx('journal_entries')
          .insert({
            tenant_id: tenantId,
            fiscal_period_id: entry.fiscal_period_id,
            entry_number: entryNumber,
            reference: `VOID-${String(invoice.invoice_number)}`,
            memo: `Reversal for voided invoice ${String(invoice.invoice_number)}`,
            status: 'posted',
            posted_at: trx.fn.now(),
          })
          .returning('*') as Record<string, unknown>[];

        const reversalLines = originalLines.map((l) => ({
          tenant_id: tenantId,
          journal_entry_id: reversal.id,
          account_id: l.account_id,
          debit: Number(l.credit),
          credit: Number(l.debit),
          description: `Reversal: ${String(l.description || '')}`,
        }));

        await trx('journal_lines').insert(reversalLines);
        await trx('journal_entries').where({ id: jeId }).update({ status: 'voided' });
      }
    }

    const [updated] = await trx('invoices')
      .where({ id })
      .update({ status: 'voided' })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Export all invoices as CSV string
  async exportCsv(trx: Knex.Transaction): Promise<string> {
    const invoices = await trx('invoices')
      .select('*')
      .orderBy('created_at', 'desc') as Record<string, unknown>[];

    const headers = ['id', 'invoice_number', 'customer_name', 'customer_email', 'issue_date', 'due_date', 'status', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'paid_amount', 'paid_date', 'notes'];
    const lines = [headers.join(',')];

    for (const inv of invoices) {
      const row = headers.map((h) => {
        const val = inv[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV values containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  // Generate PDF as a Buffer
  async generatePdf(trx: Knex.Transaction, id: number): Promise<{ buffer: Buffer; filename: string }> {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Invoice not found');
    // Cast to Record for uniform property access in PDF rendering
    const invoice = result as unknown as Record<string, unknown> & { lines: Record<string, unknown>[] };

    // Dynamic import to avoid issues in test environments
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        filename: `invoice-${String(invoice.invoice_number)}.pdf`,
      }));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('MA Finance Hub', 50, 50);
      doc.fontSize(9).font('Helvetica').text('Powered by MAiSHQ', 50, 75);
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(11).font('Helvetica').text(`#${String(invoice.invoice_number)}`, 400, 80, { align: 'right' });

      // Status badge
      doc.fontSize(10).text(`Status: ${String(invoice.status).toUpperCase()}`, 400, 95, { align: 'right' });

      doc.moveTo(50, 115).lineTo(545, 115).stroke('#E8DCC8');

      // Customer info
      let y = 130;
      doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, y);
      y += 15;
      doc.font('Helvetica').text(String(invoice.customer_name), 50, y);
      if (invoice.customer_email) { y += 13; doc.text(String(invoice.customer_email), 50, y); }
      if (invoice.customer_address) { y += 13; doc.text(String(invoice.customer_address), 50, y, { width: 200 }); }

      // Dates
      doc.font('Helvetica-Bold').text('Issue Date:', 350, 130);
      doc.font('Helvetica').text(String(invoice.issue_date), 430, 130);
      doc.font('Helvetica-Bold').text('Due Date:', 350, 145);
      doc.font('Helvetica').text(String(invoice.due_date), 430, 145);
      if (invoice.paid_date) {
        doc.font('Helvetica-Bold').text('Paid Date:', 350, 160);
        doc.font('Helvetica').text(String(invoice.paid_date), 430, 160);
      }

      // Line items table
      y = Math.max(y + 30, 200);
      doc.moveTo(50, y).lineTo(545, y).stroke('#2D6A4F');
      y += 5;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Description', 50, y, { width: 230 });
      doc.text('Qty', 290, y, { width: 50, align: 'right' });
      doc.text('Unit Price', 350, y, { width: 80, align: 'right' });
      doc.text('Amount', 440, y, { width: 100, align: 'right' });
      y += 15;
      doc.moveTo(50, y).lineTo(545, y).stroke('#E8DCC8');

      doc.font('Helvetica').fontSize(9);
      const lines = invoice.lines;
      for (const line of lines) {
        y += 5;
        if (y > 720) { doc.addPage(); y = 50; }
        doc.text(String(line.description), 50, y, { width: 230 });
        doc.text(Number(line.quantity).toFixed(2), 290, y, { width: 50, align: 'right' });
        doc.text(Number(line.unit_price).toFixed(2), 350, y, { width: 80, align: 'right' });
        doc.text(Number(line.amount).toFixed(2), 440, y, { width: 100, align: 'right' });
        y += 15;
      }

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(545, y).stroke('#E8DCC8');
      y += 8;
      doc.font('Helvetica').text('Subtotal:', 350, y, { width: 80, align: 'right' });
      doc.text(Number(invoice.subtotal).toFixed(2), 440, y, { width: 100, align: 'right' });
      y += 15;
      if (Number(invoice.tax_rate) > 0) {
        doc.text(`Tax (${Number(invoice.tax_rate)}%):`, 350, y, { width: 80, align: 'right' });
        doc.text(Number(invoice.tax_amount).toFixed(2), 440, y, { width: 100, align: 'right' });
        y += 15;
      }
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total:', 350, y, { width: 80, align: 'right' });
      doc.text(`$${Number(invoice.total).toFixed(2)}`, 440, y, { width: 100, align: 'right' });

      if (Number(invoice.paid_amount) > 0) {
        y += 18;
        doc.font('Helvetica').fontSize(9).text('Amount Paid:', 350, y, { width: 80, align: 'right' });
        doc.text(`$${Number(invoice.paid_amount).toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      }

      // Notes
      if (invoice.notes) {
        y += 30;
        doc.font('Helvetica-Bold').fontSize(9).text('Notes:', 50, y);
        y += 13;
        doc.font('Helvetica').text(String(invoice.notes), 50, y, { width: 495 });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#8B7355')
        .text('MA Finance Hub — Powered by MAiSHQ', 50, 770, { align: 'center', width: 495 });

      doc.end();
    });
  }

  // ── Stripe Payment Link ──

  async generatePaymentLink(
    trx: Knex.Transaction,
    tenantId: number,
    invoiceId: number,
  ): Promise<{ payment_url: string }> {
    const invoice = await trx('invoices').where({ id: invoiceId }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'voided') throw new BadRequestException('Cannot create payment link for voided invoice');

    // Get Stripe settings
    const settings = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;

    if (!settings || !settings.payment_enabled) {
      throw new BadRequestException('Online payments are not enabled. Configure Stripe in Settings.');
    }

    const secretKey = await this.settingsService.getStripeSecretKey(trx, tenantId);
    if (!secretKey) {
      throw new BadRequestException('Stripe secret key is not configured');
    }

    // Create Stripe Checkout Session via fetch
    const totalCents = Math.round(Number(invoice.total) * 100);
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${process.env.FRONTEND_URL || 'https://app.maishq.com'}/invoices/${invoiceId}?payment=success`);
    params.append('cancel_url', `${process.env.FRONTEND_URL || 'https://app.maishq.com'}/invoices/${invoiceId}?payment=cancelled`);
    params.append('line_items[0][price_data][currency]', String(settings.default_currency || 'usd').toLowerCase());
    params.append('line_items[0][price_data][unit_amount]', String(totalCents));
    params.append('line_items[0][price_data][product_data][name]', `Invoice ${String(invoice.invoice_number)}`);
    params.append('line_items[0][price_data][product_data][description]', `Payment for invoice ${String(invoice.invoice_number)} - ${String(invoice.customer_name)}`);
    params.append('line_items[0][quantity]', '1');
    params.append('customer_email', String(invoice.customer_email || ''));
    params.append('metadata[invoice_id]', String(invoiceId));
    params.append('metadata[tenant_id]', String(tenantId));

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as Record<string, unknown>;
      const errorObj = error.error as Record<string, unknown> | undefined;
      throw new BadRequestException(`Stripe error: ${String(errorObj?.message ?? 'Unknown error')}`);
    }

    const session = await response.json() as Record<string, unknown>;

    // Save payment URL and session ID to invoice
    await trx('invoices').where({ id: invoiceId }).update({
      payment_url: session.url,
      stripe_session_id: session.id,
    });

    return { payment_url: String(session.url) };
  }

  // Check payment status via Stripe
  async getPaymentStatus(
    trx: Knex.Transaction,
    tenantId: number,
    invoiceId: number,
  ): Promise<{ status: string; stripe_payment_status?: string; payment_url?: string }> {
    const invoice = await trx('invoices').where({ id: invoiceId }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!invoice.stripe_session_id) {
      return { status: String(invoice.status) };
    }

    const secretKey = await this.settingsService.getStripeSecretKey(trx, tenantId);
    if (!secretKey) {
      return { status: String(invoice.status), payment_url: invoice.payment_url as string | undefined };
    }

    // Retrieve session from Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${String(invoice.stripe_session_id)}`,
      {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      },
    );

    if (!response.ok) {
      return { status: String(invoice.status), payment_url: invoice.payment_url as string | undefined };
    }

    const session = await response.json() as Record<string, unknown>;

    return {
      status: String(invoice.status),
      stripe_payment_status: String(session.payment_status || 'unknown'),
      payment_url: invoice.payment_url as string | undefined,
    };
  }
}
