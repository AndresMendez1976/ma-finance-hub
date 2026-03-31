#!/usr/bin/env node
// Seed a standard GAAP chart of accounts for a tenant.
// Usage: node scripts/seed-gaap-chart.js [tenant_id] [chart_name]
// If no tenant_id given, uses the demo tenant.

const knex = require('knex');
const path = require('path');

// Try loading env from multiple sources
const envFile = process.env.DB_HOST
  ? null
  : path.resolve(__dirname, '..', '.env.development');
if (envFile) {
  try { require('dotenv').config({ path: envFile }); } catch { /* no dotenv in prod */ }
}

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ma_finance_hub',
    user: process.env.DB_MIGRATION_USER || 'migration_user',
    password: process.env.DB_MIGRATION_PASSWORD || 'migration_password_dev',
  },
});

// Standard GAAP chart of accounts
const GAAP_ACCOUNTS = [
  // Assets (1000-1999)
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1010', name: 'Petty Cash', type: 'asset' },
  { code: '1020', name: 'Checking Account', type: 'asset' },
  { code: '1050', name: 'Savings Account', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset' },
  { code: '1310', name: 'Prepaid Insurance', type: 'asset' },
  { code: '1320', name: 'Prepaid Rent', type: 'asset' },
  { code: '1500', name: 'Furniture & Equipment', type: 'asset' },
  { code: '1510', name: 'Vehicles', type: 'asset' },
  { code: '1520', name: 'Buildings', type: 'asset' },
  { code: '1530', name: 'Land', type: 'asset' },
  { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'asset' },
  { code: '1610', name: 'Accumulated Depreciation - Vehicles', type: 'asset' },
  { code: '1620', name: 'Accumulated Depreciation - Buildings', type: 'asset' },
  // Liabilities (2000-2999)
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability' },
  { code: '2110', name: 'Accrued Salaries', type: 'liability' },
  { code: '2120', name: 'Accrued Interest', type: 'liability' },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability' },
  { code: '2300', name: 'Short-term Debt', type: 'liability' },
  { code: '2310', name: 'Credit Card Payable', type: 'liability' },
  { code: '2400', name: 'Current Portion of Long-term Debt', type: 'liability' },
  { code: '2500', name: 'Long-term Debt', type: 'liability' },
  { code: '2510', name: 'Mortgage Payable', type: 'liability' },
  { code: '2600', name: 'Notes Payable', type: 'liability' },
  // Equity (3000-3999)
  { code: '3000', name: "Owner's Capital", type: 'equity' },
  { code: '3100', name: "Owner's Draws", type: 'equity' },
  { code: '3200', name: 'Retained Earnings', type: 'equity' },
  { code: '3300', name: 'Common Stock', type: 'equity' },
  { code: '3400', name: 'Additional Paid-in Capital', type: 'equity' },
  // Revenue (4000-4999)
  { code: '4000', name: 'Sales Revenue', type: 'revenue' },
  { code: '4100', name: 'Service Revenue', type: 'revenue' },
  { code: '4200', name: 'Interest Income', type: 'revenue' },
  { code: '4300', name: 'Other Income', type: 'revenue' },
  { code: '4400', name: 'Gain on Asset Disposal', type: 'revenue' },
  // Cost of Goods Sold (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5100', name: 'Direct Labor', type: 'expense' },
  { code: '5200', name: 'Direct Materials', type: 'expense' },
  { code: '5300', name: 'Manufacturing Overhead', type: 'expense' },
  // Operating Expenses (6000-6999)
  { code: '6000', name: 'Rent Expense', type: 'expense' },
  { code: '6050', name: 'Utilities Expense', type: 'expense' },
  { code: '6100', name: 'Salaries & Wages', type: 'expense' },
  { code: '6150', name: 'Payroll Taxes', type: 'expense' },
  { code: '6200', name: 'Insurance Expense', type: 'expense' },
  { code: '6300', name: 'Office Supplies', type: 'expense' },
  { code: '6350', name: 'Postage & Shipping', type: 'expense' },
  { code: '6400', name: 'Marketing & Advertising', type: 'expense' },
  { code: '6450', name: 'Professional Fees', type: 'expense' },
  { code: '6500', name: 'Depreciation Expense', type: 'expense' },
  { code: '6550', name: 'Amortization Expense', type: 'expense' },
  { code: '6600', name: 'Software & Technology', type: 'expense' },
  { code: '6650', name: 'Telephone & Internet', type: 'expense' },
  { code: '6700', name: 'Travel Expense', type: 'expense' },
  { code: '6750', name: 'Meals & Entertainment', type: 'expense' },
  { code: '6800', name: 'Repairs & Maintenance', type: 'expense' },
  { code: '6850', name: 'Taxes & Licenses', type: 'expense' },
  { code: '6900', name: 'Miscellaneous Expense', type: 'expense' },
  // Other Expenses (7000-7999)
  { code: '7000', name: 'Interest Expense', type: 'expense' },
  { code: '7100', name: 'Bank Fees', type: 'expense' },
  { code: '7200', name: 'Loss on Asset Disposal', type: 'expense' },
  { code: '7300', name: 'Bad Debt Expense', type: 'expense' },
];

async function main() {
  const tenantId = parseInt(process.argv[2], 10) || 1;
  const chartName = process.argv[3] || 'Standard GAAP';

  console.log(`Seeding GAAP chart for tenant ${tenantId}...`);

  // Check if chart already exists for this tenant with same name
  let chart = await db('chart_of_accounts').where({ tenant_id: tenantId, name: chartName }).first();
  if (chart) {
    console.log(`Chart "${chartName}" already exists (id=${chart.id}). Checking accounts...`);
  } else {
    [chart] = await db('chart_of_accounts').insert({ tenant_id: tenantId, name: chartName, description: 'Standard US GAAP chart of accounts' }).returning('*');
    console.log(`Created chart: ${chartName} (id=${chart.id})`);
  }

  // Insert accounts that don't already exist
  let created = 0;
  let skipped = 0;
  for (const acct of GAAP_ACCOUNTS) {
    const existing = await db('accounts').where({ tenant_id: tenantId, chart_id: chart.id, account_code: acct.code }).first();
    if (existing) {
      skipped++;
      continue;
    }
    await db('accounts').insert({
      tenant_id: tenantId,
      chart_id: chart.id,
      account_code: acct.code,
      name: acct.name,
      account_type: acct.type,
      is_active: true,
    });
    created++;
  }

  console.log(`Done: ${created} accounts created, ${skipped} skipped (already exist).`);
  console.log(`Total GAAP accounts: ${GAAP_ACCOUNTS.length}`);
  await db.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
