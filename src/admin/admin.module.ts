import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DatabaseModule } from '../database';
import { EntitlementsModule } from '../entitlements';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, DatabaseModule, EntitlementsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
