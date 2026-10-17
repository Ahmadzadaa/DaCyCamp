'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { AdminUserDto, Paged } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { Input } from '@/components/ui/input';

/** İstifadəçi axtarışı (ad / e-poçt) — admin üçün; seçiləndə onPick */
export function UserSearch({
  onPick,
  exclude = [],
  label,
}: {
  onPick: (u: AdminUserDto) => void;
  exclude?: string[];
  label?: string;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminUserDto[] | null>(null);
  const excludeKey = exclude.join(',');
  useEffect(() => {
    const skip = new Set(excludeKey ? excludeKey.split(',') : []);
    if (q.trim().length < 2) {
      setRows(null);
      return;
    }
    const h = setTimeout(() => {
      api<Paged<AdminUserDto>>(`/admin/users?pageSize=8&q=${encodeURIComponent(q.trim())}`)
        .then((r) => setRows(r.items.filter((u) => !skip.has(u.id))))
        .catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q, excludeKey]);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('academy.admin.searchUser')}
          aria-label={label ?? t('academy.admin.searchUser')}
          className="pl-9"
          data-testid="user-search"
        />
      </div>
      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted">{t('academy.admin.noUsers')}</p>
      ) : null}
      {rows?.length ? (
        <ul className="flex flex-col gap-1">
          {rows.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-soft"
                onClick={() => {
                  onPick(u);
                  setQ('');
                  setRows(null);
                }}
              >
                <span className="min-w-0">
                  <b className="block truncate">{u.name}</b>
                  <span className="block truncate text-xs text-muted">{u.email}</span>
                </span>
                <span className="badge badge-muted shrink-0">{u.role}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
