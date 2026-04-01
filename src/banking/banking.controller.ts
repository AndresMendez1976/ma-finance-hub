// Banking controller — bank accounts, transactions, CSV import, reconciliation
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { BankingService } from './banking.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { ReconcileTransactionDto } from './dto/reconcile-transaction.dto';

@ApiTags('Banking')
@ApiBearerAuth()
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class BankAccountsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BankingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllAccounts(trx),
    );
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateBankAccountDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const account = await this.service.createAccount(trx, p.tenantId, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'bank_accounts', entity_id: String(account.id), metadata: { name: String(account.name) } });
      return account;
    });
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBankAccountDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const account = await this.service.updateAccount(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'update', entity: 'bank_accounts', entity_id: String(id) });
      return account;
    });
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const account = await this.service.findOneAccount(trx, id);
      if (!account) throw new NotFoundException();
      return account;
    });
  }

  @Post(':id/transactions')
  @Roles('owner', 'admin', 'manager')
  async createTransaction(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBankTransactionDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const txn = await this.service.createTransaction(trx, p.tenantId, id, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'bank_transactions', entity_id: String(txn.id), metadata: { bank_account_id: String(id) } });
      return txn;
    });
  }

  @Post(':id/import-csv')
  @Roles('owner', 'admin', 'manager')
  async importCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ImportCsvDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.importCsv(trx, p.tenantId, id, dto.csv);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'import_csv', entity: 'bank_transactions', entity_id: String(id), metadata: { imported: String(result.imported), errors: String(result.errors.length) } });
      return result;
    });
  }

  @Get(':id/transactions')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'reconciled', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findTransactions(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Query('reconciled') reconciled?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findTransactions(trx, id, {
        reconciled,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get(':id/reconciliation-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async reconciliationSummary(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.reconciliationSummary(trx, id),
    );
  }
}

@ApiTags('Banking')
@ApiBearerAuth()
@Controller('banking/plaid')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class PlaidController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BankingService,
    private readonly audit: AuditService,
  ) {}

  @Post('create-link-token')
  @Roles('owner', 'admin', 'manager')
  async createLinkToken(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.createPlaidLinkToken(trx, p.tenantId),
    );
  }

  @Post('exchange-token')
  @Roles('owner', 'admin', 'manager')
  async exchangeToken(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { public_token: string; account_id: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const account = await this.service.exchangePlaidToken(trx, p.tenantId, dto.public_token, dto.account_id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'plaid_link', entity: 'bank_accounts', entity_id: String(account.id) });
      return account;
    });
  }

  @Post('sync/:bankAccountId')
  @Roles('owner', 'admin', 'manager')
  async sync(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('bankAccountId', ParseIntPipe) bankAccountId: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.syncPlaidTransactions(trx, p.tenantId, bankAccountId);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'plaid_sync', entity: 'bank_accounts', entity_id: String(bankAccountId), metadata: { imported: String(result.imported) } });
      return result;
    });
  }
}

@ApiTags('Banking')
@ApiBearerAuth()
@Controller('bank-transactions')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class BankTransactionsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BankingService,
    private readonly audit: AuditService,
  ) {}

  @Post(':id/reconcile')
  @Roles('owner', 'admin', 'manager')
  async reconcile(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReconcileTransactionDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const txn = await this.service.reconcileTransaction(trx, p.tenantId, id, dto);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'reconcile', entity: 'bank_transactions', entity_id: String(id) });
      return txn;
    });
  }

  @Post(':id/unreconcile')
  @Roles('owner', 'admin', 'manager')
  async unreconcile(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const txn = await this.service.unreconcileTransaction(trx, id);
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'unreconcile', entity: 'bank_transactions', entity_id: String(id) });
      return txn;
    });
  }
}
