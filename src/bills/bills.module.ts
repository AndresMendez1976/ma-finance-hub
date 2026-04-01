// Bills module — vendor bill lifecycle (create, receive, approve, pay, void, AP aging)
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
