import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateJournalEntryInput {
  tenant_id: number;
  fiscal_period_id: number;
  reference?: string;
  memo?: string;
  lines: { account_id: number; debit: number; credit: number; description?: string }[];
}

@Injectable()
export class JournalService {
  async findAll(trx: Knex.Transaction) {
    return trx('journal_entries').select('*').orderBy('created_at', 'desc');
  }

  async findOne(trx: Knex.Transaction, id: number) {
    const entry = await trx('journal_entries').where({ id }).first();
    if (!entry) return null;
    const lines = await trx('journal_lines').where({ journal_entry_id: id }).select('*');
    return { ...entry, lines };
  }

  private async checkLockDate(trx: Knex.Transaction, tenantId: number, fiscalPeriodId: number) {
    const tenant = await trx('tenants').where({ id: tenantId }).select('lock_date').first();
    if (!tenant?.lock_date) return;

    const period = await trx('fiscal_periods').where({ id: fiscalPeriodId }).first();
    if (!period) return;

    // Period's last day: last day of fiscal_month in fiscal_year
    const periodEnd = new Date(period.fiscal_year, period.fiscal_month, 0);
    const lockDate = new Date(tenant.lock_date);

    if (periodEnd <= lockDate) {
      throw new BadRequestException(
        `Operation blocked: period ${period.fiscal_year}-${String(period.fiscal_month).padStart(2, '0')} ends on or before lock date ${tenant.lock_date}`,
      );
    }
  }

  async create(trx: Knex.Transaction, dto: CreateJournalEntryInput) {
    const period = await trx('fiscal_periods').where({ id: dto.fiscal_period_id }).first();
    if (!period) throw new NotFoundException('Fiscal period not found or does not belong to this tenant');
    if (period.status !== 'open') throw new BadRequestException(`Cannot create entry in fiscal period with status '${period.status}'`);

    await this.checkLockDate(trx, dto.tenant_id, dto.fiscal_period_id);

    const totalDebit = dto.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException(`Entry is not balanced: debit=${totalDebit}, credit=${totalCredit}`);
    }

    const lastEntry = await trx('journal_entries')
      .where({ tenant_id: dto.tenant_id, fiscal_period_id: dto.fiscal_period_id })
      .max('entry_number as max_num')
      .first();
    const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

    const [entry] = await trx('journal_entries')
      .insert({
        tenant_id: dto.tenant_id,
        fiscal_period_id: dto.fiscal_period_id,
        entry_number: entryNumber,
        reference: dto.reference,
        memo: dto.memo,
        status: 'draft',
      })
      .returning('*');

    const lineRows = dto.lines.map((l) => ({
      tenant_id: dto.tenant_id,
      journal_entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }));

    const lines = await trx('journal_lines').insert(lineRows).returning('*');
    return { ...entry, lines };
  }

  async post(trx: Knex.Transaction, id: number) {
    const entry = await trx('journal_entries').where({ id }).first();
    if (!entry) return null;
    if (entry.status !== 'draft') throw new BadRequestException(`Cannot post entry with status '${entry.status}'`);

    const period = await trx('fiscal_periods').where({ id: entry.fiscal_period_id }).first();
    if (!period || period.status !== 'open') throw new BadRequestException('Cannot post: fiscal period is closed');

    await this.checkLockDate(trx, entry.tenant_id, entry.fiscal_period_id);

    const [updated] = await trx('journal_entries')
      .where({ id })
      .update({ status: 'posted', posted_at: trx.fn.now() })
      .returning('*');

    return updated;
  }

  async void(trx: Knex.Transaction, tenantId: number, id: number, reason: string) {
    const entry = await trx('journal_entries').where({ id }).first();
    if (!entry) return null;
    if (entry.status !== 'posted') throw new BadRequestException(`Cannot void entry with status '${entry.status}'`);

    const period = await trx('fiscal_periods').where({ id: entry.fiscal_period_id }).first();
    if (!period || period.status !== 'open') throw new BadRequestException('Cannot void: fiscal period is closed');

    await this.checkLockDate(trx, tenantId, entry.fiscal_period_id);

    await trx('journal_entries').where({ id }).update({ status: 'voided' });

    const originalLines = await trx('journal_lines').where({ journal_entry_id: id }).select('*');

    const lastEntry = await trx('journal_entries')
      .where({ tenant_id: tenantId, fiscal_period_id: entry.fiscal_period_id })
      .max('entry_number as max_num')
      .first();
    const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

    const [reversal] = await trx('journal_entries')
      .insert({
        tenant_id: tenantId,
        fiscal_period_id: entry.fiscal_period_id,
        entry_number: entryNumber,
        reference: `VOID-${entry.reference || entry.id}`,
        memo: `Reversal of entry #${entry.entry_number || entry.id}: ${reason}`,
        status: 'posted',
        posted_at: trx.fn.now(),
      })
      .returning('*');

    const reversalLines = originalLines.map((l: { account_id: number; debit: string; credit: string; description: string | null }) => ({
      tenant_id: tenantId,
      journal_entry_id: reversal.id,
      account_id: l.account_id,
      debit: Number(l.credit),
      credit: Number(l.debit),
      description: `Reversal: ${l.description || ''}`.trim(),
    }));

    const lines = await trx('journal_lines').insert(reversalLines).returning('*');
    return { voidedEntry: { ...entry, status: 'voided' }, reversalEntry: { ...reversal, lines } };
  }

  async trialBalance(trx: Knex.Transaction) {
    const rows = await trx('journal_lines as jl')
      .join('journal_entries as je', 'je.id', 'jl.journal_entry_id')
      .join('accounts as a', 'a.id', 'jl.account_id')
      .where('je.status', 'posted')
      .groupBy('a.id', 'a.account_code', 'a.name', 'a.account_type')
      .select('a.id as account_id', 'a.account_code', 'a.name as account_name', 'a.account_type')
      .sum('jl.debit as total_debit')
      .sum('jl.credit as total_credit');

    return rows.map((r) => ({
      ...r,
      total_debit: Number(r.total_debit) || 0,
      total_credit: Number(r.total_credit) || 0,
      balance: (Number(r.total_debit) || 0) - (Number(r.total_credit) || 0),
    }));
  }
}
