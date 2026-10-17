import type { Prisma } from '@prisma/client';

/**
 * Domen hadisələri. Domen dəyişikliyi ilə EYNİ tranzaksiyada outbox-a yazılır (tranzaksion outbox):
 * tranzaksiya geri qayıtsa hadisə də yoxdur; bildiriş çatdırılmasa akademik qeyd yenə qalır.
 */
export type AcademyEvent =
  | { type: 'ENROLLMENT_CREATED'; enrollmentId: string }
  | { type: 'ASSIGNMENT_PUBLISHED'; assignmentId: string }
  | { type: 'ASSIGNMENT_UPDATED'; assignmentId: string; version: number; changes: string[] }
  | { type: 'DEADLINE_EXTENDED'; extensionId: string; extendedDueAt: string }
  | { type: 'SUBMISSION_RECEIVED'; attemptId: string }
  | { type: 'SUBMISSION_RETURNED'; gradeId: string; version: number }
  | { type: 'GRADE_RELEASED'; gradeId: string; version: number }
  | { type: 'CLASS_RESCHEDULED'; sessionId: string; startsAt: string }
  | { type: 'CLASS_CANCELLED'; sessionId: string };

export async function emitAcademyEvent(tx: Prisma.TransactionClient, e: AcademyEvent) {
  await tx.academyOutboxEvent.create({
    data: { type: e.type, payload: e as unknown as Prisma.InputJsonValue },
  });
}
