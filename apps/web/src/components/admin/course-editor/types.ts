import { DEFAULT_XP, type AdminStepDto, type AdminStepNode } from '@dacy/shared';

export type Selection =
  { kind: 'course' } | { kind: 'module'; id: string } | { kind: 'step'; id: string };

/** `?node=course|module:<id>|step:<id>` */
export function parseNode(raw?: string | null): Selection {
  if (raw?.startsWith('module:')) return { kind: 'module', id: raw.slice('module:'.length) };
  if (raw?.startsWith('step:')) return { kind: 'step', id: raw.slice('step:'.length) };
  return { kind: 'course' };
}
export function nodeParam(s: Selection): string {
  if (s.kind === 'module') return `module:${s.id}`;
  if (s.kind === 'step') return `step:${s.id}`;
  return 'course';
}

/** POST/PATCH /admin/modules cavabı (Prisma sətri) */
export interface ModuleRow {
  id: string;
  key: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
}

export function stepNodeOf(dto: AdminStepDto): AdminStepNode {
  return {
    id: dto.id,
    key: dto.key,
    type: dto.type,
    title: dto.definition.title,
    xp: dto.definition.xp ?? DEFAULT_XP[dto.type],
    order: dto.order,
    isPublished: dto.isPublished,
    hasProgress: dto.hasProgress,
  };
}
