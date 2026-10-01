import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Http');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: { code: string; message: string; details?: unknown } = {
      code: 'INTERNAL',
      message: 'Daxili xəta',
    };
    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      body = { code: 'RATE_LIMITED', message: 'Çox cəhd etdiniz' };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'object' && r && 'code' in r) {
        body = r as typeof body;
      } else {
        const msg =
          typeof r === 'string'
            ? r
            : ((r as { message?: string | string[] }).message ?? exception.message);
        const codeByStatus: Record<number, string> = {
          400: 'VALIDATION_FAILED',
          401: 'AUTH_REQUIRED',
          403: 'AUTH_FORBIDDEN',
          404: 'NOT_FOUND',
          413: 'FILE_TOO_LARGE',
          429: 'RATE_LIMITED',
        };
        body = {
          code: codeByStatus[status] ?? 'HTTP_ERROR',
          message: Array.isArray(msg) ? msg.join(', ') : String(msg),
        };
      }
    } else {
      this.log.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(status).json({ ...body, statusCode: status });
  }
}
