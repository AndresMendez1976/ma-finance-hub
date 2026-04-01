// Contacts module — unified customer/vendor directory
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [DatabaseModule, AuthModule, EntitlementsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
