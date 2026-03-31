import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(compression());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS: closed by default, configurable via CORS_ORIGINS
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true,
      maxAge: 3600,
    });
    logger.log(`CORS enabled for: ${corsOrigins}`);
  }

  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'ready'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Swagger: disabled in production by default
  if (config.get<string>('SWAGGER_ENABLED') === 'true' && config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MA Finance Hub')
      .setDescription('Finance SaaS / Standalone Platform API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

void bootstrap();
