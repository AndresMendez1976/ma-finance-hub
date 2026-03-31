// Bank rule service — CRUD rules, test matching, apply rules to unreconciled transactions
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

@Injectable()
export class BankRuleService {
  // Create a new bank rule
  async create(trx: Knex.Transaction, tenantId: number, data: {
    name: string; priority: number; conditions: RuleCondition[];
    action_account_id: number; action_contact_id?: number;
    action_category?: string; action_memo?: string; auto_approve?: boolean;
  }) {
    const [rule] = await trx('bank_rules').insert({
      tenant_id: tenantId,
      name: data.name,
      priority: data.priority,
      conditions: JSON.stringify(data.conditions),
      action_account_id: data.action_account_id,
      action_contact_id: data.action_contact_id ?? null,
      action_category: data.action_category ?? null,
      action_memo: data.action_memo ?? null,
      auto_approve: data.auto_approve ?? false,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];
    return rule;
  }

  // List all bank rules ordered by priority
  async findAll(trx: Knex.Transaction) {
    const rows = await trx('bank_rules')
      .select('*')
      .orderBy('priority', 'asc')
      .orderBy('name', 'asc') as Record<string, unknown>[];

    return rows.map((r) => ({
      ...r,
      conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) as unknown : r.conditions,
    }));
  }

  // Get single bank rule
  async findOne(trx: Knex.Transaction, id: number) {
    const rule = await trx('bank_rules').where({ id }).first() as Record<string, unknown> | undefined;
    if (!rule) return null;
    return {
      ...rule,
      conditions: typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) as unknown : rule.conditions,
    };
  }

  // Update a bank rule
  async update(trx: Knex.Transaction, id: number, data: Record<string, unknown>) {
    const rule = await trx('bank_rules').where({ id }).first() as Record<string, unknown> | undefined;
    if (!rule) throw new NotFoundException('Bank rule not found');

    const updates: Record<string, unknown> = {};
    const allowedFields = ['name', 'priority', 'conditions', 'action_account_id', 'action_contact_id', 'action_category', 'action_memo', 'auto_approve', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = field === 'conditions' ? JSON.stringify(data[field]) : data[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await trx('bank_rules').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Delete a bank rule
  async delete(trx: Knex.Transaction, id: number) {
    const rule = await trx('bank_rules').where({ id }).first() as Record<string, unknown> | undefined;
    if (!rule) throw new NotFoundException('Bank rule not found');

    await trx('bank_rules').where({ id }).del();
    return { deleted: true };
  }

  // Evaluate a single transaction against a rule's conditions (AND logic)
  private matchesRule(txn: { description: string; amount: number; type: string }, conditions: RuleCondition[]): boolean {
    for (const condition of conditions) {
      const { field, operator, value } = condition;

      if (field === 'description') {
        if (operator === 'contains') {
          if (!txn.description.toLowerCase().includes(value.toLowerCase())) return false;
        } else if (operator === 'equals') {
          if (txn.description.toLowerCase() !== value.toLowerCase()) return false;
        }
      } else if (field === 'amount') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;
        if (operator === 'greater_than') {
          if (!(txn.amount > numValue)) return false;
        } else if (operator === 'less_than') {
          if (!(txn.amount < numValue)) return false;
        } else if (operator === 'equals') {
          if (txn.amount !== numValue) return false;
        }
      } else if (field === 'type') {
        if (operator === 'equals') {
          if (txn.type !== value) return false;
        }
      }
    }
    return true;
  }

  // Test a transaction description/amount/type against all active rules, return first match
  async testRule(trx: Knex.Transaction, data: { description: string; amount: number; type: string }) {
    const rules = await trx('bank_rules')
      .where({ is_active: true })
      .orderBy('priority', 'asc')
      .select('*') as Record<string, unknown>[];

    for (const rule of rules) {
      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions) as RuleCondition[]
        : rule.conditions as RuleCondition[];

      if (this.matchesRule(data, conditions)) {
        return {
          matched: true,
          rule: {
            ...rule,
            conditions,
          },
        };
      }
    }

    return { matched: false, rule: null };
  }

  // Apply rules to all unreconciled transactions of a bank account, return suggestions
  async applyRules(trx: Knex.Transaction, _tenantId: number, bankAccountId: number) {
    const account = await trx('bank_accounts').where({ id: bankAccountId }).first() as Record<string, unknown> | undefined;
    if (!account) throw new NotFoundException('Bank account not found');

    const transactions = await trx('bank_transactions')
      .where({ bank_account_id: bankAccountId, reconciled: false })
      .orderBy('date', 'asc')
      .select('*') as Record<string, unknown>[];

    const rules = await trx('bank_rules')
      .where({ is_active: true })
      .orderBy('priority', 'asc')
      .select('*') as Record<string, unknown>[];

    const suggestions: Record<string, unknown>[] = [];

    for (const txn of transactions) {
      const txnData = {
        description: String(txn.description ?? ''),
        amount: Number(txn.amount),
        type: String(txn.type ?? ''),
      };

      for (const rule of rules) {
        const conditions = typeof rule.conditions === 'string'
          ? JSON.parse(rule.conditions) as RuleCondition[]
          : rule.conditions as RuleCondition[];

        if (this.matchesRule(txnData, conditions)) {
          suggestions.push({
            transaction_id: txn.id,
            transaction_date: txn.date,
            transaction_description: txn.description,
            transaction_amount: txn.amount,
            transaction_type: txn.type,
            rule_id: rule.id,
            rule_name: rule.name,
            action_account_id: rule.action_account_id,
            action_contact_id: rule.action_contact_id,
            action_category: rule.action_category,
            action_memo: rule.action_memo,
            auto_approve: rule.auto_approve,
          });
          break; // First match wins
        }
      }
    }

    return suggestions;
  }
}
