import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import * as path from 'path';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(
        process.cwd(),
        process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development',
      ),
      validationSchema: Joi.object({
        // App
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        API_PREFIX: Joi.string().default('api/v1'),

        // Database (app runtime)
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_SSL: Joi.string().valid('true', 'false').default('false'),

        // Database (migrations)
        DB_MIGRATION_USER: Joi.string().required(),
        DB_MIGRATION_PASSWORD: Joi.string().required(),

        // Swagger
        SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),

        // Logging
        LOG_LEVEL: Joi.string()
          .valid('debug', 'info', 'warn', 'error')
          .default('info'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class AppConfigModule {}
