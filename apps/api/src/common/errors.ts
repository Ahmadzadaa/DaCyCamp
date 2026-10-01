import { HttpException, HttpStatus } from '@nestjs/common';

/** Sabit kodlu xəta — web tərəfi kodu lüğətdəki mətnə çevirir */
export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus,
    message?: string,
    public readonly details?: unknown,
  ) {
    super({ code, message: message ?? code, details }, status);
  }
}
export const notFound = (code = 'NOT_FOUND', message = 'Tapılmadı') =>
  new ApiException(code, HttpStatus.NOT_FOUND, message);
export const forbidden = (code = 'AUTH_FORBIDDEN', message = 'İcazə yoxdur') =>
  new ApiException(code, HttpStatus.FORBIDDEN, message);
export const conflict = (code: string, message?: string, details?: unknown) =>
  new ApiException(code, HttpStatus.CONFLICT, message, details);
export const badRequest = (code: string, message?: string, details?: unknown) =>
  new ApiException(code, HttpStatus.BAD_REQUEST, message, details);
export const unprocessable = (code: string, message?: string, details?: unknown) =>
  new ApiException(code, HttpStatus.UNPROCESSABLE_ENTITY, message, details);
export const unauthorized = (code = 'AUTH_REQUIRED', message = 'Daxil olmaq lazımdır') =>
  new ApiException(code, HttpStatus.UNAUTHORIZED, message);
