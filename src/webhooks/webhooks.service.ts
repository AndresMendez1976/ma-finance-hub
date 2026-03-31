// Webhooks service — CRUD webhooks, fire events with HMAC-SHA256 signature
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // Create a webhook
  async create(trx: Knex.Transaction, tenantId: number, data: {
    url: string; events: string[]; secret?: string; description?: string;
  }) {
    // Generate a secret if not provided
    const secret = data.secret ?? crypto.randomBytes(32).toString('hex');

    const [webhook] = await trx('webhooks').insert({
      tenant_id: tenantId,
      url: data.url,
      events: JSON.stringify(data.events),
      secret,
      description: data.description ?? null,
      is_active: true,
    }).returning('*') as Record<string, unknown>[];

    return {
      ...webhook,
      events: typeof webhook.events === 'string' ? JSON.parse(webhook.events) as unknown : webhook.events,
    };
  }

  // List webhooks
  async findAll(trx: Knex.Transaction) {
    const rows = await trx('webhooks')
      .select('id', 'url', 'events', 'description', 'is_active', 'last_triggered_at', 'created_at')
      .orderBy('created_at', 'desc') as Record<string, unknown>[];

    return rows.map((r) => ({
      ...r,
      events: typeof r.events === 'string' ? JSON.parse(r.events) as unknown : r.events,
    }));
  }

  // Get single webhook
  async findOne(trx: Knex.Transaction, id: number) {
    const webhook = await trx('webhooks').where({ id }).first() as Record<string, unknown> | undefined;
    if (!webhook) return null;

    return {
      ...webhook,
      events: typeof webhook.events === 'string' ? JSON.parse(webhook.events) as unknown : webhook.events,
    };
  }

  // Update a webhook
  async update(trx: Knex.Transaction, id: number, data: {
    url?: string; events?: string[]; description?: string; is_active?: boolean;
  }) {
    const existing = await trx('webhooks').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Webhook not found');

    const updates: Record<string, unknown> = {};
    if (data.url !== undefined) updates.url = data.url;
    if (data.events !== undefined) updates.events = JSON.stringify(data.events);
    if (data.description !== undefined) updates.description = data.description;
    if (data.is_active !== undefined) updates.is_active = data.is_active;

    if (Object.keys(updates).length > 0) {
      await trx('webhooks').where({ id }).update(updates);
    }

    return this.findOne(trx, id);
  }

  // Delete a webhook
  async delete(trx: Knex.Transaction, id: number) {
    const existing = await trx('webhooks').where({ id }).first() as Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundException('Webhook not found');

    await trx('webhooks').where({ id }).delete();
    return { deleted: true, id };
  }

  // Fire an event to all matching webhooks
  async fireEvent(trx: Knex.Transaction, tenantId: number, event: string, payload: Record<string, unknown>) {
    const webhooks = await trx('webhooks')
      .where({ tenant_id: tenantId, is_active: true }) as Record<string, unknown>[];

    const matchingWebhooks = webhooks.filter((w) => {
      const events = typeof w.events === 'string' ? JSON.parse(w.events) as unknown[] : w.events;
      return Array.isArray(events) && (events.includes(event) || events.includes('*'));
    });

    const results: { webhook_id: number; url: string; success: boolean; status?: number; error?: string }[] = [];

    for (const webhook of matchingWebhooks) {
      const url = String(webhook.url);
      const secret = String(webhook.secret);

      const body = JSON.stringify({
        event,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      // Create HMAC-SHA256 signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        results.push({
          webhook_id: Number(webhook.id),
          url,
          success: response.ok,
          status: response.status,
        });

        // Update last_triggered_at
        await trx('webhooks').where({ id: webhook.id }).update({ last_triggered_at: new Date() });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Webhook delivery failed for ${url}: ${errorMessage}`);
        results.push({
          webhook_id: Number(webhook.id),
          url,
          success: false,
          error: errorMessage,
        });
      }
    }

    return { event, webhooks_triggered: results.length, results };
  }
}
