// pnpm --filter @dacy/api recompute-progress — bütün keşləri StepProgress/XpEvent-dən yenidən hesablayır
import '../config/env';
import { PrismaClient } from '@prisma/client';
import { computeCourseMap, type StepType } from '@dacy/shared';

async function main() {
  const prisma = new PrismaClient();
  const enrollments = await prisma.enrollment.findMany();
  for (const e of enrollments) {
    const c = await prisma.course.findUnique({
      where: { id: e.courseId },
      include: { modules: { include: { steps: true } } },
    });
    if (!c) continue;
    const progress = await prisma.stepProgress.findMany({
      where: { userId: e.userId, step: { module: { courseId: c.id } } },
      select: { stepId: true, status: true },
    });
    const map = computeCourseMap({
      sequential: c.sequential,
      modules: c.modules.map((m) => ({
        ...m,
        steps: m.steps.map((s) => ({ ...s, type: s.type as StepType })),
      })),
      progress,
    });
    await prisma.enrollment.update({
      where: { id: e.id },
      data: {
        percent: map.percent,
        ...(map.isComplete && !e.completedAt ? { completedAt: new Date() } : {}),
      },
    });
  }
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    const sum = await prisma.xpEvent.aggregate({ where: { userId: u.id }, _sum: { amount: true } });
    await prisma.user.update({ where: { id: u.id }, data: { xpTotal: sum._sum.amount ?? 0 } });
  }
  console.log(`✓ ${enrollments.length} yazılma, ${users.length} istifadəçi yenidən hesablandı`);
  await prisma.$disconnect();
}
void main();
