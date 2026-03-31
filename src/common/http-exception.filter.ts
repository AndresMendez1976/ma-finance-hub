import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string) || message;
        if (Array.isArray(obj.message)) {
          details = obj.message as string[];
          message = 'Validation failed';
        }
      }
      code = this.statusToCode(status);
      // Log security events
      if (status === 401 || status === 403) {
        this.logger.warn(`Security event: ${code} ${message} [${requestId}] ${request.method} ${request.originalUrl}`);
      }
    } else {
      this.logger.error(`Unhandled exception [${requestId}]: ${String(exception)}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      requestId,
      statusCode: status,
      code,
      message,
      ...(details ? { details } : {}),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'ERROR';
  }
}
