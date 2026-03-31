// Bank rules controller — CRUD, test, apply rules
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { BankRuleService } from './bank-rule.service';
import { CreateBankRuleDto } from './dto/create-bank-rule.dto';

@ApiTags('Bank Rules')
@ApiBearerAuth()
@Controller('bank-rules')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class BankRulesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BankRuleService,
    private readonly audit: AuditService,
  ) {}

  // List all bank rules
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx),
    );
  }

  // Get single bank rule
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rule = await this.service.findOne(trx, id);
      if (!rule) throw new NotFoundException();
      return rule;
    });
  }

  // Create new bank rule
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateBankRuleDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rule = await this.service.create(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'bank_rules',
        entity_id: String(rule.id),
        metadata: { name: String(rule.name) },
      });
      return rule;
    });
  }

  // Update bank rule
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateBankRuleDto> & { is_active?: boolean },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const rule = await this.service.update(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'bank_rules',
        entity_id: String(id),
      });
      return rule;
    });
  }

  // Delete bank rule
  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.delete(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'bank_rules',
        entity_id: String(id),
      });
      return result;
    });
  }

  // Test a transaction against all active rules
  @Post('test')
  @Roles('owner', 'admin', 'manager')
  async testRule(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { description: string; amount: number; type: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.testRule(trx, dto),
    );
  }
}

// Separate controller for apply-rules endpoint on bank-accounts
import { Controller as Ctrl } from '@nestjs/common';

@ApiTags('Bank Rules')
@ApiBearerAuth()
@Ctrl('bank-accounts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class BankAccountApplyRulesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BankRuleService,
    private readonly audit: AuditService,
  ) {}

  // Apply rules to unreconciled transactions of a bank account
  @Post(':id/apply-rules')
  @Roles('owner', 'admin', 'manager')
  async applyRules(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const suggestions = await this.service.applyRules(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'apply_rules',
        entity: 'bank_accounts',
        entity_id: String(id),
        metadata: { suggestions_count: String(suggestions.length) },
      });
      return suggestions;
    });
  }
}
