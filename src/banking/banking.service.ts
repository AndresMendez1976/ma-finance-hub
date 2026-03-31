// Banking service — bank accounts, transactions, CSV import, reconciliation
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class BankingService {
  async createAccount(trx: Knex.Transaction, tenantId: number, data: {
    name: string; account_id: number; institution?: string; account_number_last4?: string; currency?: string;
  }) {
    const [account] = await trx('bank_accounts').insert({
      tenant_id: tenantId,
      name: data.name,
      account_id: data.account_id,
      institution: data.institution ?? null,
      account_number_last4: data.account_number_last4 ?? null,
      currency: data.currency ?? 'USD',
      current_balance: 0,
    }).returning('*') as Record<string, unknown>[];
    return account;
  }

  async findAllAccounts(trx: Knex.Transaction) {
    const rows = await trx('bank_accounts as ba')
      .leftJoin('accounts as a', 'a.id', 'ba.account_id')
      .select(
        'ba.*',
        'a.name as linked_account_name',
        trx.raw(
          '(SELECT COUNT(*) FROM bank_transactions bt WHERE bt.bank_account_id = ba.id AND bt.reconciled = false) as unreconciled_count',
        ),
      )
      .orderBy('ba.name', 'asc') as Record<string, unknown>[];
    return rows;
  }

  async findOneAccount(trx: Knex.Transaction, id: number) {
    const account = await trx('bank_accounts as ba')
      .leftJoin('accounts as a', 'a.id', 'ba.account_id')
      .select('ba.*', 'a.name as linked_account_name')
      .where('ba.id', id)
      .first() as Record<string, unknown> | undefined;
    return account ?? null;
  }

  async updateAccount(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const account = await trx('bank_accounts').where({ id }).first() as Record<string, unknown> | undefined;
    if (!account) throw new NotFoundException('Bank account not found');
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'account_id', 'institution', 'account_number_last4', 'currency']) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    if (Object.keys(updates).length > 0) {
      await trx('bank_accounts').where({ id }).update(updates);
    }
    return this.findOneAccount(trx, id);
  }

  async createTransaction(trx: Knex.Transaction, tenantId: number, bankAccountId: number, data: {
    date: string; description: string; amount: number; type: string; reference?: string; notes?: string;
  }) {
    const account = await trx('bank_accounts').where({ id: bankAccountId }).first() as Record<string, unknown> | undefined;
    if (!account) throw new NotFoundException('Bank account not found');

    const [txn] = await trx('bank_transactions').insert({
      tenant_id: tenantId,
      bank_account_id: bankAccountId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      reconciled: false,
    }).returning('*') as Record<string, unknown>[];

    // Update current balance
    await trx('bank_accounts').where({ id: bankAccountId }).update({
      current_balance: trx.raw('current_balance + ?', [data.amount]),
    });

    return txn;
  }

  async importCsv(trx: Knex.Transaction, tenantId: number, bankAccountId: number, csvContent: string) {
    const account = await trx('bank_accounts').where({ id: bankAccountId }).first() as Record<string, unknown> | undefined;
    if (!account) throw new NotFoundException('Bank account not found');

    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) throw new BadRequestException('CSV must contain a header row and at least one data row');

    // Skip header
    const dataLines = lines.slice(1);
    const errors: string[] = [];
    let imported = 0;
    let balanceAdjustment = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const parts = line.split(',');
      if (parts.length < 3) {
        errors.push(`Row ${String(i + 2)}: Expected at least 3 columns (date, description, amount)`);
        continue;
      }

      const date = parts[0].trim();
      const description = parts[1].trim();
      const amountStr = parts[2].trim();
      const amount = parseFloat(amountStr);

      if (!date) {
        errors.push(`Row ${String(i + 2)}: Missing date`);
        continue;
      }
      if (!description) {
        errors.push(`Row ${String(i + 2)}: Missing description`);
        continue;
      }
      if (isNaN(amount)) {
        errors.push(`Row ${String(i + 2)}: Invalid amount '${amountStr}'`);
        continue;
      }

      const type = amount > 0 ? 'deposit' : 'withdrawal';

      await trx('bank_transactions').insert({
        tenant_id: tenantId,
        bank_account_id: bankAccountId,
        date,
        description,
        amount,
        type,
        reconciled: false,
      });

      balanceAdjustment += amount;
      imported++;
    }

    // Update current balance with total adjustment
    if (balanceAdjustment !== 0) {
      await trx('bank_accounts').where({ id: bankAccountId }).update({
        current_balance: trx.raw('current_balance + ?', [balanceAdjustment]),
      });
    }

    return { imported, errors };
  }

  async findTransactions(trx: Knex.Transaction, bankAccountId: number, filters: {
    reconciled?: string; from?: string; to?: string; page?: number; limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('bank_transactions')
      .where({ bank_account_id: bankAccountId })
      .orderBy('date', 'desc')
      .orderBy('id', 'desc');

    const countQuery = trx('bank_transactions')
      .where({ bank_account_id: bankAccountId });

    if (filters.reconciled !== undefined) {
      const isReconciled = filters.reconciled === 'true';
      void query.where('reconciled', isReconciled);
      void countQuery.where('reconciled', isReconciled);
    }
    if (filters.from) {
      void query.where('date', '>=', filters.from);
      void countQuery.where('date', '>=', filters.from);
    }
    if (filters.to) {
      void query.where('date', '<=', filters.to);
      void countQuery.where('date', '<=', filters.to);
    }

    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async reconcileTransaction(trx: Knex.Transaction, tenantId: number, txnId: number, data: {
    journal_entry_id?: number; fiscal_period_id?: number;
  }) {
    const txn = await trx('bank_transactions').where({ id: txnId }).first() as Record<string, unknown> | undefined;
    if (!txn) throw new NotFoundException('Bank transaction not found');
    if (txn.reconciled === true) throw new BadRequestException('Transaction is already reconciled');

    let journalEntryId = data.journal_entry_id ?? null;

    if (!journalEntryId && data.fiscal_period_id) {
      // Auto-create journal entry
      const bankAccount = await trx('bank_accounts').where({ id: txn.bank_account_id }).first() as Record<string, unknown> | undefined;
      if (!bankAccount) throw new BadRequestException('Bank account not found');

      const period = await trx('fiscal_periods').where({ id: data.fiscal_period_id }).first() as Record<string, unknown> | undefined;
      if (!period || period.status !== 'open') throw new BadRequestException('Fiscal period not found or not open');

      const lastEntry = await trx('journal_entries')
        .where({ tenant_id: tenantId, fiscal_period_id: data.fiscal_period_id })
        .max('entry_number as max_num')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

      const amount = Number(txn.amount);
      const isPositive = amount >= 0;

      const [entry] = await trx('journal_entries').insert({
        tenant_id: tenantId,
        fiscal_period_id: data.fiscal_period_id,
        entry_number: entryNumber,
        reference: `BANK-${String(txn.id)}`,
        memo: `Bank reconciliation: ${String(txn.description)}`,
        status: 'posted',
        posted_at: trx.fn.now(),
      }).returning('*') as Record<string, unknown>[];

      const absAmount = Math.abs(amount);

      // Positive amount (deposit): Debit bank account, Credit linked account
      // Negative amount (withdrawal): Debit linked account, Credit bank account
      await trx('journal_lines').insert([
        {
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: bankAccount.account_id,
          debit: isPositive ? absAmount : 0,
          credit: isPositive ? 0 : absAmount,
          description: `Bank ${String(txn.type)}: ${String(txn.description)}`,
        },
        {
          tenant_id: tenantId,
          journal_entry_id: entry.id,
          account_id: bankAccount.account_id,
          debit: isPositive ? 0 : absAmount,
          credit: isPositive ? absAmount : 0,
          description: `Bank ${String(txn.type)}: ${String(txn.description)}`,
        },
      ]);

      journalEntryId = Number(entry.id);
    }

    const [updated] = await trx('bank_transactions').where({ id: txnId }).update({
      reconciled: true,
      reconciled_date: trx.fn.now(),
      journal_entry_id: journalEntryId,
    }).returning('*') as Record<string, unknown>[];

    return updated;
  }

  async unreconcileTransaction(trx: Knex.Transaction, txnId: number) {
    const txn = await trx('bank_transactions').where({ id: txnId }).first() as Record<string, unknown> | undefined;
    if (!txn) throw new NotFoundException('Bank transaction not found');
    if (txn.reconciled !== true) throw new BadRequestException('Transaction is not reconciled');

    const [updated] = await trx('bank_transactions').where({ id: txnId }).update({
      reconciled: false,
      reconciled_date: null,
      journal_entry_id: null,
    }).returning('*') as Record<string, unknown>[];

    return updated;
  }

  async reconciliationSummary(trx: Knex.Transaction, bankAccountId: number) {
    const account = await trx('bank_accounts').where({ id: bankAccountId }).first() as Record<string, unknown> | undefined;
    if (!account) throw new NotFoundException('Bank account not found');

    const bankBalance = Number(account.current_balance) || 0;

    // Book balance = sum of reconciled transactions
    const [reconciledSum] = await trx('bank_transactions')
      .where({ bank_account_id: bankAccountId, reconciled: true })
      .sum('amount as total')
      .count('* as count') as Record<string, unknown>[];
    const bookBalance = Number(reconciledSum.total) || 0;

    // Unreconciled stats
    const [unreconciledStats] = await trx('bank_transactions')
      .where({ bank_account_id: bankAccountId, reconciled: false })
      .sum('amount as total')
      .count('* as count') as Record<string, unknown>[];
    const unreconciledCount = Number(unreconciledStats.count) || 0;
    const unreconciledAmount = Number(unreconciledStats.total) || 0;

    return {
      bank_balance: bankBalance,
      book_balance: bookBalance,
      unreconciled_count: unreconciledCount,
      unreconciled_amount: unreconciledAmount,
      difference: bankBalance - bookBalance,
    };
  }
}
