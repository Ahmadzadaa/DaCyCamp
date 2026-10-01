import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Learning Path — Mərhələ 4. İndilik yalnız hook: kurs bitəndə çağırılır.
 * Mərhələ 4-də bu kursu ehtiva edən hər yol üçün PathEnrollment yenidən hesablanacaq.
 */
@Injectable()
export class PathsService {
  private readonly log = new Logger('Paths');
  async onCourseCompleted(
    _tx: Prisma.TransactionClient,
    userId: string,
    courseId: string,
  ): Promise<void> {
    this.log.debug(`onCourseCompleted(${userId}, ${courseId}) — Mərhələ 4-də aktivləşir`);
  }
}
