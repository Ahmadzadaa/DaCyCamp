import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Certificate, PathCertificate, Prisma } from '@prisma/client';
import QRCode from 'qrcode';
import type { CertificateDto, CertificateSummaryDto } from '@dacy/shared';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { notFound } from '../common/errors';
import { renderCertificatePdf } from './certificate-pdf';
import { reqLocale, withRawContent } from '../common/i18n/request-locale';

type Tx = Prisma.TransactionClient | PrismaService;

export interface CertificateSnapshot {
  studentName: string;
  /** kurs və ya yolun adı */
  courseTitle: string;
  courseSlug: string | null;
  trackTitle: string;
  trackColor: string;
  hours: number | null;
  xp: number;
  /** verilən anda ingiliscə adlar (göstərişdə dilə görə) */
  i18n?: { en?: { courseTitle?: string; trackTitle?: string } };
}

type I18nTitle = { en?: { title?: string } } | null;
const enTitle = (j: unknown) => (j as I18nTitle)?.en?.title || undefined;

/** Snapshot-ı sorğunun dilində göstər (en — verilən anda saxlanmış ingiliscə adlar) */
function localSnapshot(s: CertificateSnapshot): CertificateSnapshot {
  const en = reqLocale() === 'en' ? s.i18n?.en : undefined;
  return en
    ? {
        ...s,
        courseTitle: en.courseTitle || s.courseTitle,
        trackTitle: en.trackTitle || s.trackTitle,
      }
    : s;
}

/** Hər iki cədvəlin (kurs / yol sertifikatı) ümumi görünüşü */
interface AnyCert {
  kind: 'course' | 'path';
  id: string;
  serial: string;
  snapshot: CertificateSnapshot;
  issuedAt: Date;
  revokedAt: Date | null;
}

export const verifyUrlOf = (id: string) =>
  `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sertifikat/${id}`;

const fromCourse = (c: Certificate): AnyCert => ({
  kind: 'course',
  id: c.id,
  serial: c.serial,
  snapshot: localSnapshot(c.snapshot as unknown as CertificateSnapshot),
  issuedAt: c.issuedAt,
  revokedAt: c.revokedAt,
});
const fromPath = (c: PathCertificate): AnyCert => ({
  kind: 'path',
  id: c.id,
  serial: c.serial,
  snapshot: localSnapshot(c.snapshot as unknown as CertificateSnapshot),
  issuedAt: c.issuedAt,
  revokedAt: c.revokedAt,
});

function summary(c: AnyCert): CertificateSummaryDto {
  return {
    id: c.id,
    kind: c.kind,
    serial: c.serial,
    courseTitle: c.snapshot.courseTitle,
    courseSlug: c.snapshot.courseSlug ?? null,
    trackTitle: c.snapshot.trackTitle,
    trackColor: c.snapshot.trackColor,
    issuedAt: c.issuedAt.toISOString(),
    revokedAt: c.revokedAt?.toISOString() ?? null,
  };
}
export const toCertificateSummary = (c: Certificate) => summary(fromCourse(c));
export const toPathCertificateSummary = (c: PathCertificate) => summary(fromPath(c));

/** Kurs və yol sertifikatları: avtomatik verilmə, ictimai yoxlama, PDF, ləğv */
@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** İdempotent: eyni tələbə + kurs üçün bir sertifikat. Adlar snapshot-da dondurulur. */
  async issueForCourse(tx: Tx, userId: string, courseId: string): Promise<string> {
    // adlar mənbə dilində dondurulur; ingiliscə adlar snapshot.i18n-də ayrıca
    return withRawContent(() => this.issueForCourseRaw(tx, userId, courseId));
  }

  private async issueForCourseRaw(tx: Tx, userId: string, courseId: string): Promise<string> {
    const existing = await tx.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return existing.id;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const course = await tx.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        track: { select: { title: true, color: true, i18n: true } },
        modules: { include: { steps: { select: { xp: true, isPublished: true } } } },
      },
    });
    const xp = course.modules
      .flatMap((m) => m.steps)
      .filter((s) => s.isPublished)
      .reduce((a, s) => a + s.xp, 0);
    const snapshot: CertificateSnapshot = {
      studentName: user.name,
      courseTitle: course.title,
      courseSlug: course.slug,
      trackTitle: course.track.title,
      trackColor: course.track.color,
      hours: course.estimatedHours ?? null,
      xp,
      i18n: { en: { courseTitle: enTitle(course.i18n), trackTitle: enTitle(course.track.i18n) } },
    };
    const created = await tx.certificate.create({
      data: {
        userId,
        courseId,
        serial: `tmp-${randomUUID()}`,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
      },
    });
    const serial = `DACY-C-${created.issuedAt.getFullYear()}-${String(created.seq).padStart(6, '0')}`;
    await tx.certificate.update({ where: { id: created.id }, data: { serial } });
    return created.id;
  }

  /** Yol sertifikatı (Mərhələ 4) — eyni qayda, seriya DACY-P-… */
  async issueForPath(tx: Tx, userId: string, pathId: string): Promise<string> {
    return withRawContent(() => this.issueForPathRaw(tx, userId, pathId));
  }

  private async issueForPathRaw(tx: Tx, userId: string, pathId: string): Promise<string> {
    const existing = await tx.pathCertificate.findUnique({
      where: { userId_pathId: { userId, pathId } },
    });
    if (existing) return existing.id;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const path = await tx.learningPath.findUniqueOrThrow({
      where: { id: pathId },
      include: {
        track: { select: { title: true, color: true, i18n: true } },
        items: {
          select: {
            xp: true,
            type: true,
            config: true,
            course: { select: { estimatedHours: true } },
            estimatedHours: true,
          },
        },
      },
    });
    const milestone = path.items.find((i) => i.type === 'MILESTONE');
    const certTitle = (
      (milestone?.config as { certificate_title?: string } | null)?.certificate_title ?? ''
    ).trim();
    const hours =
      path.estimatedHours ??
      path.items.reduce((a, i) => a + (i.estimatedHours ?? i.course?.estimatedHours ?? 0), 0) ??
      null;
    const snapshot: CertificateSnapshot = {
      studentName: user.name,
      courseTitle: certTitle || path.title,
      courseSlug: path.slug,
      trackTitle: path.track.title,
      trackColor: path.track.color,
      hours: hours ? Math.round(hours) : null,
      xp: path.items.reduce((a, i) => a + i.xp, 0),
      i18n: {
        en: {
          courseTitle: certTitle ? undefined : enTitle(path.i18n),
          trackTitle: enTitle(path.track.i18n),
        },
      },
    };
    const created = await tx.pathCertificate.create({
      data: {
        userId,
        pathId,
        serial: `tmp-${randomUUID()}`,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
      },
    });
    const serial = `DACY-P-${created.issuedAt.getFullYear()}-${String(created.seq).padStart(6, '0')}`;
    await tx.pathCertificate.update({ where: { id: created.id }, data: { serial } });
    return created.id;
  }

  async mine(userId: string): Promise<CertificateSummaryDto[]> {
    const [a, b] = await Promise.all([
      this.prisma.certificate.findMany({ where: { userId } }),
      this.prisma.pathCertificate.findMany({ where: { userId } }),
    ]);
    return [...a.map(fromCourse), ...b.map(fromPath)]
      .sort((x, y) => y.issuedAt.getTime() - x.issuedAt.getTime())
      .map(summary);
  }

  /** İctimai: giriş tələb etmir, yalnız snapshot məlumatı */
  async getPublic(id: string): Promise<CertificateDto> {
    const c = await this.find(id);
    const verifyUrl = verifyUrlOf(c.id);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 220,
      color: { dark: '#13233f', light: '#ffffff' },
    });
    return {
      ...summary(c),
      studentName: c.snapshot.studentName,
      hours: c.snapshot.hours,
      xp: c.snapshot.xp,
      verifyUrl,
      qrDataUrl,
      pdfUrl: `/api/certificates/${c.id}.pdf`,
    };
  }

  async pdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const c = await this.find(id);
    const buffer = await renderCertificatePdf({
      ...c.snapshot,
      kind: c.kind,
      serial: c.serial,
      issuedAt: c.issuedAt,
      revoked: !!c.revokedAt,
      verifyUrl: verifyUrlOf(c.id),
    });
    return { buffer, filename: `${c.serial}.pdf` };
  }

  /** Ləğv et (`restore` = ləğvi geri al) — yoxlama səhifəsində dərhal əks olunur */
  async revoke(id: string, restore = false): Promise<CertificateSummaryDto> {
    const c = await this.find(id);
    const now = restore ? null : (c.revokedAt ?? new Date());
    const updated =
      c.kind === 'course'
        ? fromCourse(
            await this.prisma.certificate.update({ where: { id: c.id }, data: { revokedAt: now } }),
          )
        : fromPath(
            await this.prisma.pathCertificate.update({
              where: { id: c.id },
              data: { revokedAt: now },
            }),
          );
    return summary(updated);
  }

  private async find(id: string): Promise<AnyCert> {
    const c = await this.prisma.certificate.findUnique({ where: { id } });
    if (c) return fromCourse(c);
    const p = await this.prisma.pathCertificate.findUnique({ where: { id } });
    if (p) return fromPath(p);
    throw notFound('CERT_NOT_FOUND', 'Sertifikat tapılmadı');
  }
}
