// Custom fields module — user-defined fields for any entity type
import { Module } from '@nestjs/common';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';

@Module({
  imports: [AuthModule, EntitlementsModule],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
