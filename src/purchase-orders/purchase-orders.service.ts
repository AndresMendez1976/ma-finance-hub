// Purchase Orders service — CRUD, lifecycle transitions, receiving, journal entry creation
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreatePoInput {
  tenant_id: number;
  created_by: string;
  contact_id?: number;
  vendor_name: string;
  order_date: string;
  expected_delivery_date?: string;
  tax_rate?: number;
  shipping_cost?: number;
  notes?: string;
  shipping_address?: string;
  lines: { description: string; quantity_ordered: number; unit_price: number; account_id?: number }[];
}

export interface UpdatePoInput {
  contact_id?: number;
  vendor_name?: string;
  order_date?: string;
  expected_delivery_date?: string;
  tax_rate?: number;
  shipping_cost?: number;
  notes?: string;
  shipping_address?: string;
  lines?: { description: string; quantity_ordered: number; unit_price: number; account_id?: number }[];
}

export interface ReceivePoInput {
  receipt_date: string;
  lines: { po_line_id: number; quantity_received: number }[];
  notes?: string;
  fiscal_period_id?: number;
}

@Injectable()
export class PurchaseOrdersService {
  // Generate next PO number for a tenant
  private async nextPoNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('purchase_orders')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('po_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'PO-0001';
    const num = parseInt(String(last.po_number).replace('PO-', ''), 10);
    return `PO-${String(num + 1).padStart(4, '0')}`;
  }

  // Compute line amounts and totals
  private computeTotals(
    lines: { description: string; quantity_ordered: number; unit_price: number; account_id?: number }[],
    taxRate: number,
    shippingCost: number,
  ) {
    const lineAmounts = lines.map((l) => ({
      description: l.description,
      quantity_ordered: l.quantity_ordered,
      unit_price: l.unit_price,
      account_id: l.account_id,
      amount: Math.round(l.quantity_ordered * l.unit_price * 100) / 100,
    }));
    const subtotal = lineAmounts.reduce((s, l) => s + l.amount, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;
    return { lineAmounts, subtotal, taxAmount, total };
  }

  // Create a new draft purchase order
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreatePoInput) {
    const taxRate = data.tax_rate ?? 0;
    const shippingCost = data.shipping_cost ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate, shippingCost);
    const poNumber = await this.nextPoNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for purchase order creation');

    const [po] = await trx('purchase_orders')
      .insert({
        tenant_id: tenantId,
        po_number: poNumber,
        contact_id: data.contact_id ?? null,
        vendor_name: data.vendor_name,
        order_date: data.order_date,
        expected_delivery_date: data.expected_delivery_date ?? null,
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total,
        notes: data.notes ?? null,
        shipping_address: data.shipping_address ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = lineAmounts.map((l, i) => ({
      purchase_order_id: po.id,
      tenant_id: tenantId,
      description: l.description,
      quantity_ordered: l.quantity_ordered,
      quantity_received: 0,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id ?? null,
      sort_order: i,
    }));

    const insertedLines = await trx('purchase_order_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...po, lines: insertedLines };
  }

  // List purchase orders with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; vendor?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('purchase_orders')
      .select('purchase_orders.*')
      .leftJoin('contacts', 'purchase_orders.contact_id', 'contacts.id')
      .orderBy('purchase_orders.created_at', 'desc');

    if (filters.status) void query.where('purchase_orders.status', filters.status);
    if (filters.vendor) void query.where('purchase_orders.vendor_name', 'ilike', `%${filters.vendor}%`);
    if (filters.from) void query.where('purchase_orders.order_date', '>=', filters.from);
    if (filters.to) void query.where('purchase_orders.order_date', '<=', filters.to);

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

  // Get single purchase order with lines and receipts
  async findOne(trx: Knex.Transaction, id: number) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) return null;

    const lines = await trx('purchase_order_lines')
      .where({ purchase_order_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const receipts = await trx('purchase_order_receipts')
      .where({ purchase_order_id: id })
      .orderBy('created_at', 'desc')
      .select('*') as Record<string, unknown>[];

    // Fetch receipt lines for each receipt
    const receiptIds = receipts.map((r) => Number(r.id));
    let receiptLines: Record<string, unknown>[] = [];
    if (receiptIds.length > 0) {
      receiptLines = await trx('purchase_order_receipt_lines')
        .whereIn('receipt_id', receiptIds)
        .select('*') as Record<string, unknown>[];
    }

    const receiptsWithLines = receipts.map((r) => ({
      ...r,
      lines: receiptLines.filter((rl) => Number(rl.receipt_id) === Number(r.id)),
    }));

    return { ...po, lines, receipts: receiptsWithLines };
  }

  // Update a draft purchase order
  async update(trx: Knex.Transaction, id: number, tenantId: number, data: UpdatePoInput) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new BadRequestException('Only draft purchase orders can be edited');

    const updates: Record<string, unknown> = {};
    if (data.contact_id !== undefined) updates.contact_id = data.contact_id;
    if (data.vendor_name !== undefined) updates.vendor_name = data.vendor_name;
    if (data.order_date !== undefined) updates.order_date = data.order_date;
    if (data.expected_delivery_date !== undefined) updates.expected_delivery_date = data.expected_delivery_date;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.shipping_address !== undefined) updates.shipping_address = data.shipping_address;
    if (data.shipping_cost !== undefined) updates.shipping_cost = data.shipping_cost;

    // Recalculate totals if lines, tax_rate, or shipping_cost changed
    if (data.lines || data.tax_rate !== undefined || data.shipping_cost !== undefined) {
      const taxRate = data.tax_rate ?? Number(po.tax_rate);
      const shippingCost = data.shipping_cost ?? Number(po.shipping_cost);

      if (data.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate, shippingCost);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.shipping_cost = shippingCost;
        updates.total = total;

        // Replace lines
        await trx('purchase_order_lines').where({ purchase_order_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          purchase_order_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity_ordered: l.quantity_ordered,
          quantity_received: 0,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id ?? null,
          sort_order: i,
        }));
        await trx('purchase_order_lines').insert(lineRows);
      } else {
        // Only tax_rate or shipping_cost changed, recalculate from existing subtotal
        const subtotal = Number(po.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.shipping_cost = shippingCost;
        updates.total = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('purchase_orders').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Approve purchase order — set approved_by and approved_date, keep status draft
  async approve(trx: Knex.Transaction, id: number, approverSubject: string) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new BadRequestException(`Cannot approve purchase order with status '${String(po.status)}'`);

    // Resolve approver user id from external_subject
    const approver = await trx('users')
      .where({ external_subject: approverSubject })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!approver) throw new BadRequestException('Approver user not found');

    const [updated] = await trx('purchase_orders')
      .where({ id })
      .update({
        approved_by: approver.id,
        approved_date: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Send purchase order (draft → sent). Must be approved first.
  async send(trx: Knex.Transaction, id: number) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new BadRequestException(`Cannot send purchase order with status '${String(po.status)}'`);
    if (!po.approved_by) throw new BadRequestException('Purchase order must be approved before sending');

    const [updated] = await trx('purchase_orders')
      .where({ id })
      .update({ status: 'sent' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Receive goods against a purchase order
  async receive(trx: Knex.Transaction, tenantId: number, id: number, data: ReceivePoInput) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'sent' && po.status !== 'partial') {
      throw new BadRequestException(`Cannot receive against purchase order with status '${String(po.status)}'`);
    }

    const poLines = await trx('purchase_order_lines')
      .where({ purchase_order_id: id })
      .select('*') as Record<string, unknown>[];

    // Validate receipt lines against PO lines
    for (const rl of data.lines) {
      const poLine = poLines.find((pl) => Number(pl.id) === rl.po_line_id);
      if (!poLine) throw new BadRequestException(`PO line ${String(rl.po_line_id)} not found`);
      const remaining = Number(poLine.quantity_ordered) - Number(poLine.quantity_received);
      if (rl.quantity_received > remaining) {
        throw new BadRequestException(
          `Cannot receive ${String(rl.quantity_received)} for line ${String(rl.po_line_id)}; only ${String(remaining)} remaining`,
        );
      }
    }

    // Create receipt
    const [receipt] = await trx('purchase_order_receipts')
      .insert({
        purchase_order_id: id,
        tenant_id: tenantId,
        receipt_date: data.receipt_date,
        notes: data.notes ?? null,
      })
      .returning('*') as Record<string, unknown>[];

    // Create receipt lines and update PO line quantities
    const receiptLineRows = data.lines.map((rl) => ({
      receipt_id: receipt.id,
      po_line_id: rl.po_line_id,
      quantity_received: rl.quantity_received,
    }));
    await trx('purchase_order_receipt_lines').insert(receiptLineRows);

    for (const rl of data.lines) {
      await trx('purchase_order_lines')
        .where({ id: rl.po_line_id })
        .increment('quantity_received', rl.quantity_received);
    }

    // Check if all lines are fully received
    const updatedLines = await trx('purchase_order_lines')
      .where({ purchase_order_id: id })
      .select('*') as Record<string, unknown>[];

    const allReceived = updatedLines.every(
      (l) => Number(l.quantity_received) >= Number(l.quantity_ordered),
    );
    const newStatus = allReceived ? 'received' : 'partial';

    await trx('purchase_orders').where({ id }).update({ status: newStatus });

    // Optionally create journal entry if fiscal_period_id provided
    if (data.fiscal_period_id) {
      const period = await trx('fiscal_periods')
        .where({ id: data.fiscal_period_id })
        .first() as Record<string, unknown> | undefined;
      if (!period || period.status !== 'open') throw new BadRequestException('Fiscal period not found or not open');

      // Get next entry number
      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: data.fiscal_period_id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      // Calculate total received value for this receipt
      let receiptTotal = 0;
      const journalLines: Record<string, unknown>[] = [];

      for (const rl of data.lines) {
        const poLine = poLines.find((pl) => Number(pl.id) === rl.po_line_id);
        if (!poLine) continue;
        const lineValue = Math.round(rl.quantity_received * Number(poLine.unit_price) * 100) / 100;
        receiptTotal += lineValue;

        // Debit expense account from PO line (or skip if no account)
        if (poLine.account_id) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: 0, // placeholder, set after entry creation
            account_id: poLine.account_id,
            debit: lineValue,
            credit: 0,
            description: `PO receipt - ${String(poLine.description)}`,
          });
        }
      }

      if (journalLines.length > 0 && receiptTotal > 0) {
        // Create journal entry
        const [entry] = await trx('journal_entries')
          .insert({
            tenant_id: tenantId,
            fiscal_period_id: data.fiscal_period_id,
            entry_number: entryNumber,
            reference: `RCV-${String(po.po_number)}`,
            memo: `Receipt for PO ${String(po.po_number)} - ${String(po.vendor_name)}`,
            status: 'posted',
            posted_at: trx.fn.now(),
          })
          .returning('*') as Record<string, unknown>[];

        // Set journal_entry_id on debit lines
        for (const jl of journalLines) {
          jl.journal_entry_id = entry.id;
        }

        // Credit AP account 2000
        const apAccount = await trx('accounts')
          .where({ account_code: '2000' })
          .select('id')
          .first() as Record<string, unknown> | undefined;
        if (apAccount) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: entry.id,
            account_id: apAccount.id,
            debit: 0,
            credit: receiptTotal,
            description: `Accounts Payable - ${String(po.po_number)}`,
          });
        }

        await trx('journal_lines').insert(journalLines);
      }
    }

    return this.findOne(trx, id);
  }

  // Cancel purchase order — only if no receipts exist
  async cancel(trx: Knex.Transaction, id: number) {
    const po = await trx('purchase_orders').where({ id }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');

    const receipts = await trx('purchase_order_receipts')
      .where({ purchase_order_id: id })
      .select('id') as Record<string, unknown>[];
    if (receipts.length > 0) {
      throw new BadRequestException('Cannot cancel a purchase order that has receipts');
    }

    const [updated] = await trx('purchase_orders')
      .where({ id })
      .update({ status: 'cancelled' })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  // Generate PDF for purchase order with MAiSHQ branding
  async generatePdf(trx: Knex.Transaction, id: number): Promise<{ buffer: Buffer; filename: string }> {
    const result = await this.findOne(trx, id);
    if (!result) throw new NotFoundException('Purchase order not found');
    const po = result as unknown as Record<string, unknown> & { lines: Record<string, unknown>[] };

    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        filename: `po-${String(po.po_number)}.pdf`,
      }));
      doc.on('error', reject);

      // Header — MAiSHQ branding
      doc.fontSize(20).font('Helvetica-Bold').text('MA Finance Hub', 50, 50);
      doc.fontSize(9).font('Helvetica').text('Powered by MAiSHQ', 50, 75);
      doc.fontSize(24).font('Helvetica-Bold').text('PURCHASE ORDER', 350, 50, { align: 'right' });
      doc.fontSize(11).font('Helvetica').text(`#${String(po.po_number)}`, 350, 80, { align: 'right' });
      doc.fontSize(10).text(`Status: ${String(po.status).toUpperCase()}`, 350, 95, { align: 'right' });

      doc.moveTo(50, 115).lineTo(545, 115).stroke('#E8DCC8');

      // Vendor info
      let y = 130;
      doc.fontSize(10).font('Helvetica-Bold').text('Vendor:', 50, y);
      y += 15;
      doc.font('Helvetica').text(String(po.vendor_name), 50, y);
      if (po.shipping_address) { y += 13; doc.text(String(po.shipping_address), 50, y, { width: 200 }); }

      // Dates
      doc.font('Helvetica-Bold').text('Order Date:', 350, 130);
      doc.font('Helvetica').text(String(po.order_date), 440, 130);
      if (po.expected_delivery_date) {
        doc.font('Helvetica-Bold').text('Expected:', 350, 145);
        doc.font('Helvetica').text(String(po.expected_delivery_date), 440, 145);
      }

      // Line items table
      y = Math.max(y + 30, 200);
      doc.moveTo(50, y).lineTo(545, y).stroke('#2D6A4F');
      y += 5;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Description', 50, y, { width: 200 });
      doc.text('Qty', 260, y, { width: 50, align: 'right' });
      doc.text('Received', 320, y, { width: 55, align: 'right' });
      doc.text('Price', 385, y, { width: 70, align: 'right' });
      doc.text('Amount', 460, y, { width: 80, align: 'right' });
      y += 15;
      doc.moveTo(50, y).lineTo(545, y).stroke('#E8DCC8');

      doc.font('Helvetica').fontSize(9);
      for (const line of po.lines) {
        y += 5;
        if (y > 720) { doc.addPage(); y = 50; }
        doc.text(String(line.description), 50, y, { width: 200 });
        doc.text(Number(line.quantity_ordered).toFixed(2), 260, y, { width: 50, align: 'right' });
        doc.text(Number(line.quantity_received).toFixed(2), 320, y, { width: 55, align: 'right' });
        doc.text(Number(line.unit_price).toFixed(2), 385, y, { width: 70, align: 'right' });
        doc.text(Number(line.amount).toFixed(2), 460, y, { width: 80, align: 'right' });
        y += 15;
      }

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(545, y).stroke('#E8DCC8');
      y += 8;
      doc.font('Helvetica').text('Subtotal:', 350, y, { width: 100, align: 'right' });
      doc.text(Number(po.subtotal).toFixed(2), 460, y, { width: 80, align: 'right' });
      if (Number(po.tax_amount) > 0) {
        y += 15;
        doc.text(`Tax (${Number(po.tax_rate)}%):`, 350, y, { width: 100, align: 'right' });
        doc.text(Number(po.tax_amount).toFixed(2), 460, y, { width: 80, align: 'right' });
      }
      if (Number(po.shipping_cost) > 0) {
        y += 15;
        doc.text('Shipping:', 350, y, { width: 100, align: 'right' });
        doc.text(Number(po.shipping_cost).toFixed(2), 460, y, { width: 80, align: 'right' });
      }
      y += 15;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 350, y, { width: 100, align: 'right' });
      doc.text(`$${Number(po.total).toFixed(2)}`, 460, y, { width: 80, align: 'right' });

      // Notes
      if (po.notes) {
        y += 30;
        doc.fontSize(9).font('Helvetica-Bold').text('Notes:', 50, y);
        y += 12;
        doc.font('Helvetica').text(String(po.notes), 50, y, { width: 490 });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').text('Generated by MA Finance Hub — maishq.com', 50, 780, { align: 'center', width: 495 });

      doc.end();
    });
  }

  // Create expense record from a received purchase order
  async createExpenseFromPo(trx: Knex.Transaction, tenantId: number, createdBy: string, poId: number) {
    const po = await trx('purchase_orders').where({ id: poId }).first() as Record<string, unknown> | undefined;
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'received' && po.status !== 'partial') {
      throw new BadRequestException('Can only create expense from received/partial purchase orders');
    }

    // Resolve user id
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found');

    // Get next expense number
    const lastExp = await trx('expenses')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('expense_number')
      .first() as Record<string, unknown> | undefined;
    let expNum = 'EXP-0001';
    if (lastExp) {
      const n = parseInt(String(lastExp.expense_number).replace('EXP-', ''), 10);
      expNum = `EXP-${String(n + 1).padStart(4, '0')}`;
    }

    const poLines = await trx('purchase_order_lines')
      .where({ purchase_order_id: poId })
      .select('*') as Record<string, unknown>[];

    // Determine account_id from PO lines (use first line's account or fallback)
    const accountId = poLines.find((l) => l.account_id)?.account_id;
    if (!accountId) throw new BadRequestException('PO lines must have at least one account assigned to create an expense');

    const [expense] = await trx('expenses')
      .insert({
        tenant_id: tenantId,
        expense_number: expNum,
        date: new Date().toISOString().slice(0, 10),
        vendor_name: po.vendor_name,
        category: 'Purchase Order',
        description: `Expense from PO ${String(po.po_number)}`,
        amount: po.total,
        account_id: accountId,
        status: 'pending',
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    return expense;
  }
}
