// Credit Notes controller — CRUD, lifecycle, apply to invoice, PDF generation
import { Controller, Get, Post, Put, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';

@ApiTags('Credit Notes')
@ApiBearerAuth()
@Controller('credit-notes')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class CreditNotesController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: CreditNotesService,
    private readonly audit: AuditService,
  ) {}

  // List credit notes with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        contact_id: contactId ? parseInt(contactId, 10) : undefined,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single credit note with lines
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.findOne(trx, id);
      if (!creditNote) throw new NotFoundException();
      return creditNote;
    });
  }

  // Create new draft credit note
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.create(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'credit_notes',
        entity_id: String(creditNote.id),
        metadata: { credit_note_number: String(creditNote.credit_note_number) },
      });
      return creditNote;
    });
  }

  // Update draft credit note
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCreditNoteDto>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'credit_notes',
        entity_id: String(id),
      });
      return creditNote;
    });
  }

  // Issue credit note (draft -> issued)
  @Post(':id/issue')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Issue a credit note and create journal entry' })
  async issue(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.issue(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'issue',
        entity: 'credit_notes',
        entity_id: String(id),
        metadata: { credit_note_number: String(creditNote.credit_note_number) },
      });
      return creditNote;
    });
  }

  // Apply credit note to an invoice
  @Post(':id/apply')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Apply credit note to an invoice' })
  async apply(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { invoice_id: number },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.apply(trx, p.tenantId, id, dto.invoice_id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'apply',
        entity: 'credit_notes',
        entity_id: String(id),
        metadata: { invoice_id: String(dto.invoice_id) },
      });
      return creditNote;
    });
  }

  // Void credit note
  @Post(':id/void')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Void a credit note with reversal journal entry' })
  async voidCreditNote(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const creditNote = await this.service.voidCreditNote(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'void',
        entity: 'credit_notes',
        entity_id: String(id),
        metadata: { credit_note_number: String(creditNote.credit_note_number) },
      });
      return creditNote;
    });
  }

  // Generate and download PDF
  @Get(':id/pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Download credit note PDF' })
  async downloadPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.generatePdf(trx, id),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'download_pdf',
        entity: 'credit_notes',
        entity_id: String(id),
      }),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }
}
