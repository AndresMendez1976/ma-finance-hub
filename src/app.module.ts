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
import { ReportsModule } from './reports';
import { InvoicesModule } from './invoices';
import { ExpensesModule } from './expenses';
import { SettingsModule } from './settings';
import { BankingModule } from './banking';
import { ContactsModule } from './contacts';
import { PurchaseOrdersModule } from './purchase-orders';
import { CreditNotesModule } from './credit-notes';
import { BillsModule } from './bills';
import { InventoryModule } from './inventory';
import { ManufacturingModule } from './manufacturing';
import { PayrollModule } from './payroll';
import { FixedAssetsModule } from './fixed-assets';
import { CurrenciesModule } from './currencies';
import { TaxModule } from './tax';
import { BudgetsModule } from './budgets';
import { CrmModule } from './crm';
import { ApiKeysModule } from './api-keys';
import { WebhooksModule } from './webhooks';
import { NotificationsModule } from './notifications';
import { DataExportModule } from './data-export';
import { RecurringInvoicesModule } from './recurring-invoices';
import { EstimatesModule } from './estimates';
import { ProjectsModule } from './projects';
import { TrackingModule } from './tracking';
import { BankRulesModule } from './bank-rules';
import { ClientPortalModule } from './client-portal';
import { CustomFieldsModule } from './custom-fields';
import { InvitationsModule } from './invitations';
import { JobCostingModule } from './job-costing';
import { EquipmentModule } from './equipment';
import { MileageModule } from './mileage';
import { CompanyGroupsModule } from './company-groups';
import { DocumentTemplatesModule } from './document-templates';
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
    ReportsModule,
    InvoicesModule,
    ExpensesModule,
    SettingsModule,
    BankingModule,
    ContactsModule,
    PurchaseOrdersModule,
    CreditNotesModule,
    BillsModule,
    InventoryModule,
    ManufacturingModule,
    PayrollModule,
    FixedAssetsModule,
    CurrenciesModule,
    TaxModule,
    BudgetsModule,
    CrmModule,
    ApiKeysModule,
    WebhooksModule,
    NotificationsModule,
    DataExportModule,
    RecurringInvoicesModule,
    EstimatesModule,
    ProjectsModule,
    TrackingModule,
    BankRulesModule,
    ClientPortalModule,
    CustomFieldsModule,
    InvitationsModule,
    JobCostingModule,
    EquipmentModule,
    MileageModule,
    CompanyGroupsModule,
    DocumentTemplatesModule,
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
