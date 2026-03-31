// Notification service — CRUD, mark-read, trigger checks for overdue/low-stock/etc.
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class NotificationService {
  async createNotification(
    trx: Knex.Transaction,
    tenantId: number,
    data: { user_id: number; type: string; category: string; title: string; message: string; link?: string },
  ) {
    const [notification] = await trx('notifications').insert({
      tenant_id: tenantId,
      user_id: data.user_id,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      is_read: false,
    }).returning('*') as Record<string, unknown>[];
    return notification;
  }

  async findAll(
    trx: Knex.Transaction,
    userId: number,
    filters: { page?: number; limit?: number; is_read?: boolean },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = (page - 1) * limit;

    const query = trx('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    if (filters.is_read !== undefined) void query.where('is_read', filters.is_read);

    const countQuery = trx('notifications').where({ user_id: userId });
    if (filters.is_read !== undefined) void countQuery.where('is_read', filters.is_read);
    const [countResult] = await countQuery.count('* as total') as Record<string, unknown>[];
    const totalCount = Number(countResult.total);

    void query.limit(limit).offset(offset);
    const rows = await query as Record<string, unknown>[];
    return { data: rows, pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } };
  }

  async getUnreadCount(trx: Knex.Transaction, userId: number): Promise<number> {
    const [result] = await trx('notifications')
      .where({ user_id: userId, is_read: false })
      .count('* as total') as Record<string, unknown>[];
    return Number(result.total);
  }

  async markRead(trx: Knex.Transaction, id: number) {
    const [updated] = await trx('notifications')
      .where({ id })
      .update({ is_read: true })
      .returning('*') as Record<string, unknown>[];
    return updated;
  }

  async markAllRead(trx: Knex.Transaction, userId: number) {
    const count = await trx('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
    return { marked_read: count };
  }

  // --- Trigger methods: check conditions and create notifications ---

  async checkInvoiceOverdue(trx: Knex.Transaction, tenantId: number) {
    const overdue = await trx('invoices')
      .where({ tenant_id: tenantId, status: 'sent' })
      .where('due_date', '<', trx.fn.now())
      .select('id', 'invoice_number', 'due_date', 'total') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const inv of overdue) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'invoice_overdue', link: `/invoices/${String(inv.id)}` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'invoice_overdue',
            category: 'invoicing',
            title: `Invoice ${String(inv.invoice_number)} is overdue`,
            message: `Invoice ${String(inv.invoice_number)} was due on ${String(inv.due_date)} and remains unpaid.`,
            link: `/invoices/${String(inv.id)}`,
          });
        }
      }
    }
    return { checked: overdue.length };
  }

  async checkLowStock(trx: Knex.Transaction, tenantId: number) {
    const lowStock = await trx('products')
      .where({ tenant_id: tenantId })
      .whereNotNull('reorder_point')
      .whereRaw('quantity_on_hand < reorder_point')
      .select('id', 'name', 'sku', 'quantity_on_hand', 'reorder_point') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const prod of lowStock) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'low_stock', link: `/inventory/products/${String(prod.id)}` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'low_stock',
            category: 'inventory',
            title: `Low stock: ${String(prod.name)}`,
            message: `${String(prod.name)} (${String(prod.sku)}) has ${String(prod.quantity_on_hand)} units remaining, below reorder point of ${String(prod.reorder_point)}.`,
            link: `/inventory/products/${String(prod.id)}`,
          });
        }
      }
    }
    return { checked: lowStock.length };
  }

  async checkMaintenanceDue(trx: Knex.Transaction, tenantId: number) {
    const upcoming = await trx('maintenance_schedules')
      .where({ tenant_id: tenantId })
      .whereRaw("next_due_date <= NOW() + INTERVAL '7 days'")
      .whereRaw('next_due_date >= NOW()')
      .select('id', 'asset_id', 'description', 'next_due_date') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const maint of upcoming) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'maintenance_due', link: `/fixed-assets/${String(maint.asset_id)}/maintenance` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'maintenance_due',
            category: 'fixed_assets',
            title: `Maintenance due: ${String(maint.description)}`,
            message: `Scheduled maintenance "${String(maint.description)}" is due on ${String(maint.next_due_date)}.`,
            link: `/fixed-assets/${String(maint.asset_id)}/maintenance`,
          });
        }
      }
    }
    return { checked: upcoming.length };
  }

  async checkPayrollReminder(trx: Knex.Transaction, tenantId: number) {
    const upcoming = await trx('payroll_runs')
      .where({ tenant_id: tenantId })
      .whereIn('status', ['draft', 'calculated'])
      .whereRaw("pay_date <= NOW() + INTERVAL '3 days'")
      .whereRaw('pay_date >= NOW()')
      .select('id', 'pay_date', 'status') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const run of upcoming) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'payroll_reminder', link: `/payroll/runs/${String(run.id)}` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'payroll_reminder',
            category: 'payroll',
            title: `Payroll run due ${String(run.pay_date)}`,
            message: `Payroll run #${String(run.id)} (${String(run.status)}) has a pay date of ${String(run.pay_date)}. Please review and approve.`,
            link: `/payroll/runs/${String(run.id)}`,
          });
        }
      }
    }
    return { checked: upcoming.length };
  }

  async checkExpensePendingApproval(trx: Knex.Transaction, tenantId: number) {
    const pending = await trx('expenses')
      .where({ tenant_id: tenantId, status: 'pending' })
      .select('id', 'expense_number', 'vendor_name', 'amount') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const exp of pending) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'expense_pending', link: `/expenses/${String(exp.id)}` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'expense_pending',
            category: 'expenses',
            title: `Expense pending approval: ${String(exp.expense_number)}`,
            message: `Expense ${String(exp.expense_number)} from ${String(exp.vendor_name)} for $${String(exp.amount)} is awaiting approval.`,
            link: `/expenses/${String(exp.id)}`,
          });
        }
      }
    }
    return { checked: pending.length };
  }

  async checkPoPendingReceipt(trx: Knex.Transaction, tenantId: number) {
    const pending = await trx('purchase_orders')
      .where({ tenant_id: tenantId, status: 'sent' })
      .whereRaw("created_at <= NOW() - INTERVAL '7 days'")
      .select('id', 'po_number', 'vendor_name') as Record<string, unknown>[];

    const users = await trx('users').where({ tenant_id: tenantId }).select('id') as Record<string, unknown>[];
    const ownerIds = users.map((u) => Number(u.id));

    for (const po of pending) {
      for (const uid of ownerIds) {
        const existing = await trx('notifications')
          .where({ tenant_id: tenantId, user_id: uid, type: 'po_pending_receipt', link: `/purchase-orders/${String(po.id)}` })
          .where('created_at', '>', trx.raw("NOW() - INTERVAL '24 hours'"))
          .first() as Record<string, unknown> | undefined;
        if (!existing) {
          await this.createNotification(trx, tenantId, {
            user_id: uid,
            type: 'po_pending_receipt',
            category: 'purchasing',
            title: `PO ${String(po.po_number)} pending receipt`,
            message: `Purchase order ${String(po.po_number)} from ${String(po.vendor_name)} was sent over 7 days ago and has not been received.`,
            link: `/purchase-orders/${String(po.id)}`,
          });
        }
      }
    }
    return { checked: pending.length };
  }
}
