import type { Prisma } from '@prisma/client';
import { badRequest } from '../errors';

type Delegate = 'track' | 'course' | 'module' | 'step' | 'ctfTask' | 'pathItem';

/**
 * İki fazalı sıralama: @@unique([parent, order]) pozulmasın deyə əvvəl mənfi, sonra müsbət yazılır.
 * ids — valideynin BÜTÜN uşaqlarını yeni sırada əhatə etməlidir.
 */
export async function reorderInTx(
  tx: Prisma.TransactionClient,
  delegate: Delegate,
  where: Record<string, unknown>,
  ids: string[],
): Promise<void> {
  const model = tx[delegate] as unknown as {
    findMany: (a: unknown) => Promise<Array<{ id: string }>>;
    update: (a: unknown) => Promise<unknown>;
  };
  const existing = await model.findMany({ where, select: { id: true } });
  const existingIds = new Set(existing.map((e) => e.id));
  if (
    existing.length !== ids.length ||
    ids.some((id) => !existingIds.has(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw badRequest('ORDER_CONFLICT', 'Sıra siyahısı bütün elementləri əhatə etməlidir');
  }
  for (let i = 0; i < ids.length; i++)
    await model.update({ where: { id: ids[i] }, data: { order: -(i + 1) } });
  for (let i = 0; i < ids.length; i++)
    await model.update({ where: { id: ids[i] }, data: { order: i + 1 } });
}

/** Valideyn daxilində növbəti boş sıra */
export async function nextOrder(
  tx: Prisma.TransactionClient | { [k: string]: unknown },
  delegate: Delegate,
  where: Record<string, unknown>,
): Promise<number> {
  const model = (tx as Record<string, unknown>)[delegate] as {
    aggregate: (a: unknown) => Promise<{ _max: { order: number | null } }>;
  };
  const r = await model.aggregate({ where, _max: { order: true } });
  return (r._max.order ?? 0) + 1;
}
