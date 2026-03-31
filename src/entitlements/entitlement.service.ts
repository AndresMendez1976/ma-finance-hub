import { Injectable, Inject, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database';
import { CacheStore } from '../common/cache';
import { CACHE_STORE } from '../common/redis.module';

export interface EffectiveEntitlement {
  key: string;
  type: 'boolean' | 'limit';
  enabled: boolean | null;
  limitValue: number | null;
}

interface TierCacheValue {
  tierId: number;
  tierCode: string;
  entitlements: EffectiveEntitlement[];
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    @Inject(CACHE_STORE) private readonly cache: CacheStore<TierCacheValue>,
  ) {}

  async invalidateCache(tenantId: number): Promise<void> {
    await this.cache.delete(String(tenantId));
    this.logger.log(`Entitlement cache invalidated for tenant ${tenantId}`);
  }

  async getActiveTier(tenantId: number): Promise<{ tierId: number; tierCode: string } | null> {
    const cached = await this.cache.get(String(tenantId));
    if (cached) return { tierId: cached.tierId, tierCode: cached.tierCode };

    return this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(tenantId)]);

      const row = await trx('tenant_tiers as tt')
        .join('tiers as t', 't.id', 'tt.tier_id')
        .where({ 'tt.tenant_id': tenantId, 'tt.is_active': true, 't.is_active': true })
        .whereRaw('tt.starts_at <= now()')
        .where(function () {
          void this.whereNull('tt.ends_at').orWhereRaw('tt.ends_at > now()');
        })
        .select('t.id as tier_id', 't.code as tier_code')
        .first() as Record<string, unknown> | undefined;

      if (!row) return null;

      const tierId = Number(row.tier_id);
      const tierCode = String(row.tier_code);
      const entitlements: EffectiveEntitlement[] = await this.getEffectiveEntitlementsRaw(tierId);

      await this.cache.set(String(tenantId), { tierId, tierCode, entitlements }, CACHE_TTL_MS);
      return { tierId, tierCode };
    });
  }

  async getEffectiveEntitlements(tierId: number): Promise<EffectiveEntitlement[]> {
    // For Redis: we'd need a reverse index. For now, fall through to DB.
    return this.getEffectiveEntitlementsRaw(tierId);
  }

  private async getEffectiveEntitlementsRaw(tierId: number): Promise<EffectiveEntitlement[]> {
    const rows: Record<string, unknown>[] = await this.db('tier_entitlements as te')
      .join('entitlement_definitions as ed', 'ed.id', 'te.entitlement_definition_id')
      .where({ 'te.tier_id': tierId, 'ed.is_active': true })
      .select('ed.key', 'ed.type', 'te.enabled', 'te.limit_value');

    return rows.map((r) => ({
      key: r.key as string,
      type: r.type as 'boolean' | 'limit',
      enabled: r.enabled as boolean | null,
      limitValue: r.limit_value !== null ? Number(r.limit_value) : null,
    }));
  }

  async isFeatureEnabled(tenantId: number, featureKey: string): Promise<boolean> {
    const tier = await this.getActiveTier(tenantId);
    if (!tier) return false;
    const cached = await this.cache.get(String(tenantId));
    if (cached) return cached.entitlements.find((e) => e.key === featureKey)?.enabled === true;
    const entitlements = await this.getEffectiveEntitlementsRaw(tier.tierId);
    return entitlements.find((e) => e.key === featureKey)?.enabled === true;
  }

  async getLimit(tenantId: number, limitKey: string): Promise<number | null> {
    const tier = await this.getActiveTier(tenantId);
    if (!tier) return null;
    const cached = await this.cache.get(String(tenantId));
    if (cached) return cached.entitlements.find((e) => e.key === limitKey)?.limitValue ?? null;
    const entitlements = await this.getEffectiveEntitlementsRaw(tier.tierId);
    return entitlements.find((e) => e.key === limitKey)?.limitValue ?? null;
  }
}
