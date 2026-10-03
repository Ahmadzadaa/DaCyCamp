'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { SupportTicketDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { fmtAgo } from '@/components/admin/format';

/**
 * Müraciətin mesajları (çat kimi) və cavab qutusu.
 * mode=student — tələbənin mesajları sağda; mode=admin — heyətin mesajları sağda.
 */
export function SupportThread({
  ticket: initial,
  mode,
  onChange,
}: {
  ticket: SupportTicketDto;
  mode: 'student' | 'admin';
  onChange?: (t: SupportTicketDto) => void;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => setTicket(initial), [initial]);
  // tələbə cavaba baxdı → sidebar-dakı «yeni cavab» sayğacı yenilənsin (layout səhifədən əvvəl hesablanır)
  useEffect(() => {
    if (mode === 'student') router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [ticket.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const url =
        mode === 'admin'
          ? `/admin/support/${ticket.id}/messages`
          : `/support/tickets/${ticket.id}/messages`;
      const next = await api<SupportTicketDto>(url, { method: 'POST', body: { body } });
      setTicket(next);
      onChange?.(next);
      setBody('');
      toast.success(t('support.replySent'));
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const mine = (fromStaff: boolean) => (mode === 'admin' ? fromStaff : !fromStaff);

  return (
    <div className="flex flex-col gap-4">
      <ol className="sup-thread" data-testid="support-thread">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={cn('sup-msg', mine(m.fromStaff) && 'me', m.fromStaff && 'staff')}
          >
            <div className="sup-meta">
              <b>
                {m.fromStaff
                  ? `${t('support.staff')}${m.authorName ? ` · ${m.authorName}` : ''}`
                  : mode === 'student'
                    ? t('support.you')
                    : (m.authorName ?? t('support.student'))}
              </b>
              <time dateTime={m.createdAt} suppressHydrationWarning>
                {fmtAgo(m.createdAt)}
              </time>
            </div>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      <div ref={end} />
      {ticket.status === 'CLOSED' && mode === 'student' ? (
        <p className="text-sm text-muted">{t('support.closedNote')}</p>
      ) : null}
      <form onSubmit={send} className="sup-reply">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('support.replyPh')}
          rows={3}
          maxLength={5000}
          aria-label={t('support.reply')}
          data-testid="support-reply"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send(e);
          }}
        />
        <Button type="submit" loading={busy} disabled={!body.trim()}>
          <Send className="size-4" />
          {t('support.reply')}
        </Button>
      </form>
    </div>
  );
}
