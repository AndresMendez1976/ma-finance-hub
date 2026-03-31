import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Tiers
  await knex('tiers').insert([
    { code: 'basic', name: 'Basic', description: 'Essential features', sort_order: 1 },
    { code: 'standard', name: 'Standard', description: 'Core business features', sort_order: 2 },
    { code: 'pro', name: 'Pro', description: 'Advanced features', sort_order: 3 },
    { code: 'max_pro', name: 'Max Pro', description: 'Full platform access', sort_order: 4 },
  ]);

  // Entitlement definitions
  await knex('entitlement_definitions').insert([
    { key: 'feature.chart_of_accounts', type: 'boolean', description: 'Access to chart of accounts' },
    { key: 'feature.accounts', type: 'boolean', description: 'Access to accounts management' },
    { key: 'feature.journal', type: 'boolean', description: 'Access to journal entries' },
    { key: 'feature.admin', type: 'boolean', description: 'Access to admin provisioning' },
    { key: 'feature.audit_log', type: 'boolean', description: 'Access to audit log' },
    { key: 'limit.max_users', type: 'limit', description: 'Maximum active users per tenant' },
    { key: 'limit.max_concurrent_sessions', type: 'limit', description: 'Maximum concurrent sessions per tenant' },
  ]);

  const tiers = await knex('tiers').select('id', 'code');
  const entitlements = await knex('entitlement_definitions').select('id', 'key');

  const tierId = (code: string) => tiers.find((t) => t.code === code)!.id;
  const entId = (key: string) => entitlements.find((e) => e.key === key)!.id;

  const rows: { tier_id: number; entitlement_definition_id: number; enabled: boolean | null; limit_value: number | null }[] = [];

  const matrix: Record<string, Record<string, { enabled?: boolean; limit?: number }>> = {
    basic: {
      'feature.chart_of_accounts': { enabled: true },
      'feature.accounts': { enabled: true },
      'feature.journal': { enabled: true },
      'feature.admin': { enabled: false },
      'feature.audit_log': { enabled: false },
      'limit.max_users': { limit: 3 },
      'limit.max_concurrent_sessions': { limit: 2 },
    },
    standard: {
      'feature.chart_of_accounts': { enabled: true },
      'feature.accounts': { enabled: true },
      'feature.journal': { enabled: true },
      'feature.admin': { enabled: true },
      'feature.audit_log': { enabled: false },
      'limit.max_users': { limit: 10 },
      'limit.max_concurrent_sessions': { limit: 5 },
    },
    pro: {
      'feature.chart_of_accounts': { enabled: true },
      'feature.accounts': { enabled: true },
      'feature.journal': { enabled: true },
      'feature.admin': { enabled: true },
      'feature.audit_log': { enabled: true },
      'limit.max_users': { limit: 50 },
      'limit.max_concurrent_sessions': { limit: 20 },
    },
    max_pro: {
      'feature.chart_of_accounts': { enabled: true },
      'feature.accounts': { enabled: true },
      'feature.journal': { enabled: true },
      'feature.admin': { enabled: true },
      'feature.audit_log': { enabled: true },
      'limit.max_users': { limit: 500 },
      'limit.max_concurrent_sessions': { limit: 100 },
    },
  };

  for (const [tierCode, entMap] of Object.entries(matrix)) {
    for (const [entKey, val] of Object.entries(entMap)) {
      rows.push({
        tier_id: tierId(tierCode),
        entitlement_definition_id: entId(entKey),
        enabled: val.enabled ?? null,
        limit_value: val.limit ?? null,
      });
    }
  }

  await knex('tier_entitlements').insert(rows);
}

export async function down(knex: Knex): Promise<void> {
  await knex('tier_entitlements').del();
  await knex('entitlement_definitions').del();
  await knex('tiers').del();
}
