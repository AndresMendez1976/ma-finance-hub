import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly isProd = process.env.NODE_ENV === 'production';

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;
    const requestId = req.headers['x-request-id'] as string;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      if (this.isProd) {
        // Structured JSON for log aggregation
        this.logger[level](JSON.stringify({
          requestId,
          method,
          path: originalUrl,
          statusCode,
          durationMs: duration,
          userAgent: req.headers['user-agent']?.substring(0, 200),
        }));
      } else {
        this.logger[level](`${method} ${originalUrl} ${statusCode} ${duration}ms [${requestId}]`);
      }
    });

    next();
  }
}
