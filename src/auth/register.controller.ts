import { Controller, Post, Body, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator';
import { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { KNEX_CONNECTION } from '../database';
import { validatePasswordPolicy } from './password-policy';

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  company_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}

// Standard GAAP chart of accounts for new tenants
const GAAP_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1010', name: 'Petty Cash', type: 'asset' },
  { code: '1020', name: 'Checking Account', type: 'asset' },
  { code: '1050', name: 'Savings Account', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset' },
  { code: '1500', name: 'Furniture & Equipment', type: 'asset' },
  { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability' },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability' },
  { code: '2300', name: 'Short-term Debt', type: 'liability' },
  { code: '2500', name: 'Long-term Debt', type: 'liability' },
  { code: '3000', name: "Owner's Capital", type: 'equity' },
  { code: '3100', name: "Owner's Draws", type: 'equity' },
  { code: '3200', name: 'Retained Earnings', type: 'equity' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue' },
  { code: '4100', name: 'Service Revenue', type: 'revenue' },
  { code: '4200', name: 'Interest Income', type: 'revenue' },
  { code: '4300', name: 'Other Income', type: 'revenue' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5100', name: 'Direct Labor', type: 'expense' },
  { code: '5200', name: 'Direct Materials', type: 'expense' },
  { code: '6000', name: 'Rent Expense', type: 'expense' },
  { code: '6050', name: 'Utilities Expense', type: 'expense' },
  { code: '6100', name: 'Salaries & Wages', type: 'expense' },
  { code: '6200', name: 'Insurance Expense', type: 'expense' },
  { code: '6300', name: 'Office Supplies', type: 'expense' },
  { code: '6400', name: 'Marketing & Advertising', type: 'expense' },
  { code: '6500', name: 'Depreciation Expense', type: 'expense' },
  { code: '6600', name: 'Software & Technology', type: 'expense' },
  { code: '6700', name: 'Travel Expense', type: 'expense' },
  { code: '6800', name: 'Repairs & Maintenance', type: 'expense' },
  { code: '6900', name: 'Miscellaneous Expense', type: 'expense' },
  { code: '7000', name: 'Interest Expense', type: 'expense' },
  { code: '7100', name: 'Bank Fees', type: 'expense' },
  { code: '7300', name: 'Bad Debt Expense', type: 'expense' },
];

@ApiTags('Auth')
@Controller('auth')
export class RegisterController {
  private readonly privateKey: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly keyId: string;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    config: ConfigService,
  ) {
    const keyInline = config.get<string>('JWT_PRIVATE_KEY');
    const keyPath = config.get<string>('JWT_DEV_PRIVATE_KEY_PATH');
    if (keyInline) {
      this.privateKey = keyInline;
    } else if (keyPath) {
      this.privateKey = fs.readFileSync(path.resolve(process.cwd(), keyPath), 'utf-8');
    } else {
      throw new Error('JWT private key not configured');
    }
    this.issuer = 'ma-finance-hub-dev';
    this.audience = config.get<string>('JWT_AUDIENCE', 'ma-finance-hub');
    this.keyId = config.get<string>('JWT_DEV_KID', 'dev-key-001');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // Validate password policy
    const policyError = validatePasswordPolicy(dto.password, dto.email);
    if (policyError) throw new BadRequestException(policyError);

    // Check email uniqueness globally
    const existingUser = await this.db('users')
      .where({ email: dto.email.toLowerCase() })
      .first() as Record<string, unknown> | undefined;
    if (existingUser) throw new ConflictException('An account with this email already exists');

    return this.db.transaction(async (trx) => {
      // Create tenant
      const slug = dto.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60) + '-' + crypto.randomBytes(3).toString('hex');

      const [tenant] = await trx('tenants').insert({
        name: dto.company_name,
        slug,
        is_active: true,
      }).returning('*') as Record<string, unknown>[];

      const tenantId = tenant.id as number;

      // Create tenant_settings with trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await trx('tenant_settings').insert({
        tenant_id: tenantId,
        company_name: dto.company_name,
        company_email: dto.email.toLowerCase(),
        subscription_tier: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt,
        billing_email: dto.email.toLowerCase(),
      });

      // Assign starter tier
      const starterTier = await trx('tiers').where({ code: 'basic' }).first() as Record<string, unknown> | undefined;
      if (starterTier) {
        await trx('tenant_tiers').insert({
          tenant_id: tenantId,
          tier_id: starterTier.id,
          is_active: true,
          starts_at: new Date(),
        });
      }

      // Create user
      const externalSubject = crypto.randomUUID();
      const displayName = `${dto.first_name} ${dto.last_name}`;
      const passwordHash = await bcrypt.hash(dto.password, 12);

      const [user] = await trx('users').insert({
        external_subject: externalSubject,
        email: dto.email.toLowerCase(),
        display_name: displayName,
        password_hash: passwordHash,
        is_active: true,
        user_type: 'internal',
      }).returning('*') as Record<string, unknown>[];

      // Create membership
      await trx('tenant_memberships').insert({
        tenant_id: tenantId,
        user_id: user.id,
        role: 'owner',
        is_active: true,
      });

      // Seed GAAP chart of accounts
      const [chart] = await trx('chart_of_accounts').insert({
        tenant_id: tenantId,
        name: 'Standard GAAP',
        description: 'Standard US GAAP chart of accounts',
      }).returning('*') as Record<string, unknown>[];

      for (const acct of GAAP_ACCOUNTS) {
        await trx('accounts').insert({
          tenant_id: tenantId,
          chart_id: chart.id,
          account_code: acct.code,
          name: acct.name,
          account_type: acct.type,
          is_active: true,
        });
      }

      // Audit log
      await trx('audit_log').insert({
        tenant_id: tenantId,
        actor_subject: externalSubject,
        action: 'tenant_created',
        entity: 'tenants',
        entity_id: String(tenantId),
        metadata: JSON.stringify({ company_name: dto.company_name, email: dto.email }),
      });

      // Auto-login: generate JWT
      const token = jwt.sign(
        { sub: externalSubject, tenant_id: tenantId, roles: ['owner'] },
        this.privateKey,
        { algorithm: 'RS256', expiresIn: '8h', issuer: this.issuer, audience: this.audience, keyid: this.keyId, jwtid: crypto.randomUUID() },
      );

      return {
        token,
        tenant: { id: tenantId, name: dto.company_name, slug },
        user: { id: user.id, display_name: displayName, email: dto.email },
      };
    });
  }
}
