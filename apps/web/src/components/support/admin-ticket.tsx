'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CircleCheck, ExternalLink, RotateCcw, UserRound } from 'lucide-react';
import type { AdminSupportTicketDto, SupportTicketDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { fmtDate } from '@/components/admin/format';
import { SupportStatusBadge } from './status-badge';
import { SupportThread } from './support-thread';

/** Admin: müraciətin başlığı, tələbə, səhifə, bağla / yenidən aç və mesajlar */
export function AdminSupportTicket({ ticket: initial }: { ticket: AdminSupportTicketDto }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: 'OPEN' | 'CLOSED') {
    setBusy(true);
    try {
      const next = await api<AdminSupportTicketDto>(`/admin/support/${ticket.id}`, {
        method: 'PATCH',
        body: { status },
      });
      setTicket(next);
      toast.success(status === 'CLOSED' ? t('support.closed') : t('support.reopened'));
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="text-sm text-muted">
            {fmtDate(ticket.createdAt, true)} · {t('support.messages', { n: ticket.messageCount })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SupportStatusBadge status={ticket.status} />
          {ticket.status === 'CLOSED' ? (
            <Button variant="ghost" loading={busy} onClick={() => void setStatus('OPEN')}>
              <RotateCcw className="size-4" />
              {t('support.reopen')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => void setStatus('CLOSED')}
              data-testid="support-close"
            >
              <CircleCheck className="size-4" />
              {t('support.close')}
            </Button>
          )}
        </div>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="box">
          <SupportThread
            ticket={ticket}
            mode="admin"
            onChange={(n: SupportTicketDto) => setTicket({ ...ticket, ...n })}
          />
        </section>
        <aside className="box flex flex-col gap-3 self-start text-sm">
          <h2 className="box-h">
            <UserRound aria-hidden />
            {t('support.student')}
          </h2>
          <div>
            <b className="block">{ticket.user.name}</b>
            <span className="text-muted">{ticket.user.email}</span>
          </div>
          <Link href={`/admin/telebeler/${ticket.user.id}`} className="box-more">
            {t('support.openProfile')}
          </Link>
          {ticket.pageUrl ? (
            <div>
              <span className="block text-xs text-muted">{t('support.page')}</span>
              <Link href={ticket.pageUrl} className="inline-flex items-center gap-1 break-all">
                {ticket.pageUrl}
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
