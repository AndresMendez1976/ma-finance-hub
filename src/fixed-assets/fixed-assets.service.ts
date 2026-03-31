// Fixed Assets service — CRUD, depreciation scheduling, disposal, reporting
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { DepreciationService } from './depreciation.service';

@Injectable()
export class FixedAssetsService {
  constructor(private readonly depreciationService: DepreciationService) {}

  // Generate next asset number for a tenant (FA-0001, FA-0002, ...)
  private async nextAssetNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('fixed_assets')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('asset_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'FA-0001';
    const num = parseInt(String(last.asset_number).replace('FA-', ''), 10);
    return `FA-${String(num + 1).padStart(4, '0')}`;
  }

  // Create a new fixed asset
  async create(trx: Knex.Transaction, tenantId: number, createdBy: string, data: Record<string, unknown>) {
    const assetNumber = await this.nextAssetNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for asset creation');

    const [asset] = await trx('fixed_assets')
      .insert({
        tenant_id: tenantId,
        asset_number: assetNumber,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        serial_number: data.serial_number ?? null,
        location: data.location ?? null,
        purchase_date: data.purchase_date,
        purchase_price: data.purchase_price,
        salvage_value: data.salvage_value ?? 0,
        useful_life_months: data.useful_life_months,
        depreciation_method: data.depreciation_method,
        asset_account_id: data.asset_account_id,
        depreciation_expense_account_id: data.depreciation_expense_account_id,
        accumulated_depreciation_account_id: data.accumulated_depreciation_account_id,
        notes: data.notes ?? null,
        status: 'active',
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    return asset;
  }

  // List fixed assets with optional filters
  async findAll(
    trx: Knex.Transaction,
    filters: { status?: string; category?: string; search?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('fixed_assets')
      .select('fixed_assets.*')
      .orderBy('fixed_assets.created_at', 'desc');

    if (filters.status) void query.where('fixed_assets.status', filters.status);
    if (filters.category) void query.where('fixed_assets.category', 'ilike', `%${filters.category}%`);
    if (filters.search) {
      void query.where(function (this: Knex.QueryBuilder) {
        void this.where('fixed_assets.name', 'ilike', `%${filters.search}%`)
          .orWhere('fixed_assets.asset_number', 'ilike', `%${filters.search}%`)
          .orWhere('fixed_assets.serial_number', 'ilike', `%${filters.search}%`);
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

  // Get single fixed asset with depreciation entries
  async findOne(trx: Knex.Transaction, id: number) {
    const asset = await trx('fixed_assets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!asset) return null;

    const depreciationEntries = await trx('depreciation_entries')
      .where({ fixed_asset_id: id })
      .orderBy('period_date', 'asc')
      .select('*') as Record<string, unknown>[];

    return { ...asset, depreciation_entries: depreciationEntries };
  }

  // Update a fixed asset (only active assets)
  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const asset = await trx('fixed_assets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!asset) throw new NotFoundException('Fixed asset not found');
    if (asset.status !== 'active') throw new BadRequestException('Only active assets can be edited');

    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'category', 'serial_number', 'location',
      'salvage_value', 'useful_life_months', 'depreciation_method', 'notes',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    if (Object.keys(updates).length > 0) {
      await trx('fixed_assets').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Get depreciation schedule (delegates to DepreciationService)
  async getDepreciationSchedule(trx: Knex.Transaction, id: number) {
    return this.depreciationService.getDepreciationSchedule(trx, id);
  }

  // Run depreciation for a period (delegates to DepreciationService)
  async runDepreciation(trx: Knex.Transaction, tenantId: number, periodDate: string) {
    return this.depreciationService.runDepreciation(trx, tenantId, periodDate);
  }

  // Dispose of a fixed asset — creates disposal journal entry
  async disposeAsset(trx: Knex.Transaction, tenantId: number, id: number, disposalDate: string, disposalPrice: number) {
    const asset = await trx('fixed_assets').where({ id }).first() as Record<string, unknown> | undefined;
    if (!asset) throw new NotFoundException('Fixed asset not found');
    if (asset.status === 'disposed') throw new BadRequestException('Asset is already disposed');

    const purchasePrice = Number(asset.purchase_price);

    // Get accumulated depreciation from last entry
    const lastEntry = await trx('depreciation_entries')
      .where({ fixed_asset_id: id })
      .orderBy('period_date', 'desc')
      .first() as Record<string, unknown> | undefined;
    const accumulatedDepreciation = lastEntry ? Number(lastEntry.accumulated_total) : 0;
    const bookValue = Math.round((purchasePrice - accumulatedDepreciation) * 100) / 100;

    // Calculate gain or loss on disposal
    const gainLoss = Math.round((disposalPrice - bookValue) * 100) / 100;

    // Create journal entry: Debit Cash + Accumulated Depreciation, Credit Asset Account + Gain/Loss
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

    if (period) {
      const [journal] = await trx('journal_entries')
        .insert({
          tenant_id: tenantId,
          fiscal_period_id: period.id,
          entry_number: entryNumber,
          reference: `DISP-${String(asset.asset_number)}`,
          memo: `Disposal of asset ${String(asset.name)} (${String(asset.asset_number)})`,
          status: 'posted',
          posted_at: trx.fn.now(),
        })
        .returning('*') as Record<string, unknown>[];

      const journalLines: Record<string, unknown>[] = [];

      // Debit Cash (find cash account, code 1000)
      const cashAccount = await trx('accounts')
        .where({ account_code: '1000' })
        .select('id')
        .first() as Record<string, unknown> | undefined;

      if (cashAccount && disposalPrice > 0) {
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: journal.id,
          account_id: cashAccount.id,
          debit: disposalPrice,
          credit: 0,
          description: `Cash received for disposal of ${String(asset.name)}`,
        });
      }

      // Debit Accumulated Depreciation (reverse accumulated)
      if (accumulatedDepreciation > 0) {
        journalLines.push({
          tenant_id: tenantId,
          journal_entry_id: journal.id,
          account_id: asset.accumulated_depreciation_account_id,
          debit: accumulatedDepreciation,
          credit: 0,
          description: `Reverse accumulated depreciation - ${String(asset.name)}`,
        });
      }

      // Credit Asset Account (remove asset at purchase price)
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: journal.id,
        account_id: asset.asset_account_id,
        debit: 0,
        credit: purchasePrice,
        description: `Remove asset - ${String(asset.name)}`,
      });

      // Gain or Loss on Disposal
      if (gainLoss > 0) {
        // Gain — credit
        const gainAccount = await trx('accounts')
          .where({ account_code: '4900' })
          .select('id')
          .first() as Record<string, unknown> | undefined;
        if (gainAccount) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: journal.id,
            account_id: gainAccount.id,
            debit: 0,
            credit: gainLoss,
            description: `Gain on disposal - ${String(asset.name)}`,
          });
        }
      } else if (gainLoss < 0) {
        // Loss — debit
        const lossAccount = await trx('accounts')
          .where({ account_code: '6900' })
          .select('id')
          .first() as Record<string, unknown> | undefined;
        if (lossAccount) {
          journalLines.push({
            tenant_id: tenantId,
            journal_entry_id: journal.id,
            account_id: lossAccount.id,
            debit: Math.abs(gainLoss),
            credit: 0,
            description: `Loss on disposal - ${String(asset.name)}`,
          });
        }
      }

      if (journalLines.length > 0) {
        await trx('journal_lines').insert(journalLines);
      }
    }

    // Update asset status to disposed
    const [disposed] = await trx('fixed_assets')
      .where({ id })
      .update({
        status: 'disposed',
        disposal_date: disposalDate,
        disposal_price: disposalPrice,
      })
      .returning('*') as Record<string, unknown>[];

    return disposed;
  }

  // Get fixed assets report — summary by category and status
  async getFixedAssetsReport(trx: Knex.Transaction) {
    const assets = await trx('fixed_assets')
      .select('*')
      .orderBy('category')
      .orderBy('asset_number') as Record<string, unknown>[];

    // Get latest depreciation entry for each asset
    const assetIds = assets.map((a) => Number(a.id));
    let latestEntries: Record<string, unknown>[] = [];
    if (assetIds.length > 0) {
      latestEntries = await trx('depreciation_entries')
        .whereIn('fixed_asset_id', assetIds)
        .distinctOn('fixed_asset_id')
        .orderBy('fixed_asset_id')
        .orderBy('period_date', 'desc')
        .select('*') as Record<string, unknown>[];
    }

    const entryByAsset = new Map<number, Record<string, unknown>>();
    for (const entry of latestEntries) {
      entryByAsset.set(Number(entry.fixed_asset_id), entry);
    }

    // Summary by category
    const categorySummary: Record<string, {
      count: number;
      total_cost: number;
      total_accumulated_depreciation: number;
      total_book_value: number;
    }> = {};

    let totalCost = 0;
    let totalAccumulatedDepreciation = 0;
    let totalBookValue = 0;

    const assetsWithValues = assets.map((asset) => {
      const purchasePrice = Number(asset.purchase_price);
      const latestEntry = entryByAsset.get(Number(asset.id));
      const accumulatedDepreciation = latestEntry ? Number(latestEntry.accumulated_total) : 0;
      const bookValue = Math.round((purchasePrice - accumulatedDepreciation) * 100) / 100;

      const category = String(asset.category);
      if (!categorySummary[category]) {
        categorySummary[category] = { count: 0, total_cost: 0, total_accumulated_depreciation: 0, total_book_value: 0 };
      }
      categorySummary[category].count += 1;
      categorySummary[category].total_cost += purchasePrice;
      categorySummary[category].total_accumulated_depreciation += accumulatedDepreciation;
      categorySummary[category].total_book_value += bookValue;

      totalCost += purchasePrice;
      totalAccumulatedDepreciation += accumulatedDepreciation;
      totalBookValue += bookValue;

      return {
        ...asset,
        accumulated_depreciation: accumulatedDepreciation,
        current_book_value: bookValue,
      };
    });

    return {
      assets: assetsWithValues,
      by_category: categorySummary,
      totals: {
        total_assets: assets.length,
        total_cost: Math.round(totalCost * 100) / 100,
        total_accumulated_depreciation: Math.round(totalAccumulatedDepreciation * 100) / 100,
        total_book_value: Math.round(totalBookValue * 100) / 100,
      },
    };
  }
}
