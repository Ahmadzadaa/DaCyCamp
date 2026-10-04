import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { SupportTicketDto } from '@dacy/shared';
import { fmtDate } from '@/components/admin/format';
import { SupportStatusBadge } from '@/components/support/status-badge';
import { SupportThread } from '@/components/support/support-thread';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('support.title') };
}

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/giris?next=/destek/${id}`);
  const ticket = await apiTry<SupportTicketDto>(`/support/tickets/${id}`);
  if (!ticket) notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/destek" className="back-link">
        <ArrowLeft aria-hidden />
        {t('support.back')}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="text-sm text-muted">
            {fmtDate(ticket.createdAt)} · {t('support.messages', { n: ticket.messageCount })}
          </p>
        </div>
        <SupportStatusBadge status={ticket.status} />
      </header>
      <section className="box">
        <SupportThread ticket={ticket} mode="student" />
      </section>
    </div>
  );
}
