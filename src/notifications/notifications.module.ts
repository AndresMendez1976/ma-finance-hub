// Notifications module — in-app notifications and email templates
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
