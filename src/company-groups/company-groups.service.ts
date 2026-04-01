// Company Groups service — multi-company management, consolidated dashboard
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class CompanyGroupsService {
  // Create a new company group — uses db directly (cross-tenant)
  async create(db: Knex, userId: number, name: string) {
    const [group] = await db('company_groups').insert({
      name,
      owner_user_id: userId,
    }).returning('*') as Record<string, unknown>[];
    return group;
  }

  // List groups owned by user
  async findAll(db: Knex, userId: number) {
    const rows = await db('company_groups')
      .where({ owner_user_id: userId })
      .select('*')
      .orderBy('name') as Record<string, unknown>[];

    // Enrich with tenant list
    const results: Record<string, unknown>[] = [];
    for (const group of rows) {
      const tenants = await db('company_group_tenants as cgt')
        .leftJoin('tenants as t', 't.id', 'cgt.tenant_id')
        .where({ 'cgt.company_group_id': group.id })
        .select('cgt.tenant_id', 't.name as tenant_name') as Record<string, unknown>[];
      results.push({ ...group, tenants });
    }
    return results;
  }

  // Find a single group
  async findOne(db: Knex, id: number, userId: number) {
    const group = await db('company_groups')
      .where({ id, owner_user_id: userId })
      .first() as Record<string, unknown> | undefined;
    if (!group) throw new NotFoundException('Company group not found');

    const tenants = await db('company_group_tenants as cgt')
      .leftJoin('tenants as t', 't.id', 'cgt.tenant_id')
      .where({ 'cgt.company_group_id': id })
      .select('cgt.tenant_id', 't.name as tenant_name') as Record<string, unknown>[];

    return { ...group, tenants };
  }

  // Add a tenant to the group — validate user is owner of that tenant
  async addTenant(db: Knex, groupId: number, tenantId: number, userId: number) {
    const group = await db('company_groups')
      .where({ id: groupId, owner_user_id: userId })
      .first() as Record<string, unknown> | undefined;
    if (!group) throw new NotFoundException('Company group not found');

    // Validate user has owner role in the tenant
    const membership = await db('memberships')
      .where({ user_id: userId, tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;
    if (!membership) throw new ForbiddenException('User is not a member of this tenant');
    if (membership.role !== 'owner') throw new ForbiddenException('Only tenant owners can add tenants to groups');

    // Check if already added
    const existing = await db('company_group_tenants')
      .where({ company_group_id: groupId, tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;
    if (existing) throw new BadRequestException('Tenant already in group');

    const [row] = await db('company_group_tenants').insert({
      company_group_id: groupId,
      tenant_id: tenantId,
    }).returning('*') as Record<string, unknown>[];
    return row;
  }

  // Remove a tenant from the group
  async removeTenant(db: Knex, groupId: number, tenantId: number) {
    const existing = await db('company_group_tenants')
      .where({ company_group_id: groupId, tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Tenant not found in group');

    await db('company_group_tenants')
      .where({ company_group_id: groupId, tenant_id: tenantId })
      .del();
    return { removed: true };
  }

  // Consolidated dashboard — sum KPIs across all tenants in the group
  async getConsolidatedDashboard(db: Knex, groupId: number, userId: number) {
    const group = await db('company_groups')
      .where({ id: groupId, owner_user_id: userId })
      .first() as Record<string, unknown> | undefined;
    if (!group) throw new NotFoundException('Company group not found');

    const tenantRows = await db('company_group_tenants')
      .where({ company_group_id: groupId })
      .select('tenant_id') as Record<string, unknown>[];

    const tenantIds = tenantRows.map((r) => Number(r.tenant_id));
    if (tenantIds.length === 0) {
      return { group_id: groupId, group_name: String(group.name), tenants: [], totals: { revenue: 0, expenses: 0, net_income: 0, outstanding_receivables: 0, outstanding_payables: 0 } };
    }

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().slice(0, 10);

    const tenantData: { tenant_id: number; tenant_name: string; revenue: number; expenses: number; net_income: number; outstanding_receivables: number; outstanding_payables: number }[] = [];

    for (const tenantId of tenantIds) {
      const tenant = await db('tenants').where({ id: tenantId }).select('name').first() as Record<string, unknown> | undefined;
      const tenantName = tenant ? String(tenant.name) : `Tenant ${tenantId}`;

      let revenue = 0;
      let expenses = 0;
      let outstandingReceivables = 0;
      let outstandingPayables = 0;

      try {
        const [revRow] = await db('invoices')
          .where({ tenant_id: tenantId, status: 'paid' })
          .where('paid_date', '>=', yearStart)
          .where('paid_date', '<=', today)
          .sum('paid_amount as total') as Record<string, unknown>[];
        revenue = Number(revRow?.total) || 0;
      } catch { /* table may not exist */ }

      try {
        const [expRow] = await db('expenses')
          .where({ tenant_id: tenantId })
          .where('status', 'posted')
          .where('date', '>=', yearStart)
          .where('date', '<=', today)
          .sum('amount as total') as Record<string, unknown>[];
        expenses = Number(expRow?.total) || 0;
      } catch { /* table may not exist */ }

      try {
        const [arRow] = await db('invoices')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['sent', 'overdue'])
          .sum('total as amount') as Record<string, unknown>[];
        outstandingReceivables = Number(arRow?.amount) || 0;
      } catch { /* table may not exist */ }

      try {
        const [apRow] = await db('expenses')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['pending', 'approved'])
          .sum('amount as total') as Record<string, unknown>[];
        outstandingPayables = Number(apRow?.total) || 0;
      } catch { /* table may not exist */ }

      tenantData.push({
        tenant_id: tenantId,
        tenant_name: tenantName,
        revenue,
        expenses,
        net_income: revenue - expenses,
        outstanding_receivables: outstandingReceivables,
        outstanding_payables: outstandingPayables,
      });
    }

    const totals = tenantData.reduce((acc, t) => ({
      revenue: acc.revenue + t.revenue,
      expenses: acc.expenses + t.expenses,
      net_income: acc.net_income + t.net_income,
      outstanding_receivables: acc.outstanding_receivables + t.outstanding_receivables,
      outstanding_payables: acc.outstanding_payables + t.outstanding_payables,
    }), { revenue: 0, expenses: 0, net_income: 0, outstanding_receivables: 0, outstanding_payables: 0 });

    return {
      group_id: groupId,
      group_name: String(group.name),
      period: { from: yearStart, to: today },
      tenants: tenantData,
      totals,
    };
  }
}
