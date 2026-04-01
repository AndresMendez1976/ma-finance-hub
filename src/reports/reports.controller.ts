// Reports controller — Balance Sheet, Income Statement, Cash Flow Statement endpoints
import { Controller, Get, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, IdentityGuard, RolesGuard, CurrentPrincipal, Roles } from '../auth';
import { AuthenticatedPrincipal } from '../auth/interfaces';
import { TenantContextService } from '../auth/tenant-context.service';
import { AuditService } from '../auth/audit.service';
import { EntitlementGuard, RequiresEntitlement } from '../entitlements';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';

// Validate date string format YYYY-MM-DD
function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, IdentityGuard, RolesGuard, EntitlementGuard)
@RequiresEntitlement('feature.journal')
export class ReportsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly service: ReportsService,
    private readonly audit: AuditService,
    private readonly pdfService: ReportPdfService,
  ) {}

  // Dashboard KPIs — aggregated financial data
  @Get('dashboard-kpis')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async dashboardKpis(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.dashboardKpis(trx));
  }

  // Balance Sheet — as-of date
  @Get('balance-sheet')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'as_of', required: true, example: '2026-12-31' })
  async balanceSheet(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.balanceSheet(trx, asOf),
    );
  }

  // Balance Sheet CSV export
  @Get('balance-sheet/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async balanceSheetExport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.balanceSheet(trx, asOf),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'balance_sheet', metadata: { as_of: asOf } }),
    );
    const csv = this.balanceSheetToCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=balance-sheet-${asOf}.csv`);
    res.send(csv);
  }

  // Income Statement — date range
  @Get('income-statement')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-12-31' })
  async incomeStatement(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.incomeStatement(trx, from, to),
    );
  }

  // Income Statement CSV export
  @Get('income-statement/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async incomeStatementExport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.incomeStatement(trx, from, to),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'income_statement', metadata: { from, to } }),
    );
    const csv = this.incomeStatementToCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=income-statement-${from}-to-${to}.csv`);
    res.send(csv);
  }

  // Cash Flow Statement — date range
  @Get('cash-flow')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'from', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-12-31' })
  async cashFlow(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.cashFlow(trx, from, to),
    );
  }

  // Cash Flow Statement CSV export
  @Get('cash-flow/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async cashFlowExport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.cashFlow(trx, from, to),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: 'cash_flow', metadata: { from, to } }),
    );
    const csv = this.cashFlowToCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cash-flow-${from}-to-${to}.csv`);
    res.send(csv);
  }

  // CSV formatters
  private balanceSheetToCsv(data: Awaited<ReturnType<ReportsService['balanceSheet']>>): string {
    const lines: string[] = [`Balance Sheet as of ${data.as_of}`, 'Section,Category,Account Code,Account Name,Amount'];
    for (const section of [
      { name: 'Assets', groups: data.assets.groups, total: data.assets.total },
      { name: 'Liabilities', groups: data.liabilities.groups, total: data.liabilities.total },
      { name: 'Equity', groups: data.equity.groups, total: data.equity.total },
    ]) {
      for (const g of section.groups) {
        for (const a of g.accounts) {
          lines.push(`${section.name},${g.category},${a.account_code},"${a.account_name}",${a.amount.toFixed(2)}`);
        }
        lines.push(`${section.name},${g.category} Subtotal,,,${g.total.toFixed(2)}`);
      }
      lines.push(`${section.name} Total,,,,${section.total.toFixed(2)}`);
    }
    lines.push(`,,,,`);
    lines.push(`Balanced,,,,"${data.is_balanced ? 'Yes' : 'No'}"`);
    return lines.join('\n');
  }

  private incomeStatementToCsv(data: Awaited<ReturnType<ReportsService['incomeStatement']>>): string {
    const lines: string[] = [`Income Statement ${data.period.from} to ${data.period.to}`, 'Section,Account Code,Account Name,Amount'];
    for (const g of data.revenue.groups) {
      for (const a of g.accounts) lines.push(`Revenue,${a.account_code},"${a.account_name}",${a.amount.toFixed(2)}`);
    }
    lines.push(`Total Revenue,,,${data.revenue.total.toFixed(2)}`);
    for (const g of data.cost_of_goods_sold.groups) {
      for (const a of g.accounts) lines.push(`COGS,${a.account_code},"${a.account_name}",${a.amount.toFixed(2)}`);
    }
    lines.push(`Total COGS,,,${data.cost_of_goods_sold.total.toFixed(2)}`);
    lines.push(`Gross Profit,,,${data.gross_profit.toFixed(2)}`);
    for (const g of data.operating_expenses.groups) {
      for (const a of g.accounts) lines.push(`Operating Expenses,${a.account_code},"${a.account_name}",${a.amount.toFixed(2)}`);
    }
    lines.push(`Total Operating Expenses,,,${data.operating_expenses.total.toFixed(2)}`);
    lines.push(`Operating Income,,,${data.operating_income.toFixed(2)}`);
    for (const g of data.other_expenses.groups) {
      for (const a of g.accounts) lines.push(`Other Expenses,${a.account_code},"${a.account_name}",${a.amount.toFixed(2)}`);
    }
    lines.push(`Net Income,,,${data.net_income.toFixed(2)}`);
    return lines.join('\n');
  }

  private cashFlowToCsv(data: Awaited<ReturnType<ReportsService['cashFlow']>>): string {
    const lines: string[] = [`Cash Flow Statement ${data.period.from} to ${data.period.to}`, 'Section,Item,Amount'];
    lines.push(`Operating,Net Income,${data.net_income.toFixed(2)}`);
    for (const a of data.operating.adjustments) lines.push(`Operating,"${a.name}",${a.amount.toFixed(2)}`);
    lines.push(`Operating Total,,${data.operating.total.toFixed(2)}`);
    for (const a of data.investing.items) lines.push(`Investing,"${a.name}",${a.amount.toFixed(2)}`);
    lines.push(`Investing Total,,${data.investing.total.toFixed(2)}`);
    for (const a of data.financing.items) lines.push(`Financing,"${a.name}",${a.amount.toFixed(2)}`);
    lines.push(`Financing Total,,${data.financing.total.toFixed(2)}`);
    lines.push(`Net Cash Change,,${data.net_cash_change.toFixed(2)}`);
    return lines.join('\n');
  }

  // Executive Dashboard — comprehensive KPIs and trends
  @Get('dashboard/executive')
  @Roles('owner', 'admin', 'manager', 'analyst', 'viewer')
  async getExecutiveDashboard(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getExecutiveDashboard(trx, p.tenantId),
    );
  }

  // Aged Receivables
  @Get('aged-receivables')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'as_of', required: false })
  async agedReceivables(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('as_of') asOf?: string) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.agedReceivables(trx, date));
  }

  @Get('aged-receivables/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async agedReceivablesExport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('as_of') asOf: string, @Res() res: Response) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.agedReceivables(trx, date));
    const lines = [`Aged Receivables as of ${data.as_of}`, 'Customer,Current (0-30),31-60,61-90,90+,Total'];
    for (const r of data.rows) lines.push(`"${r.customer}",${r.current.toFixed(2)},${r.d31_60.toFixed(2)},${r.d61_90.toFixed(2)},${r.d90plus.toFixed(2)},${r.total.toFixed(2)}`);
    lines.push(`Total,${data.totals.current.toFixed(2)},${data.totals.d31_60.toFixed(2)},${data.totals.d61_90.toFixed(2)},${data.totals.d90plus.toFixed(2)},${data.totals.total.toFixed(2)}`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=aged-receivables-${date}.csv`);
    res.send(lines.join('\n'));
  }

  // Aged Payables
  @Get('aged-payables')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'as_of', required: false })
  async agedPayables(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('as_of') asOf?: string) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.agedPayables(trx, date));
  }

  @Get('aged-payables/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async agedPayablesExport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query('as_of') asOf: string, @Res() res: Response) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) => this.service.agedPayables(trx, date));
    const lines = [`Aged Payables as of ${data.as_of}`, 'Vendor,Current (0-30),31-60,61-90,90+,Total'];
    for (const r of data.rows) lines.push(`"${r.vendor}",${r.current.toFixed(2)},${r.d31_60.toFixed(2)},${r.d61_90.toFixed(2)},${r.d90plus.toFixed(2)},${r.total.toFixed(2)}`);
    lines.push(`Total,${data.totals.current.toFixed(2)},${data.totals.d31_60.toFixed(2)},${data.totals.d61_90.toFixed(2)},${data.totals.d90plus.toFixed(2)},${data.totals.total.toFixed(2)}`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=aged-payables-${date}.csv`);
    res.send(lines.join('\n'));
  }

  // ─── Trial Balance ─────────────────────────────────────────────────────────

  @Get('trial-balance')
  @Roles('owner', 'admin', 'manager', 'analyst')
  @ApiQuery({ name: 'as_of', required: true, example: '2026-12-31' })
  async trialBalance(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.trialBalance(trx, asOf),
    );
  }

  @Get('trial-balance/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async trialBalanceExport(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.trialBalance(trx, asOf),
    );
    const lines = [`Trial Balance as of ${data.as_of}`, 'Account Code,Account Name,Debit,Credit'];
    for (const r of data.accounts) {
      lines.push(`${r.account_code},"${r.account_name}",${r.debit.toFixed(2)},${r.credit.toFixed(2)}`);
    }
    lines.push(`Total,,${data.total_debit.toFixed(2)},${data.total_credit.toFixed(2)}`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=trial-balance-${asOf}.csv`);
    res.send(lines.join('\n'));
  }

  // ─── PDF Export Endpoints ──────────────────────────────────────────────────

  @Get('balance-sheet/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async balanceSheetPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.balanceSheet(trx, asOf),
    );
    const rows: Record<string, unknown>[] = [];
    for (const section of [
      { name: 'Assets', groups: data.assets.groups, total: data.assets.total },
      { name: 'Liabilities', groups: data.liabilities.groups, total: data.liabilities.total },
      { name: 'Equity', groups: data.equity.groups, total: data.equity.total },
    ]) {
      for (const g of section.groups) {
        for (const a of g.accounts) {
          rows.push({ section: section.name, category: g.category, account_code: a.account_code, account_name: a.account_name, amount: a.amount });
        }
      }
      rows.push({ section: section.name, category: '', account_code: '', account_name: `Total ${section.name}`, amount: section.total });
    }

    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Balance Sheet',
      company_name: companyName,
      as_of: asOf,
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'category', label: 'Category' },
        { key: 'account_code', label: 'Code' },
        { key: 'account_name', label: 'Account' },
        { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=balance-sheet-${asOf}.pdf`);
    res.send(pdf);
  }

  @Get('income-statement/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async incomeStatementPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.incomeStatement(trx, from, to),
    );
    const rows: Record<string, unknown>[] = [];
    for (const g of data.revenue.groups) {
      for (const a of g.accounts) rows.push({ section: 'Revenue', account_code: a.account_code, account_name: a.account_name, amount: a.amount });
    }
    rows.push({ section: '', account_code: '', account_name: 'Total Revenue', amount: data.revenue.total });
    for (const g of data.cost_of_goods_sold.groups) {
      for (const a of g.accounts) rows.push({ section: 'COGS', account_code: a.account_code, account_name: a.account_name, amount: a.amount });
    }
    rows.push({ section: '', account_code: '', account_name: 'Gross Profit', amount: data.gross_profit });
    for (const g of data.operating_expenses.groups) {
      for (const a of g.accounts) rows.push({ section: 'Operating', account_code: a.account_code, account_name: a.account_name, amount: a.amount });
    }
    rows.push({ section: '', account_code: '', account_name: 'Net Income', amount: data.net_income });

    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Income Statement',
      company_name: companyName,
      date_range: `${from} to ${to}`,
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'account_code', label: 'Code' },
        { key: 'account_name', label: 'Account' },
        { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=income-statement-${from}-to-${to}.pdf`);
    res.send(pdf);
  }

  @Get('cash-flow/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async cashFlowPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    if (!from || !isValidDate(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    if (!to || !isValidDate(to)) throw new BadRequestException('to must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.cashFlow(trx, from, to),
    );
    const rows: Record<string, unknown>[] = [];
    rows.push({ section: 'Operating', item: 'Net Income', amount: data.net_income });
    for (const a of data.operating.adjustments) rows.push({ section: 'Operating', item: a.name, amount: a.amount });
    rows.push({ section: '', item: 'Operating Total', amount: data.operating.total });
    for (const a of data.investing.items) rows.push({ section: 'Investing', item: a.name, amount: a.amount });
    rows.push({ section: '', item: 'Investing Total', amount: data.investing.total });
    for (const a of data.financing.items) rows.push({ section: 'Financing', item: a.name, amount: a.amount });
    rows.push({ section: '', item: 'Financing Total', amount: data.financing.total });
    rows.push({ section: '', item: 'Net Cash Change', amount: data.net_cash_change });

    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Cash Flow Statement',
      company_name: companyName,
      date_range: `${from} to ${to}`,
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'item', label: 'Item' },
        { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cash-flow-${from}-to-${to}.pdf`);
    res.send(pdf);
  }

  @Get('trial-balance/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async trialBalancePdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    if (!asOf || !isValidDate(asOf)) throw new BadRequestException('as_of must be YYYY-MM-DD');
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.trialBalance(trx, asOf),
    );
    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Trial Balance',
      company_name: companyName,
      as_of: asOf,
      columns: [
        { key: 'account_code', label: 'Code' },
        { key: 'account_name', label: 'Account Name' },
        { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
        { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
      ],
      rows: data.accounts,
      totals: { debit: data.total_debit, credit: data.total_credit },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=trial-balance-${asOf}.pdf`);
    res.send(pdf);
  }

  @Get('aged-receivables/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async agedReceivablesPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.agedReceivables(trx, date),
    );
    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Aged Receivables',
      company_name: companyName,
      as_of: date,
      columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'current', label: 'Current', align: 'right', format: 'currency' },
        { key: 'd31_60', label: '31-60', align: 'right', format: 'currency' },
        { key: 'd61_90', label: '61-90', align: 'right', format: 'currency' },
        { key: 'd90plus', label: '90+', align: 'right', format: 'currency' },
        { key: 'total', label: 'Total', align: 'right', format: 'currency' },
      ],
      rows: data.rows,
      totals: data.totals,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=aged-receivables-${date}.pdf`);
    res.send(pdf);
  }

  @Get('aged-payables/export-pdf')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async agedPayablesPdf(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Query('as_of') asOf: string,
    @Res() res: Response,
  ) {
    const date = asOf && isValidDate(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.agedPayables(trx, date),
    );
    const companyName = await this.getCompanyName(p);
    const pdf = await this.pdfService.generateReportPdf({
      title: 'Aged Payables',
      company_name: companyName,
      as_of: date,
      columns: [
        { key: 'vendor', label: 'Vendor' },
        { key: 'current', label: 'Current', align: 'right', format: 'currency' },
        { key: 'd31_60', label: '31-60', align: 'right', format: 'currency' },
        { key: 'd61_90', label: '61-90', align: 'right', format: 'currency' },
        { key: 'd90plus', label: '90+', align: 'right', format: 'currency' },
        { key: 'total', label: 'Total', align: 'right', format: 'currency' },
      ],
      rows: data.rows,
      totals: data.totals,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=aged-payables-${date}.pdf`);
    res.send(pdf);
  }

  // ─── Financial Ratios (Block 11) ───────────────────────────────────────────

  @Get('financial-ratios')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async getFinancialRatios(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.getFinancialRatios(trx, p.tenantId),
    );
  }

  // ─── 1099 Summary (Block 10) ──────────────────────────────────────────────

  @Get('1099-summary')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async get1099Summary(@CurrentPrincipal() p: AuthenticatedPrincipal) {
    return this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.get1099Summary(trx),
    );
  }

  @Get('1099-summary/export')
  @Roles('owner', 'admin', 'manager', 'analyst')
  async export1099Summary(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Res() res: Response,
  ) {
    const data = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.service.get1099Summary(trx),
    );
    await this.tenantContext.runInTenantContext(p.tenantId, p.sub, (trx) =>
      this.audit.log(trx, { tenant_id: p.tenantId, actor_subject: p.sub, action: 'export', entity: '1099_summary' }),
    );
    const lines = ['Vendor,Tax ID,Total Paid,Threshold Met'];
    for (const r of data.vendors) {
      lines.push(`"${r.vendor_name}","${r.tax_id}",${r.total_paid.toFixed(2)},${r.threshold_met ? 'Yes' : 'No'}`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=1099-summary.csv');
    res.send(lines.join('\n'));
  }

  // ─── Helper ────────────────────────────────────────────────────────────────

  private async getCompanyName(p: AuthenticatedPrincipal): Promise<string> {
    try {
      const tenant = await this.tenantContext.runInTenantContext(p.tenantId, p.sub, async (trx) => {
        const row = await trx('tenants').where({ id: p.tenantId }).select('name').first() as Record<string, unknown> | undefined;
        return row;
      });
      return tenant ? String(tenant.name) : 'Company';
    } catch {
      return 'Company';
    }
  }
}
