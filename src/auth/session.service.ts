import { Injectable, Inject, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database';
import { EntitlementService } from '../entitlements/entitlement.service';

@Injectable()
export class SessionService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly entitlementService: EntitlementService,
  ) {}

  async trackSession(params: {
    tenantId: number;
    userId: number;
    jti: string;
    issuedAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(params.tenantId)]);

      // Check if session was revoked
      const revoked = await trx('active_sessions')
        .where({ tenant_id: params.tenantId, jti: params.jti })
        .whereNotNull('revoked_at')
        .first() as Record<string, unknown> | undefined;

      if (revoked) {
        throw new UnauthorizedException('Session has been revoked');
      }

      // Check if session already exists and is active
      const existing = await trx('active_sessions')
        .where({ tenant_id: params.tenantId, jti: params.jti })
        .whereNull('revoked_at')
        .where('expires_at', '>', new Date())
        .first() as Record<string, unknown> | undefined;

      if (existing) {
        await trx('active_sessions').where({ id: existing.id as number }).update({ last_seen_at: new Date() });
        return;
      }

      // Clean expired/revoked sessions
      await trx('active_sessions')
        .where({ tenant_id: params.tenantId })
        .where(function () {
          void this.where('expires_at', '<=', new Date()).orWhereNotNull('revoked_at');
        })
        .del();

      // Enforce session limit
      const maxSessions = await this.entitlementService.getLimit(params.tenantId, 'limit.max_concurrent_sessions');
      if (maxSessions !== null) {
        const countResult = await trx('active_sessions')
          .where({ tenant_id: params.tenantId })
          .whereNull('revoked_at')
          .where('expires_at', '>', new Date())
          .count('id as count')
          .first();
        if (Number(countResult?.count ?? 0) >= maxSessions) {
          throw new ForbiddenException(`Session limit reached: your plan allows ${maxSessions} concurrent sessions`);
        }
      }

      await trx('active_sessions').insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        jti: params.jti,
        issued_at: params.issuedAt,
        expires_at: params.expiresAt,
        last_seen_at: new Date(),
      });
    });
  }

  async revokeSession(tenantId: number, jti: string): Promise<boolean> {
    return this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(tenantId)]);
      const updated = await trx('active_sessions')
        .where({ tenant_id: tenantId, jti })
        .whereNull('revoked_at')
        .update({ revoked_at: new Date() });
      return updated > 0;
    });
  }

  async revokeAllUserSessions(tenantId: number, userId: number): Promise<number> {
    const result = await this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(tenantId)]);
      const count = await trx('active_sessions')
        .where({ tenant_id: tenantId, user_id: userId })
        .whereNull('revoked_at')
        .update({ revoked_at: new Date() });
      return count;
    });
    return result ?? 0;
  }

  cleanupExpired(): number {
    // Runs as app_user without tenant context — deletes globally expired/revoked sessions
    // This is safe because DELETE on active_sessions requires tenant_id match (RLS)
    // For cleanup, we use migration_user-level access or iterate per tenant.
    // Simpler: just delete all expired rows across all tenants (migration_user is owner, exempt from RLS)
    // But we connect as app_user... We need a different approach:
    // Delete sessions where expires_at is past AND revoked_at is set (already processed)
    // For now, cleanup happens per-tenant during trackSession.
    // This method is for scheduled/admin use — it would need migration_user connection.
    // Returning 0 as cleanup is handled during trackSession per-tenant.
    return 0;
  }
}
