// Webhooks module — event-driven webhook management and delivery, Stripe webhook handling
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { WebhooksController } from './webhooks.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WebhooksService } from './webhooks.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { SettingsModule } from '../settings';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule, SettingsModule],
  controllers: [WebhooksController, StripeWebhookController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
