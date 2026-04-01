// Contacts controller — CRUD, search, soft delete
import { Controller, Get, Post, Put, Delete, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.accounts')
export class ContactsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ContactsService,
    private readonly audit: AuditService,
  ) {}

  // List contacts with optional filters and search
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        type,
        status,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Import contacts from CSV
  @Post('import-csv')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Import contacts from CSV data' })
  async importCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: { csv_data: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.importCsv(trx, p.tenantId, dto.csv_data);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'import_csv',
        entity: 'contacts',
        entity_id: 'batch',
        metadata: { imported: String(result.imported), errors: String(result.errors.length) },
      });
      return result;
    });
  }

  // Export all contacts as CSV
  @Get('export-csv')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Export all contacts as CSV' })
  async exportCsv(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    const csv = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.exportCsv(trx),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  }

  // Get statement for a contact
  @Get(':id/statement')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Get statement for a contact' })
  async getStatement(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getStatement(trx, id, from, to),
    );
  }

  // Get single contact with financial summary
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const contact = await this.service.findOneWithSummary(trx, id);
      if (!contact) throw new NotFoundException();
      return contact;
    });
  }

  // Create new contact
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateContactDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const contact = await this.service.create(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'contacts',
        entity_id: String(contact.id),
        metadata: { first_name: String(contact.first_name), type: String(contact.type) },
      });
      return contact;
    });
  }

  // Update contact (only if active)
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const contact = await this.service.update(trx, id, dto as Record<string, unknown>);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'contacts',
        entity_id: String(id),
      });
      return contact;
    });
  }

  // Soft delete contact
  @Delete(':id')
  @Roles('owner', 'admin')
  async remove(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const contact = await this.service.softDelete(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'contacts',
        entity_id: String(id),
        metadata: { first_name: String(contact.first_name) },
      });
      return contact;
    });
  }
}
