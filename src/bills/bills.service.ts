// Bills service — CRUD, lifecycle transitions, journal entries for receive/pay/void, AP aging
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateBillInput {
  tenant_id: number;
  created_by: string;
  contact_id: number;
  vendor_bill_number?: string;
  date: string;
  due_date: string;
  tax_rate?: number;
  notes?: string;
  purchase_order_id?: number;
  lines: { description: string; quantity: number; unit_price: number; account_id: number }[];
}

export interface UpdateBillInput {
  contact_id?: number;
  vendor_bill_number?: string;
  date?: string;
  due_date?: string;
  tax_rate?: number;
  notes?: string;
  purchase_order_id?: number;
  lines?: { description: string; quantity: number; unit_price: number; account_id: number }[];
}

export interface PayBillInput {
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_account_id?: number;
  reference?: string;
}

@Injectable()
export class BillsService {
  // Generate next bill number for a tenant
  private async nextBillNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('bills')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('bill_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'BILL-0001';
    const num = parseInt(String(last.bill_number).replace('BILL-', ''), 10);
    return `BILL-${String(num + 1).padStart(4, '0')}`;
  }

  // Compute line amounts and totals
  private computeTotals(lines: { description: string; quantity: number; unit_price: number; account_id: number }[], taxRate: number) {
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

  // Create a new draft bill
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreateBillInput) {
    const taxRate = data.tax_rate ?? 0;
    const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate);
    const billNumber = await this.nextBillNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for bill creation');

    const [bill] = await trx('bills')
      .insert({
        tenant_id: tenantId,
        bill_number: billNumber,
        contact_id: data.contact_id,
        vendor_bill_number: data.vendor_bill_number ?? null,
        date: data.date,
        due_date: data.due_date,
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        balance_due: total,
        notes: data.notes ?? null,
        purchase_order_id: data.purchase_order_id ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    const lineRows = lineAmounts.map((l, i) => ({
      bill_id: bill.id,
      tenant_id: tenantId,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
      account_id: l.account_id,
      sort_order: i,
    }));

    const insertedLines = await trx('bill_lines').insert(lineRows).returning('*') as Record<string, unknown>[];
    return { ...bill, lines: insertedLines };
  }

  // List bills with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; contact_id?: number; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('bills').select('*').orderBy('created_at', 'desc');
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

  // Get single bill with lines and payments
  async findOne(trx: Knex.Transaction, id: number) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) return null;

    const lines = await trx('bill_lines')
      .where({ bill_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const payments = await trx('bill_payments')
      .where({ bill_id: id })
      .orderBy('created_at', 'desc')
      .select('*') as Record<string, unknown>[];

    return { ...bill, lines, payments };
  }

  // Update a draft bill
  async update(trx: Knex.Transaction, id: number, tenantId: number, data: UpdateBillInput) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== 'draft') throw new BadRequestException('Only draft bills can be edited');

    const updates: Record<string, unknown> = {};
    if (data.contact_id !== undefined) updates.contact_id = data.contact_id;
    if (data.vendor_bill_number !== undefined) updates.vendor_bill_number = data.vendor_bill_number;
    if (data.date !== undefined) updates.date = data.date;
    if (data.due_date !== undefined) updates.due_date = data.due_date;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.purchase_order_id !== undefined) updates.purchase_order_id = data.purchase_order_id;

    // Recalculate totals if lines or tax_rate changed
    if (data.lines || data.tax_rate !== undefined) {
      const taxRate = data.tax_rate ?? Number(bill.tax_rate);
      if (data.lines) {
        const { lineAmounts, subtotal, taxAmount, total } = this.computeTotals(data.lines, taxRate);
        updates.subtotal = subtotal;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;
        updates.balance_due = total;

        // Replace lines
        await trx('bill_lines').where({ bill_id: id }).del();
        const lineRows = lineAmounts.map((l, i) => ({
          bill_id: id,
          tenant_id: tenantId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          account_id: l.account_id,
          sort_order: i,
        }));
        await trx('bill_lines').insert(lineRows);
      } else {
        // Only tax_rate changed, recalculate from existing subtotal
        const subtotal = Number(bill.subtotal);
        const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
        const total = Math.round((subtotal + taxAmount) * 100) / 100;
        updates.tax_rate = taxRate;
        updates.tax_amount = taxAmount;
        updates.total = total;
        updates.balance_due = total;
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('bills').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Receive bill — status='received', journal: Debit Expense/Asset accounts from lines, Credit AP
  async receive(trx: Knex.Transaction, tenantId: number, id: number) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== 'draft') throw new BadRequestException(`Cannot receive bill with status '${String(bill.status)}'`);

    const lines = await trx('bill_lines')
      .where({ bill_id: id })
      .orderBy('sort_order')
      .select('*') as Record<string, unknown>[];

    const total = Number(bill.total);

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
          reference: `BILL-${String(bill.bill_number)}`,
          memo: `Bill ${String(bill.bill_number)} received`,
          status: 'posted',
          posted_at: trx.fn.now(),
        })
        .returning('*') as Record<string, unknown>[];

      journalEntryId = Number(entry.id);

      const journalLines: Record<string, unknown>[] = [];

      // Debit Expense/Asset accounts from bill lines
      for (const line of lines) {
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: line.account_id,
          debit: Number(line.amount),
          credit: 0,
          description: `Bill expense - ${String(line.description)}`,
        });
      }

      // Add tax amount to first line's account if tax exists
      if (Number(bill.tax_amount) > 0) {
        const firstAccountId = lines[0]?.account_id;
        if (firstAccountId) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: entry.id,
            account_id: firstAccountId,
            debit: Number(bill.tax_amount),
            credit: 0,
            description: `Tax on bill ${String(bill.bill_number)}`,
          });
        }
      }

      // Credit Accounts Payable (2000)
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
          credit: total,
          description: `Accounts Payable - ${String(bill.bill_number)}`,
        });
      }

      if (journalLines.length > 0) {
        await trx('journal_lines').insert(journalLines);
      }
    }

    const [updated] = await trx('bills')
      .where({ id })
      .update({
        status: 'received',
        journal_entry_id: journalEntryId,
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Approve bill — status='approved'
  async approve(trx: Knex.Transaction, id: number, approverSub: string) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== 'received') throw new BadRequestException(`Cannot approve bill with status '${String(bill.status)}'`);

    // Resolve approver user id from external_subject
    const approver = await trx('users')
      .where({ external_subject: approverSub })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!approver) throw new BadRequestException('Approver user not found');

    const [updated] = await trx('bills')
      .where({ id })
      .update({
        status: 'approved',
        approved_by: approver.id,
        approved_date: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // Pay bill — create bill_payment + journal: Debit AP, Credit Cash/Bank
  async pay(trx: Knex.Transaction, tenantId: number, id: number, data: PayBillInput) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== 'approved' && bill.status !== 'received' && bill.status !== 'partial') {
      throw new BadRequestException(`Cannot pay bill with status '${String(bill.status)}'`);
    }

    const balanceDue = Number(bill.balance_due);
    if (data.amount > balanceDue) {
      throw new BadRequestException(`Payment amount ${String(data.amount)} exceeds balance due ${String(balanceDue)}`);
    }

    // Create bill payment record
    const [payment] = await trx('bill_payments')
      .insert({
        bill_id: id,
        tenant_id: tenantId,
        payment_date: data.payment_date,
        amount: data.amount,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id ?? null,
        reference: data.reference ?? null,
      })
      .returning('*') as Record<string, unknown>[];

    // Determine cash/bank account for journal entry
    let cashAccountId = data.bank_account_id;
    if (!cashAccountId) {
      const cashAccount = await trx('accounts')
        .where({ account_code: '1000' })
        .select('id')
        .first() as Record<string, unknown> | undefined;
      if (cashAccount) cashAccountId = Number(cashAccount.id);
    }

    // Create journal entry: Debit AP, Credit Cash/Bank
    const period = await trx('fiscal_periods')
      .where({ status: 'open' })
      .orderBy('start_date', 'desc')
      .first() as Record<string, unknown> | undefined;

    if (period && cashAccountId) {
      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: period.id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      const [entry] = await trx('journal_entries')
        .insert({
          tenant_id: tenantId,
          fiscal_period_id: period.id,
          entry_number: entryNumber,
          reference: `PAY-${String(bill.bill_number)}`,
          memo: `Payment for bill ${String(bill.bill_number)}`,
          status: 'posted',
          posted_at: trx.fn.now(),
        })
        .returning('*') as Record<string, unknown>[];

      const journalLines: Record<string, unknown>[] = [];

      // Debit Accounts Payable (2000)
      const apAccount = await trx('accounts')
        .where({ account_code: '2000' })
        .select('id')
        .first() as Record<string, unknown> | undefined;
      if (apAccount) {
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: apAccount.id,
          debit: data.amount,
          credit: 0,
          description: `AP payment - ${String(bill.bill_number)}`,
        });
      }

      // Credit Cash/Bank
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: data.amount,
        description: `Cash payment - ${String(bill.bill_number)}`,
      });

      if (journalLines.length > 0) {
        await trx('journal_lines').insert(journalLines);
      }
    }

    // Update bill amounts and status
    const newAmountPaid = Math.round((Number(bill.amount_paid) + data.amount) * 100) / 100;
    const newBalanceDue = Math.round((Number(bill.total) - newAmountPaid) * 100) / 100;

    let newStatus: string;
    if (newBalanceDue <= 0) {
      newStatus = 'paid';
    } else {
      newStatus = 'partial';
    }

    const [updated] = await trx('bills')
      .where({ id })
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
      })
      .returning('*') as Record<string, unknown>[];

    return { ...updated, payment };
  }

  // Void bill — status='voided' with reversal journals
  async voidBill(trx: Knex.Transaction, tenantId: number, id: number) {
    const bill = await trx('bills').where({ id }).first() as Record<string, unknown> | undefined;
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status === 'voided') throw new BadRequestException('Bill is already voided');

    // If bill has a journal entry, create reversal
    if (bill.journal_entry_id) {
      const jeId = Number(bill.journal_entry_id);
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
            reference: `VOID-${String(bill.bill_number)}`,
            memo: `Reversal for voided bill ${String(bill.bill_number)}`,
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

    const [updated] = await trx('bills')
      .where({ id })
      .update({ status: 'voided' })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // AP Aging report: Current, 1-30, 31-60, 61-90, 90+ based on due_date
  async getApAging(trx: Knex.Transaction) {
    const today = new Date().toISOString().slice(0, 10);

    const bills = await trx('bills')
      .whereNotIn('status', ['voided', 'draft', 'paid'])
      .where('balance_due', '>', 0)
      .select('*')
      .orderBy('due_date', 'asc') as Record<string, unknown>[];

    const buckets = {
      current: { total: 0, bills: [] as Record<string, unknown>[] },
      '1_30': { total: 0, bills: [] as Record<string, unknown>[] },
      '31_60': { total: 0, bills: [] as Record<string, unknown>[] },
      '61_90': { total: 0, bills: [] as Record<string, unknown>[] },
      '90_plus': { total: 0, bills: [] as Record<string, unknown>[] },
    };

    for (const bill of bills) {
      const dueDate = new Date(String(bill.due_date));
      const todayDate = new Date(today);
      const diffMs = todayDate.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const balance = Number(bill.balance_due);

      if (diffDays <= 0) {
        buckets.current.total += balance;
        buckets.current.bills.push(bill);
      } else if (diffDays <= 30) {
        buckets['1_30'].total += balance;
        buckets['1_30'].bills.push(bill);
      } else if (diffDays <= 60) {
        buckets['31_60'].total += balance;
        buckets['31_60'].bills.push(bill);
      } else if (diffDays <= 90) {
        buckets['61_90'].total += balance;
        buckets['61_90'].bills.push(bill);
      } else {
        buckets['90_plus'].total += balance;
        buckets['90_plus'].bills.push(bill);
      }
    }

    // Round totals
    buckets.current.total = Math.round(buckets.current.total * 100) / 100;
    buckets['1_30'].total = Math.round(buckets['1_30'].total * 100) / 100;
    buckets['31_60'].total = Math.round(buckets['31_60'].total * 100) / 100;
    buckets['61_90'].total = Math.round(buckets['61_90'].total * 100) / 100;
    buckets['90_plus'].total = Math.round(buckets['90_plus'].total * 100) / 100;

    const grandTotal = Math.round(
      (buckets.current.total + buckets['1_30'].total + buckets['31_60'].total + buckets['61_90'].total + buckets['90_plus'].total) * 100,
    ) / 100;

    return { buckets, grand_total: grandTotal };
  }
}
