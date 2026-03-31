import { Controller, Get, Post, Patch, Param, Body, Res, UseGuards, ParseIntPipe, Inject, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement, EntitlementService } from '../entitlements';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database';
import { LoginService } from '../auth/login.service';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { SetLockDateDto } from './dto/set-lock-date.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@Roles('owner', 'admin')
@RequiresEntitlement('feature.admin')
export class AdminController {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly loginService: LoginService,
    private readonly tenantContext: TenantContextService,
    private readonly service: AdminService,
    private readonly audit: AuditService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Get('users')
  async listUsers(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.listUsers(trx, p.tenantId),
    );
  }

  @Post('users')
  async createUser(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateUserDto) {
    return this.db.transaction(async (trx) => {
      // Set caller's context first so INSERT policy (is_current_tenant_admin) passes
      await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(p.tenantId)]);
      await trx.raw("SELECT set_config('app.current_subject', ?, true)", [p.sub]);
      await trx('users').insert({
        external_subject: dto.external_subject,
        display_name: dto.display_name,
        email: dto.email,
      });
      // Switch subject to new user to read back via user_self_select policy
      await trx.raw("SELECT set_config('app.current_subject', ?, true)", [dto.external_subject]);
      const user = await trx('users')
        .where({ external_subject: dto.external_subject })
        .select('id', 'external_subject', 'display_name', 'email', 'is_active')
        .first() as Record<string, unknown> | undefined;
      // Restore caller subject for audit
      await trx.raw("SELECT set_config('app.current_subject', ?, true)", [p.sub]);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'users', entity_id: String(user!.id) });
      return user;
    });
  }

  @Post('memberships')
  async createMembership(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateMembershipDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      // Enforce max_users limit (inside tenant-scoped transaction so RLS works)
      const maxUsers = await this.entitlementService.getLimit(p.tenantId, 'limit.max_users');
      if (maxUsers !== null) {
        const currentCount = await trx('tenant_memberships')
          .where({ tenant_id: p.tenantId, is_active: true })
          .count('id as count')
          .first();
        if (Number(currentCount?.count ?? 0) >= maxUsers) {
          throw new ForbiddenException(
            `User limit reached: your plan allows ${maxUsers} active users`,
          );
        }
      }

      const membership: Record<string, unknown> = await this.service.createMembership(trx, { tenant_id: p.tenantId, user_id: dto.user_id, role: dto.role });
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'tenant_memberships', entity_id: String(membership.id), metadata: { user_id: dto.user_id, role: dto.role } });
      return membership;
    });
  }

  @Patch('memberships/:id')
  async updateMembership(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const membership: Record<string, unknown> = await this.service.updateMembership(trx, id, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'tenant_memberships', entity_id: String(membership.id), metadata: dto });
      return membership;
    });
  }

  @Get('lock-date')
  async getLockDate(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const tenant = await trx('tenants').where({ id: p.tenantId }).select('lock_date').first() as Record<string, unknown> | undefined;
      return { lock_date: (tenant?.lock_date as string | null) ?? null };
    });
  }

  @Patch('lock-date')
  @Roles('owner')
  async setLockDate(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: SetLockDateDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const current = await trx('tenants').where({ id: p.tenantId }).select('lock_date').first() as Record<string, unknown> | undefined;
      const newDate = dto.lock_date;
      const currentLockDate = current?.lock_date as string | null | undefined;

      // Lock date can only move forward, never backward (except to null by explicit clear)
      if (currentLockDate && newDate && new Date(newDate) < new Date(currentLockDate)) {
        throw new ForbiddenException('Lock date can only be moved forward');
      }

      await trx('tenants').where({ id: p.tenantId }).update({ lock_date: newDate });
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'set_lock_date',
        entity: 'tenants',
        entity_id: String(p.tenantId),
        metadata: { previous: currentLockDate ?? null, new: newDate },
      });

      return { lock_date: newDate };
    });
  }

  @Get('export/audit-log')
  @Roles('owner')
  async exportAuditLog(@CurrentPrincipal() p: AuthenticatedPrincipal, @Res() res: Response) {
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      return trx('audit_log')
        .where({ tenant_id: p.tenantId })
        .orWhereNull('tenant_id')
        .select('id', 'tenant_id', 'actor_subject', 'action', 'entity', 'entity_id', 'metadata', 'created_at')
        .orderBy('created_at', 'asc');
    });
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'audit_log', metadata: { count: data.length } }),
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('export/trial-balance')
  @Roles('owner', 'admin')
  async exportTrialBalance(@CurrentPrincipal() p: AuthenticatedPrincipal, @Res() res: Response) {
    // Defer to journal service which already has trial balance
    const { JournalService } = await import('../journal/journal.service');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const svc = new JournalService();
      return svc.trialBalance(trx);
    });
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'trial_balance' }),
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=trial-balance-${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Post('users/:id/set-password')
  @Roles('owner')
  async setPassword(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string },
  ) {
    if (!body.password || body.password.length < 8) {
      throw new ForbiddenException('Password must be at least 8 characters');
    }
    await this.loginService.setPassword(id, body.password);
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'set_password', entity: 'users', entity_id: String(id) }),
    );
    return { success: true };
  }
}
