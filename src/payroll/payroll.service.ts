// Payroll service — employee CRUD, pay runs, calculation, approval, journal posting, deductions, reports
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Knex } from 'knex';
import { PayrollCalculationService } from './payroll-calculation.service';

export interface CreateEmployeeInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  ssn_last4?: string;
  hire_date: string;
  pay_type: string;
  pay_rate: number;
  pay_frequency: string;
  department?: string;
  position?: string;
  federal_filing_status: string;
  federal_allowances?: number;
  state_filing_status?: string;
  state_allowances?: number;
  contact_id?: number;
}

export interface UpdateEmployeeInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  ssn_last4?: string;
  hire_date?: string;
  pay_type?: string;
  pay_rate?: number;
  pay_frequency?: string;
  department?: string;
  position?: string;
  federal_filing_status?: string;
  federal_allowances?: number;
  state_filing_status?: string;
  state_allowances?: number;
  contact_id?: number;
  status?: string;
  termination_date?: string;
}

export interface CreatePayrollRunInput {
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  notes?: string;
}

export interface CreateDeductionTypeInput {
  name: string;
  category: string; // 'pre_tax' | 'post_tax'
  description?: string;
  default_amount?: number;
  default_percentage?: number;
}

export interface CreateEmployeeDeductionInput {
  employee_id: number;
  deduction_type_id: number;
  amount?: number;
  percentage?: number;
  effective_date: string;
  end_date?: string;
}

@Injectable()
export class PayrollService {
  constructor(private readonly calcService: PayrollCalculationService) {}

  // ─── Employee auto-number ───

  private async nextEmployeeNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('payroll_employees')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('employee_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'EMP-0001';
    const num = parseInt(String(last.employee_number).replace('EMP-', ''), 10);
    return `EMP-${String(num + 1).padStart(4, '0')}`;
  }

  // ─── Payroll run auto-number ───

  private async nextPayrollRunNumber(trx: Knex.Transaction, tenantId: number): Promise<string> {
    const last = await trx('payroll_runs')
      .where({ tenant_id: tenantId })
      .orderBy('id', 'desc')
      .select('run_number')
      .first() as Record<string, unknown> | undefined;

    if (!last) return 'PAY-0001';
    const num = parseInt(String(last.run_number).replace('PAY-', ''), 10);
    return `PAY-${String(num + 1).padStart(4, '0')}`;
  }

  // ─── Employee CRUD ───

  async createEmployee(trx: Knex.Transaction, tenantId: number, data: CreateEmployeeInput) {
    const employeeNumber = await this.nextEmployeeNumber(trx, tenantId);

    const [employee] = await trx('payroll_employees')
      .insert({
        tenant_id: tenantId,
        employee_number: employeeNumber,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        ssn_last4: data.ssn_last4 ?? null,
        hire_date: data.hire_date,
        pay_type: data.pay_type,
        pay_rate: data.pay_rate,
        pay_frequency: data.pay_frequency,
        department: data.department ?? null,
        position: data.position ?? null,
        federal_filing_status: data.federal_filing_status,
        federal_allowances: data.federal_allowances ?? 0,
        state_filing_status: data.state_filing_status ?? null,
        state_allowances: data.state_allowances ?? 0,
        contact_id: data.contact_id ?? null,
        status: 'active',
      })
      .returning('*') as Record<string, unknown>[];

    return employee;
  }

  async findAllEmployees(
    trx: Knex.Transaction,
    filters: { status?: string; department?: string; pay_type?: string; search?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('payroll_employees')
      .select('*')
      .orderBy('created_at', 'desc');

    if (filters.status) void query.where('status', filters.status);
    if (filters.department) void query.where('department', 'ilike', `%${filters.department}%`);
    if (filters.pay_type) void query.where('pay_type', filters.pay_type);
    if (filters.search) {
      void query.where(function (this: Knex.QueryBuilder) {
        void this.where('first_name', 'ilike', `%${filters.search}%`)
          .orWhere('last_name', 'ilike', `%${filters.search}%`)
          .orWhere('employee_number', 'ilike', `%${filters.search}%`);
      });
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  async findOneEmployee(trx: Knex.Transaction, id: number) {
    const employee = await trx('payroll_employees').where({ id }).first() as Record<string, unknown> | undefined;
    if (!employee) return null;

    // Fetch active deductions
    const deductions = await trx('employee_deductions')
      .join('payroll_deduction_types', 'employee_deductions.deduction_type_id', 'payroll_deduction_types.id')
      .where('employee_deductions.employee_id', id)
      .select(
        'employee_deductions.*',
        'payroll_deduction_types.name as deduction_name',
        'payroll_deduction_types.category as deduction_category',
      ) as Record<string, unknown>[];

    return { ...employee, deductions };
  }

  async updateEmployee(trx: Knex.Transaction, id: number, data: UpdateEmployeeInput) {
    const employee = await trx('payroll_employees').where({ id }).first() as Record<string, unknown> | undefined;
    if (!employee) throw new NotFoundException('Employee not found');

    const updates: Record<string, unknown> = {};
    if (data.first_name !== undefined) updates.first_name = data.first_name;
    if (data.last_name !== undefined) updates.last_name = data.last_name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.ssn_last4 !== undefined) updates.ssn_last4 = data.ssn_last4;
    if (data.hire_date !== undefined) updates.hire_date = data.hire_date;
    if (data.pay_type !== undefined) updates.pay_type = data.pay_type;
    if (data.pay_rate !== undefined) updates.pay_rate = data.pay_rate;
    if (data.pay_frequency !== undefined) updates.pay_frequency = data.pay_frequency;
    if (data.department !== undefined) updates.department = data.department;
    if (data.position !== undefined) updates.position = data.position;
    if (data.federal_filing_status !== undefined) updates.federal_filing_status = data.federal_filing_status;
    if (data.federal_allowances !== undefined) updates.federal_allowances = data.federal_allowances;
    if (data.state_filing_status !== undefined) updates.state_filing_status = data.state_filing_status;
    if (data.state_allowances !== undefined) updates.state_allowances = data.state_allowances;
    if (data.contact_id !== undefined) updates.contact_id = data.contact_id;
    if (data.status !== undefined) updates.status = data.status;
    if (data.termination_date !== undefined) updates.termination_date = data.termination_date;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = trx.fn.now();
      await trx('payroll_employees').where({ id }).update(updates);
    }

    return this.findOneEmployee(trx, id);
  }

  async getActiveEmployees(trx: Knex.Transaction) {
    const rows = await trx('payroll_employees')
      .where({ status: 'active' })
      .orderBy('last_name')
      .orderBy('first_name')
      .select('*') as Record<string, unknown>[];
    return rows;
  }

  // ─── Payroll Runs ───

  async createPayrollRun(trx: Knex.Transaction, tenantId: number, createdBy: string, data: CreatePayrollRunInput) {
    const runNumber = await this.nextPayrollRunNumber(trx, tenantId);

    // Resolve created_by user id from external_subject
    const user = await trx('users')
      .where({ external_subject: createdBy })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!user) throw new BadRequestException('User not found for payroll run creation');

    const [run] = await trx('payroll_runs')
      .insert({
        tenant_id: tenantId,
        run_number: runNumber,
        pay_period_start: data.pay_period_start,
        pay_period_end: data.pay_period_end,
        pay_date: data.pay_date,
        status: 'draft',
        total_gross: 0,
        total_net: 0,
        total_employer_taxes: 0,
        total_deductions: 0,
        employee_count: 0,
        notes: data.notes ?? null,
        created_by: user.id,
      })
      .returning('*') as Record<string, unknown>[];

    return run;
  }

  async findAllPayrollRuns(
    trx: Knex.Transaction,
    filters: { status?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('payroll_runs')
      .select('*')
      .orderBy('created_at', 'desc');

    if (filters.status) void query.where('status', filters.status);
    if (filters.from) void query.where('pay_period_start', '>=', filters.from);
    if (filters.to) void query.where('pay_period_end', '<=', filters.to);

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
    const [countResult] = await countQuery as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];

    return {
      data: rows,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  async findOnePayrollRun(trx: Knex.Transaction, id: number) {
    const run = await trx('payroll_runs').where({ id }).first() as Record<string, unknown> | undefined;
    if (!run) return null;

    const items = await trx('payroll_items')
      .where({ payroll_run_id: id })
      .orderBy('employee_name')
      .select('*') as Record<string, unknown>[];

    return { ...run, items };
  }

  // ─── Calculate Payroll ───

  async calculatePayroll(trx: Knex.Transaction, tenantId: number, runId: number) {
    const run = await trx('payroll_runs').where({ id: runId }).first() as Record<string, unknown> | undefined;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'draft') throw new BadRequestException('Only draft payroll runs can be calculated');

    // Remove existing items for recalculation
    await trx('payroll_items').where({ payroll_run_id: runId }).del();

    // Get all active employees
    const employees = await trx('payroll_employees')
      .where({ tenant_id: tenantId, status: 'active' })
      .select('*') as Record<string, unknown>[];

    if (employees.length === 0) throw new BadRequestException('No active employees found for payroll calculation');

    let totalGross = 0;
    let totalNet = 0;
    let totalEmployerTaxes = 0;
    let totalDeductions = 0;

    for (const emp of employees) {
      // Get employee deductions
      const deductions = await trx('employee_deductions')
        .join('payroll_deduction_types', 'employee_deductions.deduction_type_id', 'payroll_deduction_types.id')
        .where('employee_deductions.employee_id', Number(emp.id))
        .where('employee_deductions.effective_date', '<=', String(run.pay_period_end))
        .where(function () {
          void this.whereNull('employee_deductions.end_date')
            .orWhere('employee_deductions.end_date', '>=', String(run.pay_period_start));
        })
        .select(
          'employee_deductions.amount',
          'employee_deductions.percentage',
          'payroll_deduction_types.category',
        ) as Record<string, unknown>[];

      // Compute YTD gross for this employee (for FUTA/SS caps)
      const ytdResult = await trx('payroll_items')
        .join('payroll_runs', 'payroll_items.payroll_run_id', 'payroll_runs.id')
        .where('payroll_items.employee_id', Number(emp.id))
        .where('payroll_runs.status', 'posted')
        .whereRaw("extract(year from payroll_runs.pay_date::date) = extract(year from ?::date)", [String(run.pay_date)])
        .sum('payroll_items.gross_pay as ytd_gross')
        .first() as Record<string, unknown> | undefined;
      const ytdGross = Number(ytdResult?.ytd_gross) || 0;

      // Sum pre-tax and post-tax deductions
      let preTaxDeductions = 0;
      let postTaxDeductions = 0;
      for (const ded of deductions) {
        const dedAmount = Number(ded.amount) || 0;
        if (String(ded.category) === 'pre_tax') {
          preTaxDeductions += dedAmount;
        } else {
          postTaxDeductions += dedAmount;
        }
      }

      // Default state tax rate and SUTA rate
      const stateTaxRate = 0.05; // 5% default state tax
      const sutaRate = 0.027; // 2.7% default SUTA

      const result = this.calcService.calculateEmployeePayroll({
        pay_type: String(emp.pay_type),
        pay_rate: Number(emp.pay_rate),
        pay_frequency: String(emp.pay_frequency),
        hours_worked: String(emp.pay_type) === 'hourly' ? 80 : undefined, // default 80 hrs for biweekly
        federal_filing_status: String(emp.federal_filing_status),
        federal_allowances: Number(emp.federal_allowances) || 0,
        state_tax_rate: stateTaxRate,
        pre_tax_deductions: preTaxDeductions,
        post_tax_deductions: postTaxDeductions,
        ytd_gross: ytdGross,
        suta_rate: sutaRate,
      });

      await trx('payroll_items').insert({
        tenant_id: tenantId,
        payroll_run_id: runId,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name: `${String(emp.first_name)} ${String(emp.last_name)}`,
        pay_type: emp.pay_type,
        pay_rate: emp.pay_rate,
        hours_worked: String(emp.pay_type) === 'hourly' ? 80 : null,
        gross_pay: result.gross_pay,
        federal_income_tax: result.federal_income_tax,
        social_security_employee: result.social_security_employee,
        medicare_employee: result.medicare_employee,
        state_income_tax: result.state_income_tax,
        other_deductions: result.other_deductions,
        total_deductions: result.total_deductions,
        net_pay: result.net_pay,
        social_security_employer: result.social_security_employer,
        medicare_employer: result.medicare_employer,
        futa_employer: result.futa_employer,
        suta_employer: result.suta_employer,
        total_employer_taxes: result.total_employer_taxes,
      });

      totalGross += result.gross_pay;
      totalNet += result.net_pay;
      totalEmployerTaxes += result.total_employer_taxes;
      totalDeductions += result.total_deductions;
    }

    // Update run totals
    await trx('payroll_runs').where({ id: runId }).update({
      status: 'calculated',
      total_gross: Math.round(totalGross * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      total_employer_taxes: Math.round(totalEmployerTaxes * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      employee_count: employees.length,
      updated_at: trx.fn.now(),
    });

    return this.findOnePayrollRun(trx, runId);
  }

  // ─── Update Payroll Item (manual override) ───

  async updatePayrollItem(trx: Knex.Transaction, runId: number, itemId: number, updates: Record<string, unknown>) {
    const run = await trx('payroll_runs').where({ id: runId }).first() as Record<string, unknown> | undefined;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'calculated') throw new BadRequestException('Can only override items on calculated payroll runs');

    const item = await trx('payroll_items').where({ id: itemId, payroll_run_id: runId }).first() as Record<string, unknown> | undefined;
    if (!item) throw new NotFoundException('Payroll item not found');

    const allowed = [
      'hours_worked', 'gross_pay', 'federal_income_tax', 'social_security_employee',
      'medicare_employee', 'state_income_tax', 'other_deductions', 'net_pay',
    ];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    // Recalculate total_deductions and net_pay if individual fields changed
    if (Object.keys(safeUpdates).length > 0) {
      await trx('payroll_items').where({ id: itemId }).update(safeUpdates);

      // Refetch and recalculate totals
      const updated = await trx('payroll_items').where({ id: itemId }).first() as Record<string, unknown>;
      const newTotalDeductions = Math.round((
        Number(updated.federal_income_tax) +
        Number(updated.social_security_employee) +
        Number(updated.medicare_employee) +
        Number(updated.state_income_tax) +
        Number(updated.other_deductions)
      ) * 100) / 100;
      const newNetPay = Math.round((Number(updated.gross_pay) - newTotalDeductions) * 100) / 100;

      await trx('payroll_items').where({ id: itemId }).update({
        total_deductions: newTotalDeductions,
        net_pay: newNetPay,
      });

      // Recalculate run totals
      const allItems = await trx('payroll_items').where({ payroll_run_id: runId }).select('*') as Record<string, unknown>[];
      const runTotalGross = allItems.reduce((s, i) => s + Number(i.gross_pay), 0);
      const runTotalNet = allItems.reduce((s, i) => s + Number(i.net_pay), 0);
      const runTotalDeductions = allItems.reduce((s, i) => s + Number(i.total_deductions), 0);
      const runTotalEmployerTaxes = allItems.reduce((s, i) => s + Number(i.total_employer_taxes), 0);

      await trx('payroll_runs').where({ id: runId }).update({
        total_gross: Math.round(runTotalGross * 100) / 100,
        total_net: Math.round(runTotalNet * 100) / 100,
        total_deductions: Math.round(runTotalDeductions * 100) / 100,
        total_employer_taxes: Math.round(runTotalEmployerTaxes * 100) / 100,
        updated_at: trx.fn.now(),
      });
    }

    return this.findOnePayrollRun(trx, runId);
  }

  // ─── Approve Payroll Run ───

  async approveRun(trx: Knex.Transaction, id: number, approverSubject: string, approverRoles: string[]) {
    const run = await trx('payroll_runs').where({ id }).first() as Record<string, unknown> | undefined;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'calculated') throw new BadRequestException('Only calculated payroll runs can be approved');

    // RBAC check — only owner or admin can approve
    if (!approverRoles.includes('owner') && !approverRoles.includes('admin')) {
      throw new ForbiddenException('Only owners and admins can approve payroll runs');
    }

    const approver = await trx('users')
      .where({ external_subject: approverSubject })
      .select('id')
      .first() as Record<string, unknown> | undefined;
    if (!approver) throw new BadRequestException('Approver user not found');

    const [updated] = await trx('payroll_runs')
      .where({ id })
      .update({
        status: 'approved',
        approved_by: approver.id,
        approved_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];

    return updated;
  }

  // ─── Post Payroll Run (create journal entry) ───

  async postRun(trx: Knex.Transaction, tenantId: number, id: number, _posterSubject: string, posterRoles: string[]) {
    const run = await trx('payroll_runs').where({ id }).first() as Record<string, unknown> | undefined;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'approved') throw new BadRequestException('Only approved payroll runs can be posted');

    // RBAC check
    if (!posterRoles.includes('owner') && !posterRoles.includes('admin')) {
      throw new ForbiddenException('Only owners and admins can post payroll runs');
    }

    // Get payroll items for totals
    const items = await trx('payroll_items').where({ payroll_run_id: id }).select('*') as Record<string, unknown>[];
    if (items.length === 0) throw new BadRequestException('No payroll items found for this run');

    const totalGross = items.reduce((s, i) => s + Number(i.gross_pay), 0);
    const totalEmployerTaxes = items.reduce((s, i) => s + Number(i.total_employer_taxes), 0);
    const totalEmployeeDeductions = items.reduce((s, i) => s + Number(i.federal_income_tax) + Number(i.social_security_employee) + Number(i.medicare_employee) + Number(i.state_income_tax), 0);
    const totalOtherDeductions = items.reduce((s, i) => s + Number(i.other_deductions), 0);
    const totalNet = items.reduce((s, i) => s + Number(i.net_pay), 0);

    // Find or determine fiscal period
    const period = await trx('fiscal_periods')
      .where({ tenant_id: tenantId, status: 'open' })
      .where('start_date', '<=', String(run.pay_date))
      .where('end_date', '>=', String(run.pay_date))
      .first() as Record<string, unknown> | undefined;
    if (!period) throw new BadRequestException('No open fiscal period found for the pay date');

    // Get next journal entry number
    const lastEntry = await trx('journal_entries')
      .where({ tenant_id: tenantId, fiscal_period_id: period.id })
      .max('entry_number as max_num')
      .first() as Record<string, unknown> | undefined;
    const entryNumber = (Number(lastEntry?.max_num) || 0) + 1;

    // Create journal entry
    const [entry] = await trx('journal_entries')
      .insert({
        tenant_id: tenantId,
        fiscal_period_id: period.id,
        entry_number: entryNumber,
        reference: `${String(run.run_number)}`,
        memo: `Payroll - ${String(run.run_number)} (${String(run.pay_period_start)} to ${String(run.pay_period_end)})`,
        status: 'posted',
        posted_at: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];

    // Lookup required accounts by code
    const findAccount = async (code: string): Promise<number | null> => {
      const acct = await trx('accounts')
        .where({ account_code: code })
        .select('id')
        .first() as Record<string, unknown> | undefined;
      return acct ? Number(acct.id) : null;
    };

    const salaryExpenseId = await findAccount('6100');   // Salary Expense
    const payrollTaxExpenseId = await findAccount('6110'); // Payroll Tax Expense
    const payrollPayableId = await findAccount('2100');   // Payroll Payable
    const taxPayableId = await findAccount('2110');        // Tax Payable
    const cashId = await findAccount('1000');              // Cash

    const journalLines: Record<string, unknown>[] = [];

    // Debit: Salary Expense (gross wages)
    if (salaryExpenseId) {
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: salaryExpenseId,
        debit: Math.round(totalGross * 100) / 100,
        credit: 0,
        description: 'Gross salary/wages expense',
      });
    }

    // Debit: Payroll Tax Expense (employer taxes)
    if (payrollTaxExpenseId) {
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: payrollTaxExpenseId,
        debit: Math.round(totalEmployerTaxes * 100) / 100,
        credit: 0,
        description: 'Employer payroll taxes (SS, Medicare, FUTA, SUTA)',
      });
    }

    // Credit: Payroll Payable (employee taxes + employer taxes withheld)
    if (payrollPayableId) {
      const payrollPayableAmount = Math.round((totalEmployeeDeductions + totalOtherDeductions) * 100) / 100;
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: payrollPayableId,
        debit: 0,
        credit: payrollPayableAmount,
        description: 'Employee withholdings payable',
      });
    }

    // Credit: Tax Payable (employer taxes)
    if (taxPayableId) {
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: taxPayableId,
        debit: 0,
        credit: Math.round(totalEmployerTaxes * 100) / 100,
        description: 'Employer payroll taxes payable',
      });
    }

    // Credit: Cash (net pay to employees)
    if (cashId) {
      journalLines.push({
        tenant_id: tenantId,
        journal_entry_id: entry.id,
        account_id: cashId,
        debit: 0,
        credit: Math.round(totalNet * 100) / 100,
        description: 'Net pay disbursement',
      });
    }

    if (journalLines.length > 0) {
      await trx('journal_lines').insert(journalLines);
    }

    // Update run status to posted
    const [posted] = await trx('payroll_runs')
      .where({ id })
      .update({
        status: 'posted',
        posted_at: trx.fn.now(),
        journal_entry_id: entry.id,
        updated_at: trx.fn.now(),
      })
      .returning('*') as Record<string, unknown>[];

    return { ...posted, journal_entry_id: entry.id };
  }

  // ─── Deduction Types CRUD ───

  async createDeductionType(trx: Knex.Transaction, tenantId: number, data: CreateDeductionTypeInput) {
    const [row] = await trx('payroll_deduction_types')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        default_amount: data.default_amount ?? null,
        default_percentage: data.default_percentage ?? null,
      })
      .returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllDeductionTypes(trx: Knex.Transaction) {
    const rows = await trx('payroll_deduction_types')
      .orderBy('name')
      .select('*') as Record<string, unknown>[];
    return rows;
  }

  async findOneDeductionType(trx: Knex.Transaction, id: number) {
    return trx('payroll_deduction_types').where({ id }).first() as Promise<Record<string, unknown> | undefined>;
  }

  async updateDeductionType(trx: Knex.Transaction, id: number, data: Partial<CreateDeductionTypeInput>) {
    const existing = await trx('payroll_deduction_types').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Deduction type not found');

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.default_amount !== undefined) updates.default_amount = data.default_amount;
    if (data.default_percentage !== undefined) updates.default_percentage = data.default_percentage;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = trx.fn.now();
      await trx('payroll_deduction_types').where({ id }).update(updates);
    }

    return trx('payroll_deduction_types').where({ id }).first() as Promise<Record<string, unknown> | undefined>;
  }

  async deleteDeductionType(trx: Knex.Transaction, id: number) {
    const existing = await trx('payroll_deduction_types').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Deduction type not found');

    await trx('payroll_deduction_types').where({ id }).del();
    return { deleted: true };
  }

  // ─── Employee Deductions CRUD ───

  async createEmployeeDeduction(trx: Knex.Transaction, tenantId: number, data: CreateEmployeeDeductionInput) {
    // Validate employee and deduction type exist
    const emp = await trx('payroll_employees').where({ id: data.employee_id }).first() as Record<string, unknown> | undefined;
    if (!emp) throw new NotFoundException('Employee not found');

    const dedType = await trx('payroll_deduction_types').where({ id: data.deduction_type_id }).first() as Record<string, unknown> | undefined;
    if (!dedType) throw new NotFoundException('Deduction type not found');

    const [row] = await trx('employee_deductions')
      .insert({
        tenant_id: tenantId,
        employee_id: data.employee_id,
        deduction_type_id: data.deduction_type_id,
        amount: data.amount ?? dedType.default_amount ?? 0,
        percentage: data.percentage ?? dedType.default_percentage ?? null,
        effective_date: data.effective_date,
        end_date: data.end_date ?? null,
      })
      .returning('*') as Record<string, unknown>[];
    return row;
  }

  async findAllEmployeeDeductions(trx: Knex.Transaction, employeeId: number) {
    const rows = await trx('employee_deductions')
      .join('payroll_deduction_types', 'employee_deductions.deduction_type_id', 'payroll_deduction_types.id')
      .where('employee_deductions.employee_id', employeeId)
      .select(
        'employee_deductions.*',
        'payroll_deduction_types.name as deduction_name',
        'payroll_deduction_types.category as deduction_category',
      ) as Record<string, unknown>[];
    return rows;
  }

  async updateEmployeeDeduction(trx: Knex.Transaction, id: number, data: Partial<CreateEmployeeDeductionInput>) {
    const existing = await trx('employee_deductions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Employee deduction not found');

    const updates: Record<string, unknown> = {};
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.percentage !== undefined) updates.percentage = data.percentage;
    if (data.effective_date !== undefined) updates.effective_date = data.effective_date;
    if (data.end_date !== undefined) updates.end_date = data.end_date;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = trx.fn.now();
      await trx('employee_deductions').where({ id }).update(updates);
    }

    return trx('employee_deductions').where({ id }).first() as Promise<Record<string, unknown> | undefined>;
  }

  async deleteEmployeeDeduction(trx: Knex.Transaction, id: number) {
    const existing = await trx('employee_deductions').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Employee deduction not found');

    await trx('employee_deductions').where({ id }).del();
    return { deleted: true };
  }

  // ─── Payroll Summary Report ───

  async getPayrollSummaryReport(
    trx: Knex.Transaction,
    filters: { year?: number; quarter?: number; from?: string; to?: string },
  ) {
    const year = filters.year ?? new Date().getFullYear();

    const query = trx('payroll_runs')
      .where('status', 'posted');

    if (filters.from && filters.to) {
      void query.where('pay_date', '>=', filters.from).where('pay_date', '<=', filters.to);
    } else if (filters.quarter) {
      const qStart = `${year}-${String((filters.quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
      const qEndMonth = filters.quarter * 3;
      const qEnd = `${year}-${String(qEndMonth).padStart(2, '0')}-${qEndMonth === 2 ? '28' : ['04', '06', '09', '11'].includes(String(qEndMonth).padStart(2, '0')) ? '30' : '31'}`;
      void query.where('pay_date', '>=', qStart).where('pay_date', '<=', qEnd);
    } else {
      void query.where('pay_date', '>=', `${year}-01-01`).where('pay_date', '<=', `${year}-12-31`);
    }

    const runs = await query.select('*') as Record<string, unknown>[];

    const runIds = runs.map((r) => Number(r.id));
    let items: Record<string, unknown>[] = [];
    if (runIds.length > 0) {
      items = await trx('payroll_items')
        .whereIn('payroll_run_id', runIds)
        .select('*') as Record<string, unknown>[];
    }

    // Aggregate by employee
    const employeeMap = new Map<number, Record<string, number>>();
    for (const item of items) {
      const empId = Number(item.employee_id);
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employee_id: empId,
          total_gross: 0,
          total_federal_tax: 0,
          total_state_tax: 0,
          total_social_security: 0,
          total_medicare: 0,
          total_other_deductions: 0,
          total_net: 0,
          total_employer_taxes: 0,
          pay_periods: 0,
        });
      }
      const agg = employeeMap.get(empId)!;
      agg.total_gross += Number(item.gross_pay);
      agg.total_federal_tax += Number(item.federal_income_tax);
      agg.total_state_tax += Number(item.state_income_tax);
      agg.total_social_security += Number(item.social_security_employee);
      agg.total_medicare += Number(item.medicare_employee);
      agg.total_other_deductions += Number(item.other_deductions);
      agg.total_net += Number(item.net_pay);
      agg.total_employer_taxes += Number(item.total_employer_taxes);
      agg.pay_periods += 1;
    }

    // Round all values
    const employeeSummaries = Array.from(employeeMap.values()).map((agg) => {
      const rounded: Record<string, number> = {};
      for (const [key, val] of Object.entries(agg)) {
        rounded[key] = key === 'employee_id' || key === 'pay_periods' ? val : Math.round(val * 100) / 100;
      }
      return rounded;
    });

    // Grand totals
    const totals = {
      total_runs: runs.length,
      total_employees: employeeMap.size,
      total_gross: Math.round(runs.reduce((s, r) => s + Number(r.total_gross), 0) * 100) / 100,
      total_net: Math.round(runs.reduce((s, r) => s + Number(r.total_net), 0) * 100) / 100,
      total_deductions: Math.round(runs.reduce((s, r) => s + Number(r.total_deductions), 0) * 100) / 100,
      total_employer_taxes: Math.round(runs.reduce((s, r) => s + Number(r.total_employer_taxes), 0) * 100) / 100,
    };

    return { totals, employees: employeeSummaries, runs };
  }
}
