// API Keys module — tenant-scoped API key management
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { AuthModule } from '../auth';
import { EntitlementsModule } from '../entitlements';
import { DatabaseModule } from '../database';

@Module({
  imports: [AuthModule, EntitlementsModule, DatabaseModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
