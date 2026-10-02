import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { from, mergeMap, type Observable } from 'rxjs';
import type { AuthUser } from '../common/decorators';
import { AuditService, type AuditEntity } from './audit.service';

export interface AuditMeta {
  action: string;
  entity: AuditEntity;
  /** obyektin id-si: marşrut parametri (defolt "id") və ya cavabdakı `id` (yaradılma) */
  target?: { param: string } | 'result';
  /** jurnala düşəcək body sahələri (gizli məlumatlar heç vaxt) */
  body?: string[];
  /** jurnala düşəcək cavab sahələri (məs. tələbənin e-poçtu) */
  result?: string[];
}
export const AUDIT_KEY = 'dacy:audit';
/** Uğurlu əməliyyatdan sonra AuditLog sətri yazır (başlıq əməliyyatdan ƏVVƏL oxunur — silmə üçün) */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const param = meta.target === 'result' ? null : (meta.target?.param ?? 'id');
    const params = req.params as Record<string, string>;
    const paramId = param ? params[param] : undefined;
    const before = paramId ? await this.audit.describe(meta.entity, paramId) : null;
    return next.handle().pipe(
      mergeMap((result) =>
        from(
          (async () => {
            const res = (result ?? {}) as Record<string, unknown>;
            const entityId = paramId ?? (typeof res.id === 'string' ? res.id : null);
            const info =
              before ?? (entityId ? await this.audit.describe(meta.entity, entityId) : null);
            const details: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(params)) if (k !== param) details[k] = v;
            const body = (req.body ?? {}) as Record<string, unknown>;
            for (const k of meta.body ?? []) if (k in body) details[k] = body[k];
            for (const k of meta.result ?? []) if (res[k] !== undefined) details[k] = res[k];
            if (req.query?.force) details.force = true;
            await this.audit.record(req.user ?? null, {
              action: meta.action,
              entityType: meta.entity,
              entityId,
              entityTitle: info?.title ?? (typeof res.title === 'string' ? res.title : null),
              courseId: info?.courseId ?? null,
              details: Object.keys(details).length ? details : null,
            });
            return result;
          })(),
        ),
      ),
    );
  }
}
