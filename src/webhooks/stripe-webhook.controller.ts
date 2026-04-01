// Stripe Webhook Controller — public endpoint, verifies HMAC signature
// Handles checkout.session.completed to mark invoices as paid
import { Controller, Post, Req, Res, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Knex } from 'knex';
import * as crypto from 'crypto';
import { KNEX_CONNECTION } from '../database';
import { SettingsService } from '../settings/settings.service';

@ApiTags('Stripe Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    private readonly settingsService: SettingsService,
  ) {}

  @Post()
  @ApiExcludeEndpoint()
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    // Read raw body for signature verification
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['stripe-signature'] as string | undefined;

    if (!signature) {
      this.logger.warn('Stripe webhook received without signature');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Record<string, unknown>;
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) as Record<string, unknown> : req.body as Record<string, unknown>;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const eventType = event.type as string;
    const dataObj = event.data as Record<string, unknown> | undefined;
    const session = dataObj?.object as Record<string, unknown> | undefined;

    if (!session || !session.metadata) {
      return res.status(200).json({ received: true, skipped: true });
    }

    const metadata = session.metadata as Record<string, string>;
    const tenantId = parseInt(metadata.tenant_id, 10);
    const invoiceId = parseInt(metadata.invoice_id, 10);

    if (!tenantId || !invoiceId) {
      this.logger.warn('Stripe webhook missing tenant_id or invoice_id in metadata');
      return res.status(200).json({ received: true, skipped: true });
    }

    // Verify signature using webhook secret for this tenant
    try {
      await this.db.transaction(async (trx) => {
        // Set tenant context for RLS
        await trx.raw("SELECT set_config('app.current_tenant_id', ?, true)", [String(tenantId)]);
        await trx.raw("SELECT set_config('app.current_subject', ?, true)", ['system']);

        const webhookSecret = await this.settingsService.getStripeWebhookSecret(trx, tenantId);
        if (webhookSecret) {
          const isValid = this.verifyStripeSignature(rawBody, signature, webhookSecret);
          if (!isValid) {
            this.logger.warn(`Invalid Stripe signature for tenant ${tenantId}`);
            throw new Error('Invalid signature');
          }
        }

        if (eventType === 'checkout.session.completed') {
          await this.handleCheckoutCompleted(trx, tenantId, invoiceId, session);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Invalid signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      this.logger.error(`Error processing Stripe webhook: ${msg}`);
      return res.status(500).json({ error: 'Internal error' });
    }

    return res.status(200).json({ received: true });
  }

  private verifyStripeSignature(payload: string, header: string, secret: string): boolean {
    // Parse Stripe signature header: t=timestamp,v1=signature
    const parts = header.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = timestampPart.replace('t=', '');
    const expectedSignature = signaturePart.replace('v1=', '');

    // Compute HMAC
    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  private async handleCheckoutCompleted(
    trx: Knex.Transaction,
    tenantId: number,
    invoiceId: number,
    session: Record<string, unknown>,
  ): Promise<void> {
    const invoice = await trx('invoices').where({ id: invoiceId }).first() as Record<string, unknown> | undefined;
    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for tenant ${tenantId}`);
      return;
    }

    if (invoice.status === 'paid' || invoice.status === 'voided') {
      this.logger.log(`Invoice ${invoiceId} already ${String(invoice.status)}, skipping`);
      return;
    }

    const paymentIntentId = session.payment_intent as string | undefined;
    const amountTotal = session.amount_total as number | undefined;
    const paidAmount = amountTotal ? amountTotal / 100 : Number(invoice.total);

    await trx('invoices').where({ id: invoiceId }).update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      paid_amount: paidAmount,
      stripe_payment_intent_id: paymentIntentId || null,
    });

    // Log in audit
    await trx('audit_log').insert({
      tenant_id: tenantId,
      actor_subject: 'stripe-webhook',
      action: 'stripe_payment_completed',
      entity: 'invoices',
      entity_id: String(invoiceId),
      metadata: JSON.stringify({
        session_id: session.id,
        payment_intent: paymentIntentId,
        amount: paidAmount,
      }),
    });

    this.logger.log(`Invoice ${invoiceId} marked as paid via Stripe (tenant ${tenantId})`);
  }
}
