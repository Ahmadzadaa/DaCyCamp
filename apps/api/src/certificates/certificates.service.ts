import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Certificate, Prisma } from '@prisma/client';
import QRCode from 'qrcode';
import type { CertificateDto, CertificateSummaryDto } from '@dacy/shared';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { notFound } from '../common/errors';
import { renderCertificatePdf } from './certificate-pdf';

type Tx = Prisma.TransactionClient | PrismaService;

export interface CertificateSnapshot {
  studentName: string;
  courseTitle: string;
  courseSlug: string | null;
  trackTitle: string;
  trackColor: string;
  hours: number | null;
  xp: number;
}

export const verifyUrlOf = (id: string) =>
  `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sertifikat/${id}`;

export function toCertificateSummary(c: Certificate): CertificateSummaryDto {
  const s = c.snapshot as unknown as CertificateSnapshot;
  return {
    id: c.id,
    serial: c.serial,
    courseTitle: s.courseTitle,
    courseSlug: s.courseSlug ?? null,
    trackTitle: s.trackTitle,
    trackColor: s.trackColor,
    issuedAt: c.issuedAt.toISOString(),
    revokedAt: c.revokedAt?.toISOString() ?? null,
  };
}

/** Kurs sertifikatları: avtomatik verilmə (kurs bitəndə), ictimai yoxlama, PDF, ləğv */
@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** İdempotent: eyni tələbə + kurs üçün bir sertifikat. Adlar snapshot-da dondurulur. */
  async issueForCourse(tx: Tx, userId: string, courseId: string): Promise<string> {
    const existing = await tx.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return existing.id;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const course = await tx.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        track: { select: { title: true, color: true } },
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

  async mine(userId: string): Promise<CertificateSummaryDto[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map(toCertificateSummary);
  }

  /** İctimai: giriş tələb etmir, yalnız snapshot məlumatı */
  async getPublic(id: string): Promise<CertificateDto> {
    const c = await this.find(id);
    const s = c.snapshot as unknown as CertificateSnapshot;
    const verifyUrl = verifyUrlOf(c.id);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 220,
      color: { dark: '#13233f', light: '#ffffff' },
    });
    return {
      ...toCertificateSummary(c),
      studentName: s.studentName,
      hours: s.hours,
      xp: s.xp,
      verifyUrl,
      qrDataUrl,
      pdfUrl: `/api/certificates/${c.id}.pdf`,
    };
  }

  async pdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const c = await this.find(id);
    const s = c.snapshot as unknown as CertificateSnapshot;
    const buffer = await renderCertificatePdf({
      ...s,
      serial: c.serial,
      issuedAt: c.issuedAt,
      revoked: !!c.revokedAt,
      verifyUrl: verifyUrlOf(c.id),
    });
    return { buffer, filename: `${c.serial}.pdf` };
  }

  async revoke(id: string): Promise<CertificateSummaryDto> {
    const c = await this.find(id);
    const updated = await this.prisma.certificate.update({
      where: { id: c.id },
      data: { revokedAt: c.revokedAt ?? new Date() },
    });
    return toCertificateSummary(updated);
  }

  private async find(id: string) {
    const c = await this.prisma.certificate.findUnique({ where: { id } });
    if (!c) throw notFound('CERT_NOT_FOUND', 'Sertifikat tapılmadı');
    return c;
  }
}
