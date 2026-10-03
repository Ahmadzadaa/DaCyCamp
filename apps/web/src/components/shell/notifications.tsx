'use client';
import { useState } from 'react';
import Link from 'next/link';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Award, Bell, BookOpen, CheckCircle2, ClipboardCheck, RotateCcw } from 'lucide-react';
import type { NotificationDto, NotificationKind } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtAgo } from '@/components/admin/format';

const ICON: Record<NotificationKind, typeof Bell> = {
  certificate: Award,
  project_passed: CheckCircle2,
  project_returned: RotateCcw,
  new_course: BookOpen,
  reviews_pending: ClipboardCheck,
};

/** Zəng: açılanda siyahı yüklənir və hamısı «oxunmuş» sayılır */
export function NotificationsBell({ unread: initialUnread }: { unread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [error, setError] = useState(false);

  async function onOpenChange(open: boolean) {
    if (!open) return;
    try {
      const list = await api<NotificationDto[]>('/me/notifications');
      setItems(list);
      setError(false);
      if (list.some((n) => n.unread)) {
        await api('/me/notifications/seen', { method: 'POST' }).catch(() => null);
      }
      setUnread(0);
    } catch {
      setError(true);
    }
  }

  return (
    <Menu.Root onOpenChange={(o) => void onOpenChange(o)}>
      <Menu.Trigger
        className="ib"
        aria-label={
          unread
            ? `${t('shell.notifications')} · ${t('shell.unreadCount', { n: unread })}`
            : t('shell.notifications')
        }
        data-testid="notifications"
      >
        <Bell aria-hidden />
        {unread ? <span className="dotn" aria-hidden /> : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="pop notif" sideOffset={8} align="end">
          <div className="pop-h">
            <b>{t('shell.notifications')}</b>
          </div>
          {items === null && !error ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="sk size-9 shrink-0 !rounded-[10px]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="sk h-3.5 w-2/3" />
                    <div className="sk h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !items?.length ? (
            <div className="notif-empty">
              <span className="notif-ic">
                <Bell aria-hidden />
              </span>
              <b>{t('shell.notificationsEmpty')}</b>
              <p>{t('shell.notificationsEmptyHint')}</p>
            </div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => {
                const Icon = ICON[n.kind];
                return (
                  <li key={n.id}>
                    <Menu.Item asChild>
                      <Link href={n.url} className={cn('notif-item', n.unread && 'unread')}>
                        <span className={cn('notif-ic', `k-${n.kind}`)}>
                          <Icon aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b>{n.title}</b>
                          {n.body ? <span className="notif-body">{n.body}</span> : null}
                          <time dateTime={n.at}>{fmtAgo(n.at)}</time>
                        </span>
                      </Link>
                    </Menu.Item>
                  </li>
                );
              })}
            </ul>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
