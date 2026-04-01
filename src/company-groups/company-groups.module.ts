// Company Groups module — multi-company management, consolidated dashboard
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { CompanyGroupsController } from './company-groups.controller';
import { CompanyGroupsService } from './company-groups.service';
import { AuthModule } from '../auth';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CompanyGroupsController],
  providers: [CompanyGroupsService],
  exports: [CompanyGroupsService],
})
export class CompanyGroupsModule {}
