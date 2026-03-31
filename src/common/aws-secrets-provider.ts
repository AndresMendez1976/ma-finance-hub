import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '@nestjs/common';
import { SecretProvider } from './secrets';

/**
 * AWS Secrets Manager provider.
 * Expects a single JSON secret containing key-value pairs.
 * Caches the fetched secret in memory to avoid repeated API calls.
 *
 * Usage in main.ts (before NestFactory.create):
 *   const provider = new AwsSecretsProvider({ region: 'us-east-1', secretId: 'mfh/prod' });
 *   await provider.load();
 *   setSecretProvider(provider);
 */
export class AwsSecretsProvider implements SecretProvider {
  private readonly logger = new Logger(AwsSecretsProvider.name);
  private readonly client: SecretsManagerClient;
  private readonly secretId: string;
  private cache: Record<string, string> = {};
  private loaded = false;

  constructor(opts: { region: string; secretId: string }) {
    this.client = new SecretsManagerClient({ region: opts.region });
    this.secretId = opts.secretId;
  }

  async load(): Promise<void> {
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({ SecretId: this.secretId }),
      );
      if (!response.SecretString) {
        throw new Error(`Secret ${this.secretId} has no string value`);
      }
      this.cache = JSON.parse(response.SecretString) as Record<string, string>;
      this.loaded = true;
      this.logger.log(`Loaded ${Object.keys(this.cache).length} secrets from AWS Secrets Manager`);
    } catch (err) {
      this.logger.error(`Failed to load secrets from AWS: ${String(err)}`);
      throw err;
    }
  }

  get(key: string): Promise<string | undefined> {
    if (!this.loaded) {
      this.logger.error('AwsSecretsProvider not loaded — call load() first');
      return Promise.resolve(undefined);
    }
    // AWS secret value takes precedence, fall back to env
    return Promise.resolve(this.cache[key] ?? process.env[key]);
  }
}
