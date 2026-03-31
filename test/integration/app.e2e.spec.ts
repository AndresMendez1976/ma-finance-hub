import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/common/http-exception.filter';

describe('MA Finance Hub E2E', () => {
  let app: INestApplication;
  let tenantAId: number;
  let tenantBId: number;
  let userAId: number;
  let userBId: number;
  let tokenA: string;
  let tokenB: string;
  let tokenNoMembership: string;

  const privateKey = fs.readFileSync(path.resolve(process.cwd(), './keys/dev-private.pem'), 'utf-8');

  function makeToken(sub: string, tenantId: number | string, issuer = 'ma-finance-hub-dev') {
    return jwt.sign({ sub, tenant_id: Number(tenantId), roles: ['user'] }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
      issuer,
      audience: 'ma-finance-hub',
    });
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    await app.init();


    // Use raw connection to bypass RLS for test setup
    const migrationDb = require('knex')({
      client: 'pg',
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'ma_finance_hub',
        user: 'migration_user',
        password: 'migration_password_dev',
      },
    });

    try {
      [{ id: tenantAId }] = await migrationDb('tenants').insert({ name: 'E2E-A', slug: `e2e-a-${Date.now()}` }).returning('id');
      [{ id: tenantBId }] = await migrationDb('tenants').insert({ name: 'E2E-B', slug: `e2e-b-${Date.now()}` }).returning('id');

      const subA = `e2e-user-a-${Date.now()}`;
      const subB = `e2e-user-b-${Date.now()}`;
      const subNoMembership = `e2e-no-member-${Date.now()}`;

      [{ id: userAId }] = await migrationDb('users').insert({ external_subject: subA, display_name: 'E2E User A' }).returning('id');
      [{ id: userBId }] = await migrationDb('users').insert({ external_subject: subB, display_name: 'E2E User B' }).returning('id');
      await migrationDb('users').insert({ external_subject: subNoMembership, display_name: 'E2E No Member' });

      await migrationDb('tenant_memberships').insert({ tenant_id: tenantAId, user_id: userAId, role: 'owner' });
      await migrationDb('tenant_memberships').insert({ tenant_id: tenantBId, user_id: userBId, role: 'admin' });

      // Assign Pro tier (id=3) to both test tenants so entitlement guards pass
      await migrationDb('tenant_tiers').insert({ tenant_id: tenantAId, tier_id: 3, is_active: true });
      await migrationDb('tenant_tiers').insert({ tenant_id: tenantBId, tier_id: 3, is_active: true });

      await migrationDb('fiscal_periods').insert({ tenant_id: tenantAId, fiscal_year: 2099, fiscal_month: 1, status: 'open', opened_at: new Date() });
      await migrationDb('fiscal_periods').insert({ tenant_id: tenantAId, fiscal_year: 2099, fiscal_month: 2, status: 'closed' });
      await migrationDb('fiscal_periods').insert({ tenant_id: tenantBId, fiscal_year: 2099, fiscal_month: 1, status: 'open', opened_at: new Date() });

      tokenA = makeToken(subA, tenantAId);
      tokenB = makeToken(subB, tenantBId);
      tokenNoMembership = makeToken(subNoMembership, tenantAId);
    } finally {
      await migrationDb.destroy();
    }
  });

  afterAll(async () => {
    const migrationDb = require('knex')({
      client: 'pg',
      connection: { host: 'localhost', port: 5432, database: 'ma_finance_hub', user: 'migration_user', password: 'migration_password_dev' },
    });
    try {
      await migrationDb('journal_lines').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('journal_entries').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('accounts').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('chart_of_accounts').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('active_sessions').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('tenant_memberships').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('tenant_tiers').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('fiscal_periods').whereIn('tenant_id', [tenantAId, tenantBId]).del();
      await migrationDb('users').whereIn('id', [userAId, userBId]).del();
      await migrationDb.raw(`DELETE FROM users WHERE external_subject LIKE 'e2e-%'`);
      await migrationDb('tenants').whereIn('id', [tenantAId, tenantBId]).del();
    } finally {
      await migrationDb.destroy();
    }
    await app.close();
  });

  describe('Health', () => {
    it('GET /health returns ok', () =>
      request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' }));

    it('GET /ready returns ok with db', () =>
      request(app.getHttpServer()).get('/ready').expect(200).then((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('connected');
      }));
  });

  describe('Auth', () => {
    it('401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/auth/context').expect(401));

    it('401 with bad issuer', () => {
      const badToken = makeToken('x', tenantAId, 'evil');
      return request(app.getHttpServer()).get('/api/v1/auth/context').set('Authorization', `Bearer ${badToken}`).expect(401);
    });

    it('rejects user with no membership', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/context').set('Authorization', `Bearer ${tokenNoMembership}`);
      expect([401, 403]).toContain(res.status);
    });

    it('200 with valid token', () =>
      request(app.getHttpServer()).get('/api/v1/auth/context').set('Authorization', `Bearer ${tokenA}`).expect(200).then((res) => {
        expect(res.body.user).toBeDefined();
        expect(res.body.membership.role).toBe('owner');
      }));
  });

  describe('RBAC', () => {
    it('owner can access rbac/owner', () =>
      request(app.getHttpServer()).get('/api/v1/auth/rbac/owner').set('Authorization', `Bearer ${tokenA}`).expect(200));

    it('admin cannot access rbac/owner', () =>
      request(app.getHttpServer()).get('/api/v1/auth/rbac/owner').set('Authorization', `Bearer ${tokenB}`).expect(403));
  });

  describe('RLS Isolation', () => {
    let chartAId: number;
    let cashId: number;
    let revId: number;

    it('tenant A creates chart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chart-of-accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'E2E Chart' })
        .expect(201);
      chartAId = Number(res.body.id);
    });

    it('tenant B cannot see tenant A chart', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/chart-of-accounts')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(res.body.find((c: { id: string }) => Number(c.id) === chartAId)).toBeUndefined();
    });

    it('tenant A creates accounts', async () => {
      const r1 = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ chart_id: chartAId, account_code: 'E1100', name: 'Cash', account_type: 'asset' })
        .expect(201);
      cashId = Number(r1.body.id);

      const r2 = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ chart_id: chartAId, account_code: 'E4100', name: 'Revenue', account_type: 'revenue' })
        .expect(201);
      revId = Number(r2.body.id);
    });

    it('balanced journal entry succeeds', async () => {
      // Get fiscal period ID from DB
      const migrationDb = require('knex')({
        client: 'pg',
        connection: { host: 'localhost', port: 5432, database: 'ma_finance_hub', user: 'migration_user', password: 'migration_password_dev' },
      });
      const fp = await migrationDb('fiscal_periods').where({ tenant_id: tenantAId, status: 'open' }).first();
      await migrationDb.destroy();

      const res = await request(app.getHttpServer())
        .post('/api/v1/journal-entries')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          fiscal_period_id: Number(fp.id),
          lines: [
            { account_id: cashId, debit: 1000, credit: 0 },
            { account_id: revId, debit: 0, credit: 1000 },
          ],
        })
        .expect(201);
      expect(res.body.lines).toHaveLength(2);
    });

    it('unbalanced journal entry rejected', async () => {
      const migrationDb = require('knex')({
        client: 'pg',
        connection: { host: 'localhost', port: 5432, database: 'ma_finance_hub', user: 'migration_user', password: 'migration_password_dev' },
      });
      const fp = await migrationDb('fiscal_periods').where({ tenant_id: tenantAId, status: 'open' }).first();
      await migrationDb.destroy();

      await request(app.getHttpServer())
        .post('/api/v1/journal-entries')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          fiscal_period_id: Number(fp.id),
          lines: [
            { account_id: cashId, debit: 500, credit: 0 },
            { account_id: revId, debit: 0, credit: 100 },
          ],
        })
        .expect(400);
    });

    it('journal in closed period rejected', async () => {
      const migrationDb = require('knex')({
        client: 'pg',
        connection: { host: 'localhost', port: 5432, database: 'ma_finance_hub', user: 'migration_user', password: 'migration_password_dev' },
      });
      const fp = await migrationDb('fiscal_periods').where({ tenant_id: tenantAId, status: 'closed' }).first();
      await migrationDb.destroy();

      await request(app.getHttpServer())
        .post('/api/v1/journal-entries')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          fiscal_period_id: Number(fp.id),
          lines: [
            { account_id: cashId, debit: 1, credit: 0 },
            { account_id: revId, debit: 0, credit: 1 },
          ],
        })
        .expect(400);
    });
  });

  describe('DTO Validation', () => {
    it('rejects empty chart name', () =>
      request(app.getHttpServer())
        .post('/api/v1/chart-of-accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: '' })
        .expect(400));

    it('rejects extra fields', () =>
      request(app.getHttpServer())
        .post('/api/v1/chart-of-accounts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'OK', hacked: true })
        .expect(400));
  });
});
