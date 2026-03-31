import { Controller, Get, Post, Body, UseGuards, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityGuard } from '../auth/identity.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentPrincipal } from '../auth/decorators/current-principal.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedPrincipal } from '../auth/interfaces/authenticated-principal.interface';
import { AuditService } from '../auth/audit.service';
import { InternalApiKeyGuard } from '../common/internal-api-key.guard';
import { IsInt, Min } from 'class-validator';
import { EntitlementService, EffectiveEntitlement } from './entitlement.service';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database';

class InternalAssignTierDto {
  @IsInt()
  @Min(1)
  tenant_id!: number;

  @IsInt()
  @Min(1)
  tier_id!: number;
}

@ApiTags('Tiers')
@Controller('tiers')
export class TierController {
  constructor(
    private readonly entitlementService: EntitlementService,
    private readonly audit: AuditService,
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
  ) {}

  @Get('catalog')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getCatalog() {
    return this.db('tiers')
      .where({ is_active: true })
      .select('id', 'code', 'name', 'description', 'sort_order')
      .orderBy('sort_order');
  }

  @Get('current')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getCurrentTier(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    const tier = await this.entitlementService.getActiveTier(p.tenantId);
    if (!tier) return { tier: null, entitlements: [] };
    const entitlements = await this.entitlementService.getEffectiveEntitlements(tier.tierId);
    return { tier, entitlements };
  }

  /**
   * INTERNAL ONLY — requires x-internal-api-key header.
   * Not accessible via JWT auth. Used by billing/ops systems.
   */
  @Post('internal/assign')
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @UseGuards(InternalApiKeyGuard)
  async assignTier(@Body() dto: InternalAssignTierDto) {
    const targetTier = await this.db('tiers').where({ id: dto.tier_id, is_active: true }).first() as Record<string, unknown> | undefined;
    if (!targetTier) throw new BadRequestException('Target tier not found or inactive');

    const targetEntitlements = await this.entitlementService.getEffectiveEntitlements(dto.tier_id);
    await this.validateDowngrade(dto.tenant_id, targetEntitlements);

    return this.db.transaction(async (trx) => {
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(dto.tenant_id)]);
      await trx.raw("SELECT set_config('app.internal_operation', 'true', true)");

      const currentTier = await this.entitlementService.getActiveTier(dto.tenant_id);

      await trx('tenant_tiers')
        .where({ tenant_id: dto.tenant_id, is_active: true })
        .update({ is_active: false, ends_at: trx.fn.now() });

      const [row] = await trx('tenant_tiers')
        .insert({ tenant_id: dto.tenant_id, tier_id: dto.tier_id, is_active: true, starts_at: trx.fn.now() })
        .returning('*') as Record<string, unknown>[];

      await this.audit.log(trx, {
        tenant_id: dto.tenant_id,
        actor_subject: 'system:internal-api',
        action: 'tier_change',
        entity: 'tenant_tiers',
        entity_id: String(row.id),
        metadata: { from_tier: currentTier?.tierCode ?? null, to_tier: targetTier.code },
      });

      await this.entitlementService.invalidateCache(dto.tenant_id);
      const newEntitlements = await this.entitlementService.getEffectiveEntitlements(dto.tier_id);
      return { tenantTier: row, tier: { tierId: dto.tier_id, tierCode: targetTier.code }, entitlements: newEntitlements };
    });
  }

  private async validateDowngrade(tenantId: number, targetEntitlements: EffectiveEntitlement[]) {
    const violations: string[] = [];

    const maxUsers = targetEntitlements.find((e) => e.key === 'limit.max_users');
    if (maxUsers?.limitValue !== null && maxUsers?.limitValue !== undefined) {
      const res: { rows: Record<string, unknown>[] } = await this.db.raw(
        'SELECT count(*)::int as count FROM tenant_memberships WHERE tenant_id = ? AND is_active = true',
        [tenantId],
      );
      if (Number(res.rows[0]?.count ?? 0) > maxUsers.limitValue) {
        violations.push(`Active users (${String(res.rows[0].count)}) exceeds target limit (${maxUsers.limitValue})`);
      }
    }

    if (violations.length > 0) {
      throw new ForbiddenException({ message: 'Downgrade blocked', violations });
    }
  }
}
