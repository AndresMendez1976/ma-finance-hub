// Tax calculation service — compute tax amounts with compound support
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class TaxCalculationService {
  // Calculate tax for a subtotal using a stored tax rate
  async calculateTax(trx: Knex.Transaction, subtotal: number, taxRateId: number) {
    const rate = await trx('tax_rates').where({ id: taxRateId }).first() as Record<string, unknown> | undefined;
    if (!rate) throw new NotFoundException('Tax rate not found');

    const isCompound = Boolean(rate.is_compound);
    const components = await trx('tax_rate_components')
      .where({ tax_rate_id: taxRateId })
      .orderBy('sort_order', 'asc') as Record<string, unknown>[];

    if (components.length === 0) {
      // Simple rate — no components
      const taxAmount = Math.round(subtotal * Number(rate.rate) / 100 * 100) / 100;
      return {
        subtotal,
        tax_rate_id: taxRateId,
        tax_rate_name: rate.name,
        rate: Number(rate.rate),
        tax_amount: taxAmount,
        total: Math.round((subtotal + taxAmount) * 100) / 100,
        components: [],
      };
    }

    // Component-based calculation
    return this.calculateLineTax(subtotal, Number(rate.rate), isCompound, components);
  }

  // Per-line tax calculation with component and compound support
  calculateLineTax(
    amount: number,
    overallRate: number,
    isCompound: boolean,
    components: Record<string, unknown>[],
  ) {
    const componentResults: { name: string; rate: number; jurisdiction_level: string; tax_amount: number }[] = [];
    let totalTax = 0;
    let runningBase = amount;

    if (components.length === 0) {
      // No components — use overall rate
      const taxAmount = Math.round(amount * overallRate / 100 * 100) / 100;
      return {
        subtotal: amount,
        rate: overallRate,
        tax_amount: taxAmount,
        total: Math.round((amount + taxAmount) * 100) / 100,
        components: [],
      };
    }

    for (const comp of components) {
      const compRate = Number(comp.rate);
      const compName = String(comp.name);
      const jurisdictionLevel = String(comp.jurisdiction_level);

      // Compound: each component applies to subtotal + all previous tax
      // Non-compound: each component applies to original subtotal
      const base = isCompound ? runningBase : amount;
      const taxAmount = Math.round(base * compRate / 100 * 100) / 100;

      componentResults.push({
        name: compName,
        rate: compRate,
        jurisdiction_level: jurisdictionLevel,
        tax_amount: taxAmount,
      });

      totalTax += taxAmount;
      if (isCompound) {
        runningBase += taxAmount;
      }
    }

    totalTax = Math.round(totalTax * 100) / 100;

    return {
      subtotal: amount,
      rate: overallRate,
      tax_amount: totalTax,
      total: Math.round((amount + totalTax) * 100) / 100,
      components: componentResults,
    };
  }
}
