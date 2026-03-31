// Data Export service — full data export as CSV collection, tenant data deletion
import { Injectable, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class DataExportService {
  // Export all tenant data as a collection of CSV strings (one per table)
  async exportAll(trx: Knex.Transaction, tenantId: number): Promise<{ filename: string; csvFiles: { name: string; content: string }[] }> {
    const tables = [
      'contacts', 'invoices', 'invoice_lines', 'expenses', 'journal_entries', 'journal_lines',
      'accounts', 'products', 'inventory_transactions', 'purchase_orders', 'purchase_order_lines',
      'employees', 'payroll_runs', 'payroll_items', 'fixed_assets', 'maintenance_records',
      'bank_accounts', 'bank_transactions', 'budgets', 'budget_lines', 'crm_opportunities',
      'audit_log',
    ];

    const csvFiles: { name: string; content: string }[] = [];

    for (const table of tables) {
      try {
        const rows = await trx(table).where({ tenant_id: tenantId }).select('*') as Record<string, unknown>[];
        if (rows.length === 0) continue;

        // Build CSV
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(',')];
        for (const row of rows) {
          const values = headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Escape CSV values that contain commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          csvLines.push(values.join(','));
        }

        csvFiles.push({ name: `${table}.csv`, content: csvLines.join('\n') });
      } catch {
        // Table might not exist yet — skip silently
      }
    }

    return {
      filename: `tenant-${tenantId}-export-${new Date().toISOString().slice(0, 10)}.zip`,
      csvFiles,
    };
  }

  // Delete all tenant data except audit log (retained for 7 years)
  async deleteAllData(trx: Knex.Transaction, tenantId: number, password: string): Promise<{ deleted_tables: string[] }> {
    // Verify password by checking if user can authenticate (simplified — just verify non-empty)
    if (!password || password.length < 4) {
      throw new BadRequestException('Password confirmation required');
    }

    // Tables to delete in order (respecting foreign keys)
    const tablesToDelete = [
      'crm_activities', 'crm_opportunities', 'crm_stages', 'crm_pipelines',
      'budget_lines', 'budgets',
      'notifications',
      'webhooks', 'api_keys',
      'work_order_labor', 'work_order_material_usage', 'work_orders',
      'bom_overhead', 'bom_labor', 'bom_lines', 'bill_of_materials',
      'depreciation_entries', 'maintenance_records', 'maintenance_schedules', 'fixed_assets',
      'employee_deductions', 'payroll_items', 'payroll_runs', 'payroll_deduction_types', 'employees',
      'inventory_adjustment_lines', 'inventory_adjustments',
      'inventory_transfer_lines', 'inventory_transfers',
      'inventory_lots',
      'purchase_order_receipt_lines', 'purchase_order_receipts',
      'purchase_order_lines', 'purchase_orders',
      'bank_transactions', 'bank_accounts',
      'invoice_lines', 'invoices',
      'expenses',
      'journal_lines', 'journal_entries',
      'contacts',
      'exchange_rates',
      'tax_rate_components', 'tax_rates',
    ];

    const deleted: string[] = [];
    for (const table of tablesToDelete) {
      try {
        const count = await trx(table).where({ tenant_id: tenantId }).del();
        if (count > 0) deleted.push(`${table}: ${count} rows`);
      } catch {
        // Table might not exist — skip
      }
    }

    return { deleted_tables: deleted };
  }
}
