import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import type { SupportTicketSummaryDto } from '@dacy/shared';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { fmtAgo } from '@/components/admin/format';
import { NewTicketForm } from '@/components/support/new-ticket-form';
import { SupportStatusBadge } from '@/components/support/status-badge';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('support.title') };
}

/** Dəstək: yeni müraciət + tələbənin müraciətləri. ?sehife= — kömək düyməsindən gələndə hansı səhifədən yazılıb */
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sehife?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/destek');
  const sp = await searchParams;
  const tickets = await apiFetch<SupportTicketSummaryDto[]>('/support/tickets');
  return (
    <div className="flex flex-col gap-8">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('support.title')}</h1>
          </div>
          <p>{t('support.intro')}</p>
        </div>
        <HeroArt kind="catalog" />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="box lg:order-last" aria-labelledby="sup-new">
          <h2 id="sup-new" className="box-h">
            {t('support.newTicket')}
          </h2>
          <NewTicketForm pageUrl={sp.sehife?.startsWith('/') ? sp.sehife : undefined} />
        </section>

        <section className="box" aria-labelledby="sup-mine">
          <h2 id="sup-mine" className="box-h">
            <LifeBuoy aria-hidden />
            {t('support.myTickets')}
          </h2>
          {tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title={t('support.empty')}
              description={t('support.emptyDesc')}
            />
          ) : (
            <ul className="sup-list" data-testid="support-list">
              {tickets.map((tk) => (
                <li key={tk.id}>
                  <Link href={`/destek/${tk.id}`}>
                    <span className="min-w-0 flex-1">
                      <b className="flex items-center gap-2">
                        <span className="truncate">{tk.subject}</span>
                        {tk.unread ? (
                          <span className="sup-dot" title={t('support.unread')} />
                        ) : null}
                      </b>
                      <span className="block truncate text-sm text-muted">{tk.preview}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <SupportStatusBadge status={tk.status} />
                      <time
                        className="text-xs text-muted"
                        dateTime={tk.lastMessageAt}
                        suppressHydrationWarning
                      >
                        {fmtAgo(tk.lastMessageAt)}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
