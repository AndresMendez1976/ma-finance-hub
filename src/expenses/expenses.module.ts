// Expenses module — expense tracking with approval workflow
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
