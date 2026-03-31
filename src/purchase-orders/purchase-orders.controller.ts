// Purchase Orders controller — CRUD, lifecycle, receiving, PDF, expense creation
import { Controller, Get, Post, Put, Param, Body, Query, Res, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import { ReceivePoDto } from './dto/receive-po.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class PurchaseOrdersController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: PurchaseOrdersService,
    private readonly audit: AuditService,
  ) {}

  // List purchase orders with optional filters
  @Get()
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendor', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('vendor') vendor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAll(trx, {
        status,
        vendor,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  // Get single purchase order with lines and receipts
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.findOne(trx, id);
      if (!po) throw new NotFoundException();
      return po;
    });
  }

  // Create new draft purchase order
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreatePoDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.create(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'purchase_orders',
        entity_id: String(po.id),
        metadata: { po_number: String(po.po_number) },
      });
      return po;
    });
  }

  // Update draft purchase order
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePoDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'purchase_orders',
        entity_id: String(id),
      });
      return po;
    });
  }

  // Approve purchase order
  @Post(':id/approve')
  @Roles('owner', 'admin', 'manager')
  async approve(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.approve(trx, id, p.sub);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'approve',
        entity: 'purchase_orders',
        entity_id: String(id),
        metadata: { po_number: po.po_number },
      });
      return po;
    });
  }

  // Send purchase order (draft → sent)
  @Post(':id/send')
  @Roles('owner', 'admin', 'manager')
  async sendPo(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.send(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'send',
        entity: 'purchase_orders',
        entity_id: String(id),
        metadata: { po_number: po.po_number },
      });
      return po;
    });
  }

  // Receive goods against purchase order
  @Post(':id/receive')
  @Roles('owner', 'admin', 'manager')
  async receive(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceivePoDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.receive(trx, p.tenantId, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'receive',
        entity: 'purchase_orders',
        entity_id: String(id),
        metadata: { receipt_date: dto.receipt_date },
      });
      return po;
    });
  }

  // Cancel purchase order
  @Post(':id/cancel')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Cancel a purchase order (no receipts)' })
  async cancel(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const po = await this.service.cancel(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'cancel',
        entity: 'purchase_orders',
        entity_id: String(id),
        metadata: { po_number: po.po_number },
      });
      return po;
    });
  }

  // Generate and download PDF for purchase order
  @Get(':id/pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Download purchase order PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
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
        entity: 'purchase_orders',
        entity_id: String(id),
      }),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  // Create expense from a received purchase order
  @Post(':id/create-expense')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create an expense from a received PO' })
  async createExpense(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const expense = await this.service.createExpenseFromPo(trx, p.tenantId, p.sub, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create_expense_from_po',
        entity: 'purchase_orders',
        entity_id: String(id),
        metadata: { expense_id: String(expense.id) },
      });
      return expense;
    });
  }
}
