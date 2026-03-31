// Payroll Calculation Service — federal/state tax brackets, FICA, FUTA, SUTA
import { Injectable } from '@nestjs/common';

export interface TaxResult {
  gross_pay: number;
  federal_income_tax: number;
  social_security_employee: number;
  medicare_employee: number;
  state_income_tax: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  social_security_employer: number;
  medicare_employer: number;
  futa_employer: number;
  suta_employer: number;
  total_employer_taxes: number;
}

@Injectable()
export class PayrollCalculationService {
  // Simplified federal tax brackets (2024 single)
  private readonly federalBrackets = [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ];

  // Calculate annual federal tax
  private calculateFederalTax(annualTaxableIncome: number, filingStatus: string): number {
    // Use single brackets, married gets 2x bracket widths (simplified)
    const multiplier = filingStatus === 'married' ? 2 : 1;
    let tax = 0;
    let remaining = annualTaxableIncome;

    for (const bracket of this.federalBrackets) {
      const min = bracket.min * multiplier;
      const max = bracket.max === Infinity ? Infinity : bracket.max * multiplier;
      const taxable = Math.min(remaining, max - min);
      if (taxable <= 0) break;
      tax += taxable * bracket.rate;
      remaining -= taxable;
    }
    return Math.round(tax * 100) / 100;
  }

  // Get pay periods per year based on frequency
  private getPeriodsPerYear(frequency: string): number {
    switch (frequency) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'semimonthly': return 24;
      case 'monthly': return 12;
      default: return 12;
    }
  }

  // Calculate payroll for one employee for one pay period
  calculateEmployeePayroll(params: {
    pay_type: string;
    pay_rate: number;
    pay_frequency: string;
    hours_worked?: number;
    federal_filing_status: string;
    federal_allowances: number;
    state_tax_rate: number; // state income tax rate (0 for TX)
    pre_tax_deductions: number;
    post_tax_deductions: number;
    ytd_gross: number; // year-to-date gross for FUTA cap
    suta_rate: number; // employer SUTA rate, default 2.7%
  }): TaxResult {
    const periodsPerYear = this.getPeriodsPerYear(params.pay_frequency);

    // Calculate gross pay
    let gross_pay: number;
    if (params.pay_type === 'salary') {
      gross_pay = Math.round((params.pay_rate / periodsPerYear) * 100) / 100;
    } else {
      // Hourly
      const hours = params.hours_worked ?? 0;
      gross_pay = Math.round(hours * params.pay_rate * 100) / 100;
    }

    // Pre-tax deductions reduce taxable income
    const taxableIncome = Math.max(0, gross_pay - params.pre_tax_deductions);
    const annualTaxableIncome = taxableIncome * periodsPerYear;

    // Federal income tax (per period)
    const annualFedTax = this.calculateFederalTax(annualTaxableIncome, params.federal_filing_status);
    // Standard deduction equivalent reduction per allowance ($4,300 simplified)
    const allowanceReduction = params.federal_allowances * 4300 * (annualFedTax > 0 ? 0.12 : 0);
    const federal_income_tax = Math.max(0, Math.round(((annualFedTax - allowanceReduction) / periodsPerYear) * 100) / 100);

    // Social Security 6.2% (employee) — cap at $168,600 annual
    const ssWageCap = 168600;
    const ssableWage = Math.min(taxableIncome, Math.max(0, (ssWageCap - params.ytd_gross) > 0 ? taxableIncome : 0));
    const social_security_employee = Math.round(ssableWage * 0.062 * 100) / 100;
    const social_security_employer = Math.round(ssableWage * 0.062 * 100) / 100;

    // Medicare 1.45% (no cap)
    const medicare_employee = Math.round(taxableIncome * 0.0145 * 100) / 100;
    const medicare_employer = Math.round(taxableIncome * 0.0145 * 100) / 100;

    // State income tax
    const state_income_tax = Math.round(taxableIncome * params.state_tax_rate * 100) / 100;

    // Other (post-tax) deductions
    const other_deductions = params.post_tax_deductions;

    // Total employee deductions
    const total_deductions = Math.round((federal_income_tax + social_security_employee + medicare_employee + state_income_tax + params.pre_tax_deductions + other_deductions) * 100) / 100;

    // Net pay
    const net_pay = Math.round((gross_pay - total_deductions) * 100) / 100;

    // FUTA 0.6% on first $7,000 (employer only)
    const futaWageCap = 7000;
    const futaableWage = Math.min(gross_pay, Math.max(0, futaWageCap - params.ytd_gross));
    const futa_employer = Math.round(futaableWage * 0.006 * 100) / 100;

    // SUTA (employer only) — configurable rate, typically on first $7,000-$35,000 depending on state
    const suta_employer = Math.round(futaableWage * params.suta_rate * 100) / 100;

    const total_employer_taxes = Math.round((social_security_employer + medicare_employer + futa_employer + suta_employer) * 100) / 100;

    return {
      gross_pay, federal_income_tax, social_security_employee, medicare_employee,
      state_income_tax, other_deductions, total_deductions, net_pay,
      social_security_employer, medicare_employer, futa_employer, suta_employer,
      total_employer_taxes,
    };
  }
}
