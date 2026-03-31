import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { RedisModule } from './common/redis.module';
import { RedisThrottlerStorage } from './common/redis-throttler-storage';
import { HealthModule } from './health';
import { AuthModule } from './auth';
import { ChartOfAccountsModule } from './chart-of-accounts';
import { AccountsModule } from './accounts';
import { JournalModule } from './journal';
import { AdminModule } from './admin';
import { EntitlementsModule } from './entitlements';
import { PostingRulesModule } from './posting-rules';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { TenantThrottlerGuard } from './common/tenant-throttler.guard';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HealthModule,
    AuthModule,
    ChartOfAccountsModule,
    AccountsModule,
    JournalModule,
    AdminModule,
    EntitlementsModule,
    PostingRulesModule,
  ],
  providers: [
    RedisThrottlerStorage,
    { provide: ThrottlerStorage, useExisting: RedisThrottlerStorage },
    { provide: APP_GUARD, useClass: TenantThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
