// Document Templates service — CRUD, default management
import { Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

export interface CreateTemplateInput {
  tenant_id: number;
  document_type: string;
  name?: string;
  layout?: string;
  primary_color?: string;
  secondary_color?: string;
  font?: string;
  show_logo?: boolean;
  show_company_address?: boolean;
  show_company_phone?: boolean;
  show_company_email?: boolean;
  show_tax_id?: boolean;
  header_text?: string;
  footer_text?: string;
  terms_text?: string;
  notes_text?: string;
  show_payment_link?: boolean;
  show_due_date?: boolean;
  show_po_number?: boolean;
  paper_size?: string;
  is_default?: boolean;
}

export interface UpdateTemplateInput extends Partial<Omit<CreateTemplateInput, 'tenant_id'>> {}

const DEFAULTS: Record<string, unknown> = {
  name: 'Default',
  layout: 'classic',
  primary_color: '#2D6A4F',
  secondary_color: '#E8DCC8',
  font: 'helvetica',
  show_logo: true,
  show_company_address: true,
  show_company_phone: true,
  show_company_email: true,
  show_tax_id: false,
  show_payment_link: true,
  show_due_date: true,
  show_po_number: true,
  paper_size: 'letter',
  is_default: false,
};

@Injectable()
export class DocumentTemplatesService {
  // List all templates for tenant, optionally filtered by document_type
  async findAll(trx: Knex.Transaction, filters?: { document_type?: string }) {
    const query = trx('document_templates').select('*').orderBy('document_type').orderBy('name');
    if (filters?.document_type) void query.where('document_type', filters.document_type);
    return query as Promise<Record<string, unknown>[]>;
  }

  // Get single template
  async findOne(trx: Knex.Transaction, id: number) {
    const template = await trx('document_templates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  // Find the default template for a given document type
  async findDefault(trx: Knex.Transaction, documentType: string) {
    const template = await trx('document_templates')
      .where({ document_type: documentType, is_default: true })
      .first() as Record<string, unknown> | undefined;
    return template ?? null;
  }

  // Get default template or return a virtual default (never null)
  async getOrDefault(trx: Knex.Transaction, tenantId: number, documentType: string): Promise<Record<string, unknown>> {
    const existing = await this.findDefault(trx, documentType);
    if (existing) return existing;

    // Return virtual default
    return {
      id: null,
      tenant_id: tenantId,
      document_type: documentType,
      ...DEFAULTS,
    };
  }

  // Create a new template
  async create(trx: Knex.Transaction, input: CreateTemplateInput) {
    // If setting as default, unset any existing default of same type
    if (input.is_default) {
      await trx('document_templates')
        .where({ tenant_id: input.tenant_id, document_type: input.document_type, is_default: true })
        .update({ is_default: false });
    }

    const data: Record<string, unknown> = { tenant_id: input.tenant_id, document_type: input.document_type };
    for (const [key, defVal] of Object.entries(DEFAULTS)) {
      data[key] = (input as unknown as Record<string, unknown>)[key] ?? defVal;
    }

    const [template] = await trx('document_templates').insert(data).returning('*') as Record<string, unknown>[];
    return template;
  }

  // Update a template
  async update(trx: Knex.Transaction, id: number, tenantId: number, input: UpdateTemplateInput) {
    const existing = await trx('document_templates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Template not found');

    const updates: Record<string, unknown> = {};
    const fields = [
      'name', 'layout', 'primary_color', 'secondary_color', 'font',
      'show_logo', 'show_company_address', 'show_company_phone', 'show_company_email', 'show_tax_id',
      'header_text', 'footer_text', 'terms_text', 'notes_text',
      'show_payment_link', 'show_due_date', 'show_po_number', 'paper_size', 'is_default', 'document_type',
    ];
    for (const f of fields) {
      const val = (input as Record<string, unknown>)[f];
      if (val !== undefined) updates[f] = val;
    }

    // If setting as default, unset other defaults of same type
    if (updates.is_default === true) {
      const docType = (updates.document_type ?? existing.document_type) as string;
      await trx('document_templates')
        .where({ tenant_id: tenantId, document_type: docType, is_default: true })
        .whereNot({ id })
        .update({ is_default: false });
    }

    if (Object.keys(updates).length > 0) {
      await trx('document_templates').where({ id }).update(updates);
    }

    return trx('document_templates').where({ id }).first() as Promise<Record<string, unknown>>;
  }

  // Delete a template
  async remove(trx: Knex.Transaction, id: number) {
    const existing = await trx('document_templates').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Template not found');
    await trx('document_templates').where({ id }).del();
    return { deleted: true };
  }
}
