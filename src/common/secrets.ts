import { Logger } from '@nestjs/common';

const logger = new Logger('Secrets');

/**
 * Secret provider interface. Implement for Vault, AWS Secrets Manager, etc.
 * Default: EnvSecretProvider (reads process.env).
 *
 * To integrate AWS Secrets Manager:
 *   import { setSecretProvider } from './secrets';
 *   setSecretProvider(new AwsSecretsProvider({ region: 'us-east-1', secretId: 'mfh/prod' }));
 *
 * Call setSecretProvider() before NestFactory.create() in main.ts.
 */
export interface SecretProvider {
  get(key: string): Promise<string | undefined>;
}

class EnvSecretProvider implements SecretProvider {
  async get(key: string): Promise<string | undefined> {
    return process.env[key];
  }
}

let provider: SecretProvider = new EnvSecretProvider();

export function setSecretProvider(p: SecretProvider): void {
  provider = p;
  logger.log(`Secret provider: ${p.constructor.name}`);
}

export async function getSecret(key: string): Promise<string | undefined> {
  return provider.get(key);
}

export async function getRequiredSecret(key: string): Promise<string> {
  const value = await provider.get(key);
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(`Required secret '${key}' missing — fail closed`);
      throw new Error(`Required secret '${key}' is not configured`);
    }
    logger.warn(`Secret '${key}' not set (non-production)`);
    return '';
  }
  return value;
}

export function getSecretSync(key: string): string | undefined {
  return process.env[key];
}
