import { SecretProvider, setSecretProvider, getSecret, getRequiredSecret } from '@/common/secrets';

/**
 * Tests the SecretProvider contract and fail-closed behavior.
 * Uses a mock provider that simulates AWS Secrets Manager behavior
 * (JSON blob loaded into memory, key-value lookup).
 */
class MockAwsProvider implements SecretProvider {
  private cache: Record<string, string> = {};
  private loaded = false;

  load(secretJson: Record<string, string>): Promise<void> {
    this.cache = { ...secretJson };
    this.loaded = true;
    return Promise.resolve();
  }

  get(key: string): Promise<string | undefined> {
    if (!this.loaded) return Promise.resolve(undefined); // fail closed
    return Promise.resolve(this.cache[key] ?? process.env[key]);
  }
}

describe('Secret Provider', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    // Reset to env provider
    setSecretProvider({ get: (k) => Promise.resolve(process.env[k]) });
  });

  it('reads from mock AWS provider after load', async () => {
    const provider = new MockAwsProvider();
    await provider.load({
      JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
      INTERNAL_OPS_SECRET: 'hmac-secret-from-aws',
      DB_PASSWORD: 'aws-db-password',
    });
    setSecretProvider(provider);

    expect(await getSecret('JWT_PUBLIC_KEY')).toContain('BEGIN PUBLIC KEY');
    expect(await getSecret('INTERNAL_OPS_SECRET')).toBe('hmac-secret-from-aws');
    expect(await getSecret('DB_PASSWORD')).toBe('aws-db-password');
  });

  it('returns undefined for unloaded provider (fail closed)', async () => {
    const provider = new MockAwsProvider();
    // NOT calling load()
    setSecretProvider(provider);

    expect(await getSecret('JWT_PUBLIC_KEY')).toBeUndefined();
  });

  it('falls back to env when key not in AWS secret', async () => {
    process.env.FALLBACK_KEY = 'from-env';
    const provider = new MockAwsProvider();
    await provider.load({ OTHER_KEY: 'from-aws' });
    setSecretProvider(provider);

    expect(await getSecret('FALLBACK_KEY')).toBe('from-env');
    expect(await getSecret('OTHER_KEY')).toBe('from-aws');
    delete process.env.FALLBACK_KEY;
  });

  it('getRequiredSecret throws in production if missing', async () => {
    process.env.NODE_ENV = 'production';
    const provider = new MockAwsProvider();
    await provider.load({}); // loaded but empty
    setSecretProvider(provider);

    await expect(getRequiredSecret('MISSING_KEY')).rejects.toThrow(
      "Required secret 'MISSING_KEY' is not configured",
    );
  });

  it('getRequiredSecret returns empty string in non-production if missing', async () => {
    process.env.NODE_ENV = 'development';
    const provider = new MockAwsProvider();
    await provider.load({});
    setSecretProvider(provider);

    const result = await getRequiredSecret('MISSING_KEY');
    expect(result).toBe('');
  });

  it('AWS provider returns value from secret over env', async () => {
    process.env.DB_PASSWORD = 'env-password';
    const provider = new MockAwsProvider();
    await provider.load({ DB_PASSWORD: 'aws-password' });
    setSecretProvider(provider);

    expect(await getSecret('DB_PASSWORD')).toBe('aws-password');
    delete process.env.DB_PASSWORD;
  });
});
