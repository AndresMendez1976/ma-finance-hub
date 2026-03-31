import { Injectable, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

export interface PostingRuleMatch {
  ruleId: number;
  ruleName: string;
  lines: { accountId: number; entryType: 'debit' | 'credit'; amountSource: string }[];
}

export interface EventPayload {
  event_type: string;
  amount: number;
  [key: string]: unknown;
}

@Injectable()
export class PostingRulesService {
  /**
   * Find active posting rules matching an event type for the current tenant.
   * Runs inside a tenant-scoped transaction (RLS enforced).
   */
  async findMatchingRules(trx: Knex.Transaction, eventType: string): Promise<PostingRuleMatch[]> {
    const rules = await trx('posting_rules')
      .where({ event_type: eventType, is_active: true })
      .select('id', 'name');

    const result: PostingRuleMatch[] = [];

    for (const rule of rules) {
      const lines = await trx('posting_rule_lines')
        .where({ posting_rule_id: rule.id })
        .orderBy('line_order')
        .select('account_id', 'entry_type', 'amount_source');

      result.push({
        ruleId: Number(rule.id),
        ruleName: rule.name,
        lines: lines.map((l) => ({
          accountId: Number(l.account_id),
          entryType: l.entry_type as 'debit' | 'credit',
          amountSource: l.amount_source,
        })),
      });
    }

    return result;
  }

  /**
   * Resolve an amount_source against an event payload.
   * Supports: "payload.amount", "payload.tax", or literal numbers.
   */
  resolveAmount(amountSource: string, payload: EventPayload): number {
    if (amountSource.startsWith('payload.')) {
      const field = amountSource.substring(8);
      const val = payload[field];
      if (typeof val !== 'number') {
        throw new BadRequestException(`Cannot resolve amount source '${amountSource}': field '${field}' is not a number`);
      }
      return val;
    }
    const num = Number(amountSource);
    if (isNaN(num)) {
      throw new BadRequestException(`Invalid amount source: '${amountSource}'`);
    }
    return num;
  }

  /**
   * Execute a posting rule against an event payload.
   * Returns journal lines ready for insertion.
   */
  executeRule(
    rule: PostingRuleMatch,
    payload: EventPayload,
  ): { account_id: number; debit: number; credit: number; description: string }[] {
    if (rule.lines.length < 2) {
      throw new BadRequestException(`Rule '${rule.ruleName}' has fewer than 2 lines — cannot produce balanced entry`);
    }

    const lines = rule.lines.map((line) => {
      const amount = this.resolveAmount(line.amountSource, payload);
      if (amount <= 0) {
        throw new BadRequestException(`Rule '${rule.ruleName}': resolved amount must be positive, got ${amount}`);
      }
      return {
        account_id: line.accountId,
        debit: line.entryType === 'debit' ? amount : 0,
        credit: line.entryType === 'credit' ? amount : 0,
        description: `Auto: ${rule.ruleName} [${payload.event_type}]`,
      };
    });

    // Pre-validate balance before handing to journal service
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException(
        `Rule '${rule.ruleName}' produces unbalanced entry: debit=${totalDebit}, credit=${totalCredit}`,
      );
    }

    return lines;
  }
}
