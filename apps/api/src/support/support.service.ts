import { Injectable } from '@nestjs/common';
import type { Prisma, SupportMessage, SupportTicket } from '@prisma/client';
import type {
  AdminSupportListDto,
  AdminSupportSummaryDto,
  AdminSupportTicketDto,
  CreateSupportTicketInput,
  SupportTicketDto,
  SupportTicketSummaryDto,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { badRequest, notFound } from '../common/errors';

/** Eyni anda açıq (cavab gözləyən) müraciət limiti — spamın qarşısı */
const MAX_OPEN_PER_USER = 10;
const PREVIEW = 140;

type TicketWith = SupportTicket & {
  messages: Array<SupportMessage & { author: { name: string } | null }>;
  _count?: { messages: number };
  user?: { id: string; name: string; email: string };
};

const preview = (s: string) => (s.length > PREVIEW ? `${s.slice(0, PREVIEW - 1)}…` : s);

/**
 * Dəstək müraciətləri: tələbə yazır (yeni müraciət və ya cavab), heyət cavablandırır və bağlayır.
 * Status: tələbə yazanda OPEN, heyət cavab verəndə ANSWERED; bağlı müraciətə tələbə yazsa yenidən açılır.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private summary(t: TicketWith, forStudent: boolean): SupportTicketSummaryDto {
    const last = t.messages[t.messages.length - 1];
    const lastStaff = [...t.messages].reverse().find((m) => m.fromStaff);
    return {
      id: t.id,
      subject: t.subject,
      status: t.status,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      messageCount: t._count?.messages ?? t.messages.length,
      preview: last ? preview(last.body) : '',
      unread: forStudent && !!lastStaff && (!t.userSeenAt || lastStaff.createdAt > t.userSeenAt),
    };
  }

  private detail(t: TicketWith, forStudent: boolean): SupportTicketDto {
    return {
      ...this.summary(t, forStudent),
      pageUrl: t.pageUrl,
      messages: t.messages.map((m) => ({
        id: m.id,
        body: m.body,
        fromStaff: m.fromStaff,
        authorName: m.author?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  private readonly withMessages = {
    messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } },
  } satisfies Prisma.SupportTicketInclude;

  // ───────── tələbə ─────────
  async mine(userId: string): Promise<SupportTicketSummaryDto[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: this.withMessages,
    });
    return rows.map((t) => this.summary(t, true));
  }

  async create(userId: string, dto: CreateSupportTicketInput): Promise<SupportTicketDto> {
    const open = await this.prisma.supportTicket.count({ where: { userId, status: 'OPEN' } });
    if (open >= MAX_OPEN_PER_USER)
      throw badRequest(
        'SUPPORT_LIMIT',
        'Cavab gözləyən müraciətləriniz çoxdur — mövcud müraciətə yazın və ya cavabı gözləyin',
      );
    const now = new Date();
    const t = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        pageUrl: dto.pageUrl || null,
        lastMessageAt: now,
        userSeenAt: now,
        messages: { create: { authorId: userId, body: dto.body, createdAt: now } },
      },
      include: this.withMessages,
    });
    return this.detail(t, true);
  }

  private async own(userId: string, id: string) {
    const t = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!t || t.userId !== userId) throw notFound();
    return t;
  }

  async getMine(userId: string, id: string): Promise<SupportTicketDto> {
    await this.own(userId, id);
    const t = await this.prisma.supportTicket.update({
      where: { id },
      data: { userSeenAt: new Date() },
      include: this.withMessages,
    });
    return this.detail(t, true);
  }

  async replyAsStudent(userId: string, id: string, body: string): Promise<SupportTicketDto> {
    await this.own(userId, id);
    const now = new Date();
    const t = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'OPEN',
        lastMessageAt: now,
        userSeenAt: now,
        messages: { create: { authorId: userId, body, createdAt: now } },
      },
      include: this.withMessages,
    });
    return this.detail(t, true);
  }

  // ───────── heyət ─────────
  async adminList(
    status: 'OPEN' | 'ANSWERED' | 'CLOSED' | 'ALL',
    q?: string,
  ): Promise<AdminSupportListDto> {
    const search: Prisma.SupportTicketWhereInput = q
      ? {
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [rows, grouped] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { ...search, ...(status === 'ALL' ? {} : { status }) },
        // cavab gözləyənlər yuxarıda, sonra ən son yazılanlar
        orderBy: [{ lastMessageAt: 'desc' }],
        take: 200,
        include: {
          ...this.withMessages,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.supportTicket.groupBy({ by: ['status'], where: search, _count: true }),
    ]);
    const counts = { OPEN: 0, ANSWERED: 0, CLOSED: 0, ALL: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count;
      counts.ALL += g._count;
    }
    const tickets: AdminSupportSummaryDto[] = rows.map((t) => ({
      ...this.summary(t, false),
      user: t.user,
    }));
    return { tickets, counts };
  }

  async openCount(): Promise<number> {
    return this.prisma.supportTicket.count({ where: { status: 'OPEN' } });
  }

  async adminGet(id: string): Promise<AdminSupportTicketDto> {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { ...this.withMessages, user: { select: { id: true, name: true, email: true } } },
    });
    if (!t) throw notFound();
    return { ...this.detail(t, false), user: t.user };
  }

  async reply(staffId: string, id: string, body: string): Promise<AdminSupportTicketDto> {
    if (!(await this.prisma.supportTicket.findUnique({ where: { id } }))) throw notFound();
    const now = new Date();
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'ANSWERED',
        lastMessageAt: now,
        messages: { create: { authorId: staffId, fromStaff: true, body, createdAt: now } },
      },
    });
    return this.adminGet(id);
  }

  async setStatus(id: string, status: 'OPEN' | 'CLOSED'): Promise<AdminSupportTicketDto> {
    if (!(await this.prisma.supportTicket.findUnique({ where: { id } }))) throw notFound();
    await this.prisma.supportTicket.update({ where: { id }, data: { status } });
    return this.adminGet(id);
  }
}
