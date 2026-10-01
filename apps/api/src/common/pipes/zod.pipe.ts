import { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { zodIssues } from '@dacy/shared';
import { badRequest } from '../errors';

/** @Body(new ZodPipe(schema)) — şəma @dacy/shared-dən gəlir, web ilə eynidir */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success)
      throw badRequest(
        'VALIDATION_FAILED',
        'Daxil edilən məlumatlar düzgün deyil',
        zodIssues(r.error),
      );
    return r.data;
  }
}
