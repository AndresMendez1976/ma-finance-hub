// Depreciation Service — straight line and declining balance calculations
import { Injectable, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class DepreciationService {
  // Calculate monthly depreciation for straight line method
  calculateStraightLine(purchasePrice: number, salvageValue: number, usefulLifeMonths: number): number {
    return Math.round(((purchasePrice - salvageValue) / usefulLifeMonths) * 100) / 100;
  }

  // Calculate monthly depreciation for declining balance method
  calculateDecliningBalance(bookValue: number, salvageValue: number, usefulLifeYears: number): number {
    const annualRate = 2 / usefulLifeYears; // Double declining
    const monthly = Math.round((bookValue * annualRate / 12) * 100) / 100;
    // Don't depreciate below salvage value
    if (bookValue - monthly < salvageValue) {
      return Math.max(0, Math.round((bookValue - salvageValue) * 100) / 100);
    }
    return monthly;
  }

  // Get depreciation schedule projection for an asset
  async getDepreciationSchedule(trx: Knex.Transaction, assetId: number): Promise<Record<string, unknown>[]> {
    const asset = await trx('fixed_assets').where({ id: assetId }).first() as Record<string, unknown> | undefined;
    if (!asset) throw new BadRequestException('Asset not found');

    const purchasePrice = Number(asset.purchase_price);
    const salvageValue = Number(asset.salvage_value);
    const usefulLifeMonths = Number(asset.useful_life_months);
    const method = String(asset.depreciation_method);

    // Get existing entries
    const existing = await trx('depreciation_entries')
      .where({ fixed_asset_id: assetId })
      .orderBy('period_date', 'asc')
      .select('*') as Record<string, unknown>[];

    const schedule: Record<string, unknown>[] = [...existing];

    // Project remaining months
    let bookValue = existing.length > 0 ? Number(existing[existing.length - 1].book_value) : purchasePrice;
    let accumulated = existing.length > 0 ? Number(existing[existing.length - 1].accumulated_total) : 0;
    const startMonth = existing.length;
    const usefulLifeYears = usefulLifeMonths / 12;

    for (let i = startMonth; i < usefulLifeMonths; i++) {
      if (bookValue <= salvageValue) break;

      let depreciation: number;
      if (method === 'straight_line') {
        depreciation = this.calculateStraightLine(purchasePrice, salvageValue, usefulLifeMonths);
      } else {
        depreciation = this.calculateDecliningBalance(bookValue, salvageValue, usefulLifeYears);
      }

      if (depreciation <= 0) break;

      accumulated = Math.round((accumulated + depreciation) * 100) / 100;
      bookValue = Math.round((purchasePrice - accumulated) * 100) / 100;

      // Calculate the month date
      const purchaseDate = new Date(String(asset.purchase_date));
      const periodDate = new Date(purchaseDate);
      periodDate.setMonth(periodDate.getMonth() + i + 1);

      schedule.push({
        period_date: periodDate.toISOString().slice(0, 10),
        depreciation_amount: depreciation,
        accumulated_total: accumulated,
        book_value: bookValue,
        is_projected: !('id' in (existing[i] || {})),
      });
    }

    return schedule;
  }

  // Run depreciation for a period — creates entries + journal entries for all active assets
  async runDepreciation(trx: Knex.Transaction, tenantId: number, periodDate: string): Promise<Record<string, unknown>[]> {
    const assets = await trx('fixed_assets')
      .where({ status: 'active' })
      .select('*') as Record<string, unknown>[];

    const results: Record<string, unknown>[] = [];

    for (const asset of assets) {
      const purchasePrice = Number(asset.purchase_price);
      const salvageValue = Number(asset.salvage_value);
      const usefulLifeMonths = Number(asset.useful_life_months);
      const method = String(asset.depreciation_method);
      const usefulLifeYears = usefulLifeMonths / 12;

      // Get last entry to determine current book value
      const lastEntry = await trx('depreciation_entries')
        .where({ fixed_asset_id: asset.id })
        .orderBy('period_date', 'desc')
        .first() as Record<string, unknown> | undefined;

      // Check if already depreciated for this period
      const existingForPeriod = await trx('depreciation_entries')
        .where({ fixed_asset_id: asset.id, period_date: periodDate })
        .first() as Record<string, unknown> | undefined;
      if (existingForPeriod) continue;

      const bookValue = lastEntry ? Number(lastEntry.book_value) : purchasePrice;
      const accumulated = lastEntry ? Number(lastEntry.accumulated_total) : 0;

      if (bookValue <= salvageValue) {
        // Mark as fully depreciated
        await trx('fixed_assets').where({ id: asset.id }).update({ status: 'fully_depreciated' });
        continue;
      }

      let depreciation: number;
      if (method === 'straight_line') {
        depreciation = this.calculateStraightLine(purchasePrice, salvageValue, usefulLifeMonths);
      } else {
        depreciation = this.calculateDecliningBalance(bookValue, salvageValue, usefulLifeYears);
      }

      if (depreciation <= 0) continue;

      const newAccumulated = Math.round((accumulated + depreciation) * 100) / 100;
      const newBookValue = Math.round((purchasePrice - newAccumulated) * 100) / 100;

      // Create journal entry: Debit Depreciation Expense, Credit Accumulated Depreciation
      const lastJournal = await trx('journal_entries')
        .where({ tenant_id: tenantId })
        .orderBy('id', 'desc')
        .select('entry_number')
        .first() as Record<string, unknown> | undefined;
      const entryNumber = (Number(lastJournal?.entry_number) || 0) + 1;

      // Find an open fiscal period
      const period = await trx('fiscal_periods')
        .where({ tenant_id: tenantId, status: 'open' })
        .first() as Record<string, unknown> | undefined;

      let journalEntryId: number | null = null;
      if (period) {
        const [journal] = await trx('journal_entries')
          .insert({
            tenant_id: tenantId,
            fiscal_period_id: period.id,
            entry_number: entryNumber,
            reference: `DEP-${String(asset.asset_number)}-${periodDate}`,
            memo: `Depreciation - ${String(asset.name)} - ${periodDate}`,
            status: 'posted',
            posted_at: trx.fn.now(),
          })
          .returning('*') as Record<string, unknown>[];

        await trx('journal_lines').insert([
          {
            tenant_id: tenantId,
            journal_entry_id: journal.id,
            account_id: asset.depreciation_expense_account_id,
            debit: depreciation,
            credit: 0,
            description: `Depreciation expense - ${String(asset.name)}`,
          },
          {
            tenant_id: tenantId,
            journal_entry_id: journal.id,
            account_id: asset.accumulated_depreciation_account_id,
            debit: 0,
            credit: depreciation,
            description: `Accumulated depreciation - ${String(asset.name)}`,
          },
        ]);

        journalEntryId = Number(journal.id);
      }

      // Create depreciation entry
      const [entry] = await trx('depreciation_entries')
        .insert({
          tenant_id: tenantId,
          fixed_asset_id: asset.id,
          period_date: periodDate,
          depreciation_amount: depreciation,
          accumulated_total: newAccumulated,
          book_value: newBookValue,
          journal_entry_id: journalEntryId,
        })
        .returning('*') as Record<string, unknown>[];

      // Check if fully depreciated
      if (newBookValue <= salvageValue) {
        await trx('fixed_assets').where({ id: asset.id }).update({ status: 'fully_depreciated' });
      }

      results.push(entry);
    }

    return results;
  }
}
