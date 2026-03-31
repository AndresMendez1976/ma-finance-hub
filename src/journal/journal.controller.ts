import { Controller, Get, Post, Param, Body, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { VoidJournalEntryDto } from './dto/void-journal-entry.dto';

@ApiTags('Journal Entries')
@ApiBearerAuth()
@Controller('journal-entries')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class JournalController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: JournalService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAll(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.findAll(trx));
  }

  @Get('trial-balance')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async trialBalance(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.trialBalance(trx));
  }

  @Get('export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async exportJson(@CurrentPrincipal() p: AuthenticatedPrincipal, @Res() res: Response) {
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entries = await this.service.findAll(trx);
      return Promise.all(entries.map((e) => this.service.findOne(trx, Number(e.id))));
    });
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'journal_entries', metadata: { count: data.length } }),
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=journal-entries-${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> | null = await this.service.findOne(trx, id);
      if (!row) throw new NotFoundException();
      return row;
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body() dto: CreateJournalEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const entry: Record<string, unknown> = await this.service.create(trx, { tenant_id: p.tenantId, ...dto });
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'create', entity: 'journal_entries', entity_id: String(entry.id), metadata: { entry_number: entry.entry_number as number, lines: (entry.lines as unknown[])?.length } });
      return entry;
    });
  }

  @Post(':id/post')
  @Roles('owner', 'admin', 'manager')
  async postEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const row: Record<string, unknown> | null = await this.service.post(trx, id);
      if (!row) throw new NotFoundException();
      await this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'post', entity: 'journal_entries', entity_id: String(row.id) });
      return row;
    });
  }

  @Post(':id/void')
  @Roles('owner', 'admin')
  async voidEntry(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseIntPipe) id: number, @Body() dto: VoidJournalEntryDto) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.void(trx, p.tenantId, id, dto.reason);
      if (!result) throw new NotFoundException();
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'void',
        entity: 'journal_entries',
        entity_id: String(id),
        metadata: { reason: dto.reason, reversal_entry_id: result.reversalEntry.id },
      });
      return result;
    });
  }
}
