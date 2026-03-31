// Estimates service — CRUD, lifecycle transitions, invoice conversion, PDF generation
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateEstimateInput {
  tenant_id: number;
  created_by: string;
  customer_name: string;
  customer_email?: string;
  contact_id?: number;
  issue_date: string;
  expiration_date: string;
  tax_rate?: number;
  notes?: string;
  lines: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

export interface UpdateEstimateInput {
  customer_name?: string;
  customer_email?: string;
  contact_id?: number;
  issue_date?: string;
  expiration_date?: string;
  tax_rate?: number;
  notes?: string;
  lines?: { description: string; quantity: number; unit_price: number; account_id?: number }[];
}

@Injectable()
export class EstimatesService {
  // Generate next estimate number for a tenant (EST-XXXX pattern)
  async nextEstimateNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('estimates')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('estimate_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'EST-0001';
    const num = parseInt(String(last.estimate_number).replace('EST-', ''), 10);
    return `EST-${String(num + 1).padStart(4, '0')}`;
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

  // Create a new draft estimate
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, input: CreateEstimateInput) {
    const taxRate = input.tax_rate ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);
    const estimateNumber = await this.nextEstimateNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for estimate creation');

    const [estimate] = await trx('estimates')
      .insert({
        tenant_id: tenantId,
        estimate_number: estimateNumber,
        customer_name: input.customer_name,
        customer_email: input.customer_email ?? null,
        contact_id: input.contact_id ?? null,
        issue_date: input.issue_date,
        expiration_date: input.expiration_date,
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
      estimate_id: estimate.id,
      tenant_id: tenantId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('estimate_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...estimate, lines: insertedLines };
  }

  // List estimates with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('estimates').select('*').orderBy('created_at', 'desc');
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

  // Get single estimate with lines
  async findOne(trx: Knex.Transaction, id: number) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) return null;
    const lines = await trx('estimate_lines')
      .where({ estimate_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];
    return { ...estimate, lines };
  }

  // Update a draft or sent estimate
  async update(trx: Knex.Transaction, id: number, tenantId: number, input: UpdateEstimateInput) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'draft' && estimate.status !== 'sent') {
      throw new BadRequestException('Only draft or sent estimates can be edited');
    }

    const updates: Record<string, unknown> = {};
    if (input.customer_name !== undefined) updates.customer_name = input.customer_name;
    if (input.customer_email !== undefined) updates.customer_email = input.customer_email;
    if (input.contact_id !== undefined) updates.contact_id = input.contact_id;
    if (input.issue_date !== undefined) updates.issue_date = input.issue_date;
    if (input.expiration_date !== undefined) updates.expiration_date = input.expiration_date;
    if (input.notes !== undefined) updates.notes = input.notes;

    // Recalculate totals if lines or tax_rate changed
    if (input.lines || input.tax_rate !== undefined) {
      const taxRate = input.tax_rate ?? Number(estimate.tax_rate);
      if (input.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(input.lines, taxRate);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;

        // Replace lines
        await trx('estimate_lines').where({ estimate_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          estimate_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id ?? null,
          sort_order: i,
        }));
        await trx('estimate_lines').insert(lineRows);
      } else {
        // Only tax_rate changed, recalculate from existing subtotal
        const subtotal = Number(estimate.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = Math.round((subtotal + taxAmount) * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('estimates').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Send estimate (draft -> sent)
  async send(trx: Knex.Transaction, id: number) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'draft') throw new BadRequestException(`Cannot send estimate with status '${String(estimate.status)}'`);

    const [updated] = await trx('estimates')
      .where({ id })
      .update({ status: 'sent' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Accept estimate (sent -> accepted)
  async accept(trx: Knex.Transaction, id: number) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'sent') throw new BadRequestException(`Cannot accept estimate with status '${String(estimate.status)}'`);

    const [updated] = await trx('estimates')
      .where({ id })
      .update({ status: 'accepted' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Reject estimate (sent -> rejected)
  async reject(trx: Knex.Transaction, id: number) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'sent') throw new BadRequestException(`Cannot reject estimate with status '${String(estimate.status)}'`);

    const [updated] = await trx('estimates')
      .where({ id })
      .update({ status: 'rejected' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Convert estimate to invoice
  async convertToInvoice(trx: Knex.Transaction, tenantId: number, id: number, createdBy: string) {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Estimate not found');
    const estimate = result as Record<string, unknown> & { lines: Record<string, unknown>[] };

    if (estimate.status === 'converted') throw new BadRequestException('Estimate has already been converted');
    if (estimate.status === 'rejected') throw new BadRequestException('Cannot convert a rejected estimate');

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for invoice creation');

    const invoiceNumber = await this.nextInvoiceNumber(trx, tenantId);

    const [invoice] = await trx('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        customer_name: estimate.customer_name,
        customer_email: estimate.customer_email ?? null,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
        notes: estimate.notes ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    // Copy lines from estimate
    const lineRows = estimate.lines.map((l, i) => ({
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

    // Update estimate status to converted
    await trx('estimates')
      .where({ id })
      .update({ status: 'converted', converted_invoice_id: invoice.id });

    return { ...invoice, lines: insertedLines };
  }

  // Delete estimate
  async delete(trx: Knex.Transaction, id: number) {
    const estimate = await trx('estimates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!estimate) throw new NotFoundException('Estimate not found');

    await trx('estimate_lines').where({ estimate_id: id }).del();
    await trx('estimates').where({ id }).del();
    return { deleted: true };
  }

  // Generate PDF as a Buffer
  async generatePdf(trx: Knex.Transaction, id: number): Promise<{ buffer: Buffer; filename: string }> {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Estimate not found');
    const estimate = result as unknown as Record<string, unknown> & { lines: Record<string, unknown>[] };

    // Dynamic import to avoid issues in test environments
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        filename: `estimate-${String(estimate.estimate_number)}.pdf`,
      }));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('MA Finance Hub', 50, 50);
      doc.fontSize(9).font('Helvetica').text('Powered by MAiSHQ', 50, 75);
      doc.fontSize(24).font('Helvetica-Bold').text('ESTIMATE', 400, 50, { align: 'right' });
      doc.fontSize(11).font('Helvetica').text(`#${String(estimate.estimate_number)}`, 400, 80, { align: 'right' });

      // Status badge
      doc.fontSize(10).text(`Status: ${String(estimate.status).toUpperCase()}`, 400, 95, { align: 'right' });

      doc.moveTo(50, 115).lineTo(545, 115).stroke('#E8DCC8');

      // Customer info
      let y = 130;
      doc.fontSize(10).font('Helvetica-Bold').text('Prepared For:', 50, y);
      y += 15;
      doc.font('Helvetica').text(String(estimate.customer_name), 50, y);
      if (estimate.customer_email) { y += 13; doc.text(String(estimate.customer_email), 50, y); }

      // Dates
      doc.font('Helvetica-Bold').text('Issue Date:', 350, 130);
      doc.font('Helvetica').text(String(estimate.issue_date), 430, 130);
      doc.font('Helvetica-Bold').text('Expires:', 350, 145);
      doc.font('Helvetica').text(String(estimate.expiration_date), 430, 145);

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
      const lines = estimate.lines;
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
      doc.text(Number(estimate.subtotal).toFixed(2), 440, y, { width: 100, align: 'right' });
      y += 15;
      if (Number(estimate.tax_rate) > 0) {
        doc.text(`Tax (${Number(estimate.tax_rate)}%):`, 350, y, { width: 80, align: 'right' });
        doc.text(Number(estimate.tax_amount).toFixed(2), 440, y, { width: 100, align: 'right' });
        y += 15;
      }
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total:', 350, y, { width: 80, align: 'right' });
      doc.text(`$${Number(estimate.total).toFixed(2)}`, 440, y, { width: 100, align: 'right' });

      // Notes
      if (estimate.notes) {
        y += 30;
        doc.font('Helvetica-Bold').fontSize(9).text('Notes:', 50, y);
        y += 13;
        doc.font('Helvetica').text(String(estimate.notes), 50, y, { width: 495 });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#8B7355')
        .text('MA Finance Hub — Powered by MAiSHQ', 50, 770, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
