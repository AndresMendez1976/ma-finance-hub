import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityGuard } from './identity.guard';
import { RolesGuard } from './roles.guard';
import { CurrentPrincipal, CurrentIdentity, Roles } from './decorators';
import { AuthenticatedPrincipal, ResolvedIdentity } from './interfaces';
import { TenantContextService } from './tenant-context.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard)
export class AuthController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  @Get('context')
  getContext(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @CurrentIdentity() identity: ResolvedIdentity,
  ) {
    return {
      jwt: {
        sub: principal.sub,
        tenantId: principal.tenantId,
        roles: principal.roles,
        issuer: principal.issuer,
      },
      user: identity.user,
      membership: identity.membership,
    };
  }

  @Post('logout')
  async logout(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    if (p.jti) {
      await this.sessionService.revokeSession(p.tenantId, p.jti);
      await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
        this.audit.log(trx, {
          tenant_id: p.tenantId,
          actor_subject: p.sub,
          action: 'session_revoke',
          entity: 'active_sessions',
          metadata: { jti: p.jti },
        }),
      );
    }
    return { revoked: true };
  }

  @Post('logout-all')
  @Roles('owner', 'admin')
  async logoutAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @CurrentIdentity() identity: ResolvedIdentity,
  ) {
    const count = await this.sessionService.revokeAllUserSessions(
      p.tenantId,
      Number(identity.user.id),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'session_revoke_all',
        entity: 'active_sessions',
        metadata: { revoked_count: count },
      }),
    );
    return { revokedCount: count };
  }

  @Get('tenant-smoke')
  async tenantSmoke(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @CurrentIdentity() identity: ResolvedIdentity,
  ) {
    return this.tenantContext.runInTenantContext(
      principal.tenantId,
      principal.sub,
      async (trx) => {
        const tenantRow = await trx('tenants').select('id', 'name', 'slug').first();
        const fpCount = await trx('fiscal_periods').count('id as count').first();
        return {
          authenticatedTenantId: principal.tenantId,
          dbTenant: tenantRow || null,
          fiscalPeriodsCount: Number(fpCount?.count ?? 0),
          user: identity.user,
          role: identity.membership.role,
        };
      },
    );
  }

  @Get('rbac/admin')
  @Roles('owner', 'admin')
  rbacAdmin(@CurrentIdentity() identity: ResolvedIdentity) {
    return { allowed: true, role: identity.membership.role };
  }

  @Get('rbac/owner')
  @Roles('owner')
  rbacOwner(@CurrentIdentity() identity: ResolvedIdentity) {
    return { allowed: true, role: identity.membership.role };
  }

  @Get('rbac/manager-plus')
  @Roles('owner', 'admin', 'manager')
  rbacManagerPlus(@CurrentIdentity() identity: ResolvedIdentity) {
    return { allowed: true, role: identity.membership.role };
  }
}
