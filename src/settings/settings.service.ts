import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import * as crypto from 'crypto';

const DEFAULTS: Record<string, unknown> = {
  company_name: null,
  company_email: null,
  company_phone: null,
  company_address_line1: null,
  company_address_line2: null,
  company_city: null,
  company_state: null,
  company_zip: null,
  company_country: null,
  tax_id: null,
  fiscal_year_start_month: 1,
  default_currency: 'USD',
  invoice_prefix: 'INV-',
  invoice_next_number: 1,
  expense_prefix: 'EXP-',
  expense_next_number: 1,
};

const MAX_LOGO_SIZE_BYTES = 500 * 1024; // 500KB

const VALID_TEMPLATES = ['classic', 'modern', 'minimal'];

@Injectable()
export class SettingsService {
  private readonly encryptionKey: Buffer;

  constructor(config: ConfigService) {
    // AES-256 key from env, must be 32 bytes (64 hex chars) — same pattern as MFA
    const keyHex = config.get<string>('MFA_ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex'));
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  // Encrypt with AES-256-GCM (same pattern as MfaService)
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  // Decrypt AES-256-GCM
  private decrypt(encrypted: string): string {
    const [ivHex, tagHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getSettings(trx: Knex.Transaction, tenantId: number): Promise<Record<string, unknown>> {
    const existing = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .first() as Record<string, unknown> | undefined;

    if (existing) return this.sanitizeSettings(existing);

    const [row] = await trx('tenant_settings')
      .insert({ tenant_id: tenantId, ...DEFAULTS })
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  // Strip encrypted fields from response (never expose raw secret keys)
  private sanitizeSettings(row: Record<string, unknown>): Record<string, unknown> {
    const result = { ...row };
    // Mask secret keys — show only whether they are set
    result.stripe_secret_key_set = !!result.stripe_secret_key;
    result.stripe_webhook_secret_set = !!result.stripe_webhook_secret;
    delete result.stripe_secret_key;
    delete result.stripe_webhook_secret;
    return result;
  }

  async updateSettings(
    trx: Knex.Transaction,
    tenantId: number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Filter out undefined values so we only update provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update(updates)
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  // ── Logo ──

  async uploadLogo(
    trx: Knex.Transaction,
    tenantId: number,
    base64Data: string,
  ): Promise<Record<string, unknown>> {
    // Validate size: base64 is ~33% larger than raw bytes
    const rawSize = Math.ceil(base64Data.length * 0.75);
    if (rawSize > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException(`Logo exceeds maximum size of 500KB (got ${Math.round(rawSize / 1024)}KB)`);
    }

    // Basic format validation — must start with data:image/
    if (!base64Data.startsWith('data:image/')) {
      throw new BadRequestException('Logo must be a base64-encoded image (data:image/png, jpeg, or svg+xml)');
    }

    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update({ logo_base64: base64Data })
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  async deleteLogo(
    trx: Knex.Transaction,
    tenantId: number,
  ): Promise<Record<string, unknown>> {
    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update({ logo_base64: null })
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  // ── Invoice Template Settings ──

  async updateInvoiceSettings(
    trx: Knex.Transaction,
    tenantId: number,
    data: {
      invoice_template?: string;
      invoice_color_primary?: string;
      invoice_color_secondary?: string;
      invoice_footer_text?: string | null;
      invoice_payment_terms?: string | null;
      invoice_notes_default?: string | null;
      show_logo_on_invoice?: boolean;
      show_company_address?: boolean;
      show_tax_id?: boolean;
    },
  ): Promise<Record<string, unknown>> {
    const updates: Record<string, unknown> = {};

    if (data.invoice_template !== undefined) {
      if (!VALID_TEMPLATES.includes(data.invoice_template)) {
        throw new BadRequestException(`Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}`);
      }
      updates.invoice_template = data.invoice_template;
    }

    if (data.invoice_color_primary !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(data.invoice_color_primary)) {
        throw new BadRequestException('Primary color must be a valid hex color (e.g. #2D6A4F)');
      }
      updates.invoice_color_primary = data.invoice_color_primary;
    }

    if (data.invoice_color_secondary !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(data.invoice_color_secondary)) {
        throw new BadRequestException('Secondary color must be a valid hex color (e.g. #E8DCC8)');
      }
      updates.invoice_color_secondary = data.invoice_color_secondary;
    }

    if (data.invoice_footer_text !== undefined) updates.invoice_footer_text = data.invoice_footer_text;
    if (data.invoice_payment_terms !== undefined) updates.invoice_payment_terms = data.invoice_payment_terms;
    if (data.invoice_notes_default !== undefined) updates.invoice_notes_default = data.invoice_notes_default;
    if (data.show_logo_on_invoice !== undefined) updates.show_logo_on_invoice = data.show_logo_on_invoice;
    if (data.show_company_address !== undefined) updates.show_company_address = data.show_company_address;
    if (data.show_tax_id !== undefined) updates.show_tax_id = data.show_tax_id;

    if (Object.keys(updates).length === 0) {
      return this.getSettings(trx, tenantId);
    }

    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update(updates)
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  // ── Stripe Settings ──

  async updateStripeSettings(
    trx: Knex.Transaction,
    tenantId: number,
    data: {
      stripe_publishable_key?: string | null;
      stripe_secret_key?: string | null;
      stripe_webhook_secret?: string | null;
      payment_enabled?: boolean;
      accepted_payment_methods?: string[];
    },
  ): Promise<Record<string, unknown>> {
    const updates: Record<string, unknown> = {};

    if (data.stripe_publishable_key !== undefined) {
      updates.stripe_publishable_key = data.stripe_publishable_key;
    }

    if (data.stripe_secret_key !== undefined) {
      // Encrypt secret key before storing
      updates.stripe_secret_key = data.stripe_secret_key
        ? this.encrypt(data.stripe_secret_key)
        : null;
    }

    if (data.stripe_webhook_secret !== undefined) {
      // Encrypt webhook secret before storing
      updates.stripe_webhook_secret = data.stripe_webhook_secret
        ? this.encrypt(data.stripe_webhook_secret)
        : null;
    }

    if (data.payment_enabled !== undefined) {
      updates.payment_enabled = data.payment_enabled;
    }

    if (data.accepted_payment_methods !== undefined) {
      updates.accepted_payment_methods = JSON.stringify(data.accepted_payment_methods);
    }

    if (Object.keys(updates).length === 0) {
      return this.getSettings(trx, tenantId);
    }

    const [row] = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .update(updates)
      .returning('*') as Record<string, unknown>[];
    return this.sanitizeSettings(row);
  }

  // Get decrypted Stripe secret key (for internal use, e.g. creating checkout sessions)
  async getStripeSecretKey(trx: Knex.Transaction, tenantId: number): Promise<string | null> {
    const row = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .select('stripe_secret_key')
      .first() as Record<string, unknown> | undefined;
    if (!row || !row.stripe_secret_key) return null;
    return this.decrypt(String(row.stripe_secret_key));
  }

  // Get decrypted Stripe webhook secret (for signature verification)
  async getStripeWebhookSecret(trx: Knex.Transaction, tenantId: number): Promise<string | null> {
    const row = await trx('tenant_settings')
      .where({ tenant_id: tenantId })
      .select('stripe_webhook_secret')
      .first() as Record<string, unknown> | undefined;
    if (!row || !row.stripe_webhook_secret) return null;
    return this.decrypt(String(row.stripe_webhook_secret));
  }
}
