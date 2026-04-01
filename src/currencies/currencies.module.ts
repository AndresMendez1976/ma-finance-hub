// Currencies module — multi-currency support and exchange rates
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
