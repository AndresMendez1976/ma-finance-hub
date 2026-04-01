// Bills controller — CRUD, lifecycle, payment, void, AP aging report
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { PayBillDto } from './dto/pay-bill.dto';

@ApiTags('Bills')
@ApiBearerAuth()
@Controller('bills')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class BillsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: BillsService,
    private readonly audit: AuditService,
  ) {}

  // List bills with optional filters
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

  // AP Aging report
  @Get('ap-aging')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Accounts Payable aging report' })
  async apAging(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getApAging(trx),
    );
  }

  // Get single bill with lines and payments
  @Get(':id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOne(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.findOne(trx, id);
      if (!bill) throw new NotFoundException();
      return bill;
    });
  }

  // Create new draft bill
  @Post()
  @Roles('owner', 'admin', 'manager')
  async create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateBillDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.create(trx, p.tenantId, p.sub, {
        tenant_id: p.tenantId,
        created_by: p.sub,
        ...dto,
      }) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'bills',
        entity_id: String(bill.id),
        metadata: { bill_number: String(bill.bill_number) },
      });
      return bill;
    });
  }

  // Update draft bill
  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  async update(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateBillDto>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.update(trx, id, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'bills',
        entity_id: String(id),
      });
      return bill;
    });
  }

  // Receive bill (draft -> received)
  @Post(':id/receive')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Receive a bill and create journal entry' })
  async receive(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.receive(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'receive',
        entity: 'bills',
        entity_id: String(id),
        metadata: { bill_number: String(bill.bill_number) },
      });
      return bill;
    });
  }

  // Approve bill (received -> approved)
  @Post(':id/approve')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Approve a received bill' })
  async approve(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.approve(trx, id, p.sub);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'approve',
        entity: 'bills',
        entity_id: String(id),
        metadata: { bill_number: String(bill.bill_number) },
      });
      return bill;
    });
  }

  // Pay bill
  @Post(':id/pay')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Record a payment against a bill' })
  async pay(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayBillDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.pay(trx, p.tenantId, id, dto) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'pay',
        entity: 'bills',
        entity_id: String(id),
        metadata: { amount: String(dto.amount), payment_method: dto.payment_method },
      });
      return result;
    });
  }

  // Void bill
  @Post(':id/void')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Void a bill with reversal journal entry' })
  async voidBill(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const bill = await this.service.voidBill(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'void',
        entity: 'bills',
        entity_id: String(id),
        metadata: { bill_number: String(bill.bill_number) },
      });
      return bill;
    });
  }
}
