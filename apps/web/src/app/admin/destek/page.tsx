import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy, Search } from 'lucide-react';
import type { AdminSupportListDto } from '@dacy/shared';
import { PageHeader } from '@/components/admin/page-header';
import { fmtAgo } from '@/components/admin/format';
import { EmptyState } from '@/components/app/empty-state';
import { SupportStatusBadge } from '@/components/support/status-badge';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function generateMetadata(): Metadata {
  return { title: t('support.adminTitle') };
}

const TABS = ['OPEN', 'ANSWERED', 'CLOSED', 'ALL'] as const;
type Tab = (typeof TABS)[number];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status: Tab = TABS.includes(sp.status as Tab) ? (sp.status as Tab) : 'OPEN';
  const q = sp.q?.trim() ?? '';
  const qs = new URLSearchParams({ status, ...(q ? { q } : {}) });
  const data = await apiFetch<AdminSupportListDto>(`/admin/support?${qs}`);
  const href = (s: Tab) =>
    `/admin/destek?${new URLSearchParams({ status: s, ...(q ? { q } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('support.adminTitle')} subtitle={t('support.adminDesc')} />
      <div className="flex flex-col">
        <nav className="tabs" aria-label={t('support.adminTitle')}>
          {TABS.map((s) => (
            <Link
              key={s}
              href={href(s)}
              className={cn(status === s && 'on')}
              aria-current={status === s ? 'page' : undefined}
              data-testid={`support-tab-${s}`}
            >
              {s === 'ALL' ? t('support.all') : t(`support.status.${s}`)}
              <i>{data.counts[s]}</i>
            </Link>
          ))}
        </nav>
        <form className="srch !ml-0 w-full sm:max-w-sm" action="/admin/destek">
          <Search aria-hidden />
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder={t('support.search')}
            aria-label={t('support.search')}
          />
        </form>
      </div>

      {data.tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title={t('support.adminEmpty')} />
      ) : (
        <ul className="sup-list card" data-testid="admin-support-list">
          {data.tickets.map((tk) => (
            <li key={tk.id}>
              <Link href={`/admin/destek/${tk.id}`}>
                <span className="avatar sm" aria-hidden>
                  {tk.user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{tk.subject}</b>
                  <span className="block truncate text-sm text-muted">
                    {tk.user.name} · {tk.preview}
                  </span>
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
    </div>
  );
}
