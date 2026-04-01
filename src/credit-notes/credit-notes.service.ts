// Credit Notes service — CRUD, lifecycle transitions, journal entry creation on issue/void, apply to invoice
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateCreditNoteInput {
  tenant_id: number;
  created_by: string;
  contact_id: number;
  invoice_id?: number;
  reason: string;
  date: string;
  tax_rate?: number;
  notes?: string;
  lines: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

export interface UpdateCreditNoteInput {
  contact_id?: number;
  invoice_id?: number;
  reason?: string;
  date?: string;
  tax_rate?: number;
  notes?: string;
  lines?: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

@Injectable()
export class CreditNotesService {
  // Generate next credit note number for a tenant
  async nextCreditNoteNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('credit_notes')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('credit_note_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'CN-0001';
    const num = parseInt(String(last.credit_note_number).replace('CN-', ''), 10);
    return `CN-${String(num + 1).padStart(4, '0')}`;
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

  // Create a new draft credit note
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateCreditNoteInput) {
    const taxRate = data.tax_rate ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate);
    const creditNoteNumber = await this.nextCreditNoteNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for credit note creation');

    const [creditNote] = await trx('credit_notes')
      .insert({
        tenant_id: tenantId,
        credit_note_number: creditNoteNumber,
        contact_id: data.contact_id,
        invoice_id: data.invoice_id ?? null,
        reason: data.reason,
        date: data.date,
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: data.notes ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = lineAmounts.map((l, i) => ({
      credit_note_id: creditNote.id,
      tenant_id: tenantId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('credit_note_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...creditNote, lines: insertedLines };
  }

  // List credit notes with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; contact_id?: number; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('credit_notes').select('*').orderBy('created_at', 'desc');
    if (filters.status) void query.where('status', filters.status);
    if (filters.contact_id) void query.where('contact_id', filters.contact_id);
    if (filters.from) void query.where('date', '>=', filters.from);
    if (filters.to) void query.where('date', '<=', filters.to);

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

  // Get single credit note with lines
  async findOne(trx: Knex.Transaction, id: number) {
    const creditNote = await trx('credit_notes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!creditNote) return null;
    const lines = await trx('credit_note_lines')
      .where({ credit_note_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];
    return { ...creditNote, lines };
  }

  // Update a draft credit note
  async update(trx: Knex.Transaction, id: number, tenantId: number, data: UpdateCreditNoteInput) {
    const creditNote = await trx('credit_notes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!creditNote) throw new NotFoundException('Credit note not found');
    if (creditNote.status !== 'draft') throw new BadRequestException('Only draft credit notes can be edited');

    const updates: Record<string, unknown> = {};
    if (data.contact_id !== undefined) updates.contact_id = data.contact_id;
    if (data.invoice_id !== undefined) updates.invoice_id = data.invoice_id;
    if (data.reason !== undefined) updates.reason = data.reason;
    if (data.date !== undefined) updates.date = data.date;
    if (data.notes !== undefined) updates.notes = data.notes;

    // Recalculate totals if lines or tax_rate changed
    if (data.lines || data.tax_rate !== undefined) {
      const taxRate = data.tax_rate ?? Number(creditNote.tax_rate);
      if (data.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;

        // Replace lines
        await trx('credit_note_lines').where({ credit_note_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          credit_note_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id ?? null,
          sort_order: i,
        }));
        await trx('credit_note_lines').insert(lineRows);
      } else {
        // Only tax_rate changed, recalculate from existing subtotal
        const subtotal = Number(creditNote.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = Math.round((subtotal + taxAmount) * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('credit_notes').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Issue credit note — status='issued', create journal entry: Debit Revenue/Sales Returns, Credit AR
  async issue(trx: Knex.Transaction, tenantId: number, id: number) {
    const creditNote = await trx('credit_notes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!creditNote) throw new NotFoundException('Credit note not found');
    if (creditNote.status !== 'draft') throw new BadRequestException(`Cannot issue credit note with status '${String(creditNote.status)}'`);

    const lines = await trx('credit_note_lines')
      .where({ credit_note_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const total = Number(creditNote.total);

    // Find open fiscal period for journal entry
    const period = await trx('fiscal_periods')
      .where({ status: 'open' })
      .orderBy('start_date', 'desc')
      .first() as Record<string, unknown> | undefined;

    let journalEntryId: number | null = null;

    if (period) {
      // Get next entry number
      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: period.id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      // Create journal entry
      const [entry] = await trx('journal_entries')
        .insert({
          tenant_id: tenantId,
          fiscal_period_id: period.id,
          entry_number: entryNumber,
          reference: `CN-${String(creditNote.credit_note_number)}`,
          memo: `Credit note ${String(creditNote.credit_note_number)} issued - ${String(creditNote.reason)}`,
          status: 'posted',
          posted_at: trx.fn.now(),
        })
        .returning('*') as Record<string, unknown>[];

      journalEntryId = Number(entry.id);

      const journalLines: Record<string, unknown>[] = [];

      // Debit Revenue/Sales Returns accounts from credit note lines
      const lineTotal = lines.reduce((s, l) => s + Number(l.amount), 0);
      let debited = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const accountId = line.account_id;
        if (!accountId) continue;
        const proportion = Number(line.amount) / lineTotal;
        const debitAmt = i === lines.length - 1
          ? Math.round((total - debited) * 100) / 100
          : Math.round(total * proportion * 100) / 100;
        debited += debitAmt;
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: accountId,
          debit: debitAmt,
          credit: 0,
          description: `Credit note - ${String(line.description)}`,
        });
      }

      // If no line accounts or remaining amount, debit a default sales returns account (4100) or revenue (4000)
      if (debited < total) {
        const salesReturnsAccount = await trx('accounts')
          .where({ account_code: '4100' })
          .select('id')
          .first() as Record<string, unknown> | undefined;
        const fallbackAccount = salesReturnsAccount
          || await trx('accounts').where({ account_code: '4000' }).select('id').first() as Record<string, unknown> | undefined;
        if (fallbackAccount) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: entry.id,
            account_id: fallbackAccount.id,
            debit: Math.round((total - debited) * 100) / 100,
            credit: 0,
            description: `Sales returns - ${String(creditNote.credit_note_number)}`,
          });
        }
      }

      // Credit Accounts Receivable (1100)
      const arAccount = await trx('accounts')
        .where({ account_code: '1100' })
        .select('id')
        .first() as Record<string, unknown> | undefined;
      if (arAccount) {
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: arAccount.id,
          debit: 0,
          credit: total,
          description: `Accounts Receivable - ${String(creditNote.credit_note_number)}`,
        });
      }

      if (journalLines.length > 0) {
        await trx('journal_lines').insert(journalLines);
      }
    }

    const [updated] = await trx('credit_notes')
      .where({ id })
      .update({
        status: 'issued',
        journal_entry_id: journalEntryId,
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Apply credit note to an invoice — reduce invoice balance, mark paid if zero
  async apply(trx: Knex.Transaction, _tenantId: number, id: number, invoiceId: number) {
    const creditNote = await trx('credit_notes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!creditNote) throw new NotFoundException('Credit note not found');
    if (creditNote.status !== 'issued') throw new BadRequestException('Credit note must be issued before applying');
    if (creditNote.applied_to_invoice_id) throw new BadRequestException('Credit note has already been applied');

    const invoice = await trx('invoices').where({ id: invoiceId }).first() as Record<string, unknown> | undefined;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'voided') throw new BadRequestException('Cannot apply credit to a voided invoice');

    const creditTotal = Number(creditNote.total);
    const invoiceTotal = Number(invoice.total);
    const invoicePaid = Number(invoice.paid_amount || 0);
    const invoiceBalance = Math.round((invoiceTotal - invoicePaid) * 100) / 100;

    const appliedAmount = Math.min(creditTotal, invoiceBalance);
    const newPaidAmount = Math.round((invoicePaid + appliedAmount) * 100) / 100;
    const newBalance = Math.round((invoiceTotal - newPaidAmount) * 100) / 100;

    const invoiceUpdates: Record<string, unknown> = {
      paid_amount: newPaidAmount,
    };
    if (newBalance <= 0) {
      invoiceUpdates.status = 'paid';
    }

    await trx('invoices').where({ id: invoiceId }).update(invoiceUpdates);

    const [updated] = await trx('credit_notes')
      .where({ id })
      .update({
        status: 'applied',
        applied_to_invoice_id: invoiceId,
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Void credit note — status='voided', create reversal journal entry
  async voidCreditNote(trx: Knex.Transaction, tenantId: number, id: number) {
    const creditNote = await trx('credit_notes').where({ id }).first() as Record<string, unknown> | undefined;
    if (!creditNote) throw new NotFoundException('Credit note not found');
    if (creditNote.status === 'voided') throw new BadRequestException('Credit note is already voided');
    if (creditNote.status === 'applied') throw new BadRequestException('Cannot void an applied credit note');

    // If credit note has a journal entry, create reversal
    if (creditNote.journal_entry_id) {
      const jeId = Number(creditNote.journal_entry_id);
      const entry = await trx('journal_entries').where({ id: jeId }).first() as Record<string, unknown> | undefined;

      if (entry && entry.status === 'posted') {
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
            reference: `VOID-${String(creditNote.credit_note_number)}`,
            memo: `Reversal for voided credit note ${String(creditNote.credit_note_number)}`,
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

    const [updated] = await trx('credit_notes')
      .where({ id })
      .update({ status: 'voided' })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Generate PDF as a Buffer
  async generatePdf(trx: Knex.Transaction, id: number): Promise<{ buffer: Buffer; filename: string }> {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Credit note not found');
    const creditNote = result as unknown as Record<string, unknown> & { lines: Record<string, unknown>[] };

    // Dynamic import to avoid issues in test environments
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        filename: `credit-note-${String(creditNote.credit_note_number)}.pdf`,
      }));
      doc.on('error', reject);

      // Header — MAiSHQ branding
      doc.fontSize(20).font('Helvetica-Bold').text('MA Finance Hub', 50, 50);
      doc.fontSize(9).font('Helvetica').text('Powered by MAiSHQ', 50, 75);
      doc.fontSize(24).font('Helvetica-Bold').text('CREDIT NOTE', 350, 50, { align: 'right' });
      doc.fontSize(11).font('Helvetica').text(`#${String(creditNote.credit_note_number)}`, 350, 80, { align: 'right' });

      // Status badge
      doc.fontSize(10).text(`Status: ${String(creditNote.status).toUpperCase()}`, 350, 95, { align: 'right' });

      doc.moveTo(50, 115).lineTo(545, 115).stroke('#E8DCC8');

      // Credit note info
      let y = 130;
      doc.fontSize(10).font('Helvetica-Bold').text('Reason:', 50, y);
      y += 15;
      doc.font('Helvetica').text(String(creditNote.reason), 50, y, { width: 250 });

      // Dates
      doc.font('Helvetica-Bold').text('Date:', 350, 130);
      doc.font('Helvetica').text(String(creditNote.date), 430, 130);
      if (creditNote.applied_to_invoice_id) {
        doc.font('Helvetica-Bold').text('Applied To:', 350, 145);
        doc.font('Helvetica').text(`Invoice #${String(creditNote.applied_to_invoice_id)}`, 430, 145);
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
      const lines = creditNote.lines;
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
      doc.text(Number(creditNote.subtotal).toFixed(2), 440, y, { width: 100, align: 'right' });
      y += 15;
      if (Number(creditNote.tax_rate) > 0) {
        doc.text(`Tax (${Number(creditNote.tax_rate)}%):`, 350, y, { width: 80, align: 'right' });
        doc.text(Number(creditNote.tax_amount).toFixed(2), 440, y, { width: 100, align: 'right' });
        y += 15;
      }
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total:', 350, y, { width: 80, align: 'right' });
      doc.text(`$${Number(creditNote.total).toFixed(2)}`, 440, y, { width: 100, align: 'right' });

      // Notes
      if (creditNote.notes) {
        y += 30;
        doc.font('Helvetica-Bold').fontSize(9).text('Notes:', 50, y);
        y += 13;
        doc.font('Helvetica').text(String(creditNote.notes), 50, y, { width: 495 });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#8B7355')
        .text('MA Finance Hub — Powered by MAiSHQ', 50, 770, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
