// Payroll controller — employees, pay runs, calculation, approval, posting, deductions, reports
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { PayrollService } from './payroll.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class PayrollController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: PayrollService,
    private readonly audit: AuditService,
  ) {}

  // ─── Employees ───

  @Get('employees')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'pay_type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEmployees(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('pay_type') pay_type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllEmployees(trx, {
        status,
        department,
        pay_type,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('employees/active')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get all active employees' })
  async getActiveEmployees(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getActiveEmployees(trx),
    );
  }

  @Get('employees/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneEmployee(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const employee = await this.service.findOneEmployee(trx, id);
      if (!employee) throw new NotFoundException();
      return employee;
    });
  }

  @Post('employees')
  @Roles('owner', 'admin', 'manager')
  async createEmployee(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const employee = await this.service.createEmployee(trx, p.tenantId, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'payroll_employees',
        entity_id: String(employee.id),
        metadata: { employee_number: String(employee.employee_number) },
      });
      return employee;
    });
  }

  @Put('employees/:id')
  @Roles('owner', 'admin', 'manager')
  async updateEmployee(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const employee = await this.service.updateEmployee(trx, id, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'payroll_employees',
        entity_id: String(id),
      });
      return employee;
    });
  }

  // ─── Payroll Runs ───

  @Post('payroll-runs')
  @Roles('owner', 'admin', 'manager')
  async createPayrollRun(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.createPayrollRun(trx, p.tenantId, p.sub, dto);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'payroll_runs',
        entity_id: String(run.id),
        metadata: { run_number: String(run.run_number) },
      });
      return run;
    });
  }

  @Get('payroll-runs')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllPayrollRuns(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllPayrollRuns(trx, {
        status,
        from,
        to,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('payroll-runs/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOnePayrollRun(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.findOnePayrollRun(trx, id);
      if (!run) throw new NotFoundException();
      return run;
    });
  }

  @Post('payroll-runs/:id/calculate')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Calculate payroll for all active employees in a run' })
  async calculatePayroll(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.calculatePayroll(trx, p.tenantId, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'calculate',
        entity: 'payroll_runs',
        entity_id: String(id),
      });
      return run;
    });
  }

  @Put('payroll-runs/:id/items/:itemId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Override a payroll item (manual adjustment)' })
  async updatePayrollItem(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.updatePayrollItem(trx, id, itemId, body);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update_item',
        entity: 'payroll_runs',
        entity_id: String(id),
        metadata: { item_id: String(itemId) },
      });
      return run;
    });
  }

  @Post('payroll-runs/:id/approve')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Approve a calculated payroll run' })
  async approvePayrollRun(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.approveRun(trx, id, p.sub, p.roles);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'approve',
        entity: 'payroll_runs',
        entity_id: String(id),
        metadata: { run_number: run.run_number },
      });
      return run;
    });
  }

  @Post('payroll-runs/:id/post')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Post payroll run and create journal entry' })
  async postPayrollRun(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const run = await this.service.postRun(trx, p.tenantId, id, p.sub, p.roles) as Record<string, unknown>;
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'post',
        entity: 'payroll_runs',
        entity_id: String(id),
        metadata: { run_number: run.run_number, journal_entry_id: String(run.journal_entry_id) },
      });
      return run;
    });
  }

  // ─── Deduction Types ───

  @Get('payroll-deduction-types')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAllDeductionTypes(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllDeductionTypes(trx),
    );
  }

  @Get('payroll-deduction-types/:id')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findOneDeductionType(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dt = await this.service.findOneDeductionType(trx, id);
      if (!dt) throw new NotFoundException();
      return dt;
    });
  }

  @Post('payroll-deduction-types')
  @Roles('owner', 'admin')
  async createDeductionType(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() body: { name: string; category: string; description?: string; default_amount?: number; default_percentage?: number },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dt = await this.service.createDeductionType(trx, p.tenantId, body);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'payroll_deduction_types',
        entity_id: String(dt.id),
        metadata: { name: body.name },
      });
      return dt;
    });
  }

  @Put('payroll-deduction-types/:id')
  @Roles('owner', 'admin')
  async updateDeductionType(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; category?: string; description?: string; default_amount?: number; default_percentage?: number },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const dt = await this.service.updateDeductionType(trx, id, body);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'payroll_deduction_types',
        entity_id: String(id),
      });
      return dt;
    });
  }

  @Delete('payroll-deduction-types/:id')
  @Roles('owner', 'admin')
  async deleteDeductionType(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteDeductionType(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'payroll_deduction_types',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ─── Employee Deductions ───

  @Get('employee-deductions/:employeeId')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async findAllEmployeeDeductions(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.findAllEmployeeDeductions(trx, employeeId),
    );
  }

  @Post('employee-deductions')
  @Roles('owner', 'admin', 'manager')
  async createEmployeeDeduction(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Body() body: { employee_id: number; deduction_type_id: number; amount?: number; percentage?: number; effective_date: string; end_date?: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const ded = await this.service.createEmployeeDeduction(trx, p.tenantId, body);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'create',
        entity: 'employee_deductions',
        entity_id: String(ded.id),
        metadata: { employee_id: String(body.employee_id) },
      });
      return ded;
    });
  }

  @Put('employee-deductions/:id')
  @Roles('owner', 'admin', 'manager')
  async updateEmployeeDeduction(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount?: number; percentage?: number; effective_date?: string; end_date?: string },
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const ded = await this.service.updateEmployeeDeduction(trx, id, body);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'update',
        entity: 'employee_deductions',
        entity_id: String(id),
      });
      return ded;
    });
  }

  @Delete('employee-deductions/:id')
  @Roles('owner', 'admin', 'manager')
  async deleteEmployeeDeduction(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
      const result = await this.service.deleteEmployeeDeduction(trx, id);
      await this.audit.log(trx, {
        tenant_id: p.tenantId,
        actor_subject: p.sub,
        action: 'delete',
        entity: 'employee_deductions',
        entity_id: String(id),
      });
      return result;
    });
  }

  // ─── Reports ───

  @Get('reports/payroll-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'quarter', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Payroll summary report with employee breakdowns' })
  async getPayrollSummaryReport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getPayrollSummaryReport(trx, {
        year: year ? parseInt(year, 10) : undefined,
        quarter: quarter ? parseInt(quarter, 10) : undefined,
        from,
        to,
      }),
    );
  }
}
