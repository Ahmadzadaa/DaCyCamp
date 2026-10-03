'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ROLES, type AdminUserDto, type Paged, type Role } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn, fmtNum, initials } from '@/lib/utils';
import { ChevronRight, Search, UserPlus } from 'lucide-react';
import { PageHeader } from './page-header';
import { CreateUserDialog } from './user-dialogs';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from './admin-context';
import { fmtDate } from './format';

export function UsersTable({ initialQ = '' }: { initialQ?: string }) {
  const { isAdmin } = useAdmin();
  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminUserDto> | null>(null);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (q.trim()) p.set('q', q.trim());
    if (role) p.set('role', role);
    api<Paged<AdminUserDto>>(`/admin/users?${p}`)
      .then(setData)
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [q, role, page]);

  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
  }, [load]);

  async function changeRole(u: AdminUserDto, next: Role) {
    try {
      await api(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role: next } });
      setData((d) =>
        d ? { ...d, items: d.items.map((x) => (x.id === u.id ? { ...x, role: next } : x)) } : d,
      );
      toast.success(t('admin.roleChanged'));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('users.title')}
        subtitle={data ? t('admin.usersCount', { n: fmtNum(data.total) }) : ' '}
      >
        {isAdmin ? (
          <Button type="button" onClick={() => setCreating(true)} data-testid="user-new">
            <UserPlus aria-hidden />
            {t('users.new')}
          </Button>
        ) : null}
      </PageHeader>
      {creating ? (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      ) : null}
      <div className="tb !my-0">
        <div className="chips">
          <button
            type="button"
            className={cn('chip', role === '' && 'on')}
            onClick={() => {
              setRole('');
              setPage(1);
            }}
          >
            {t('common.all')}
          </button>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              className={cn('chip', role === r && 'on')}
              onClick={() => {
                setRole(r);
                setPage(1);
              }}
            >
              {t(`role.${r}`)}
            </button>
          ))}
        </div>
        <label className="srch">
          <Search aria-hidden className="size-[18px] shrink-0" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
          />
        </label>
      </div>
      <div className="tbl-wrap">
        <table className="tbl-admin">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('common.role')}</th>
              <th>XP</th>
              <th>{t('admin.enrollments')}</th>
              <th>{t('common.date')}</th>
              <th aria-label={t('users.open')} />
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              data?.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      href={`/admin/telebeler/${u.id}`}
                      className="flex items-center gap-3 hover:underline"
                      data-testid={`user-link-${u.email}`}
                    >
                      <span className="avatar sm">{initials(u.name)}</span>
                      <b>{u.name}</b>
                    </Link>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className="!min-h-0 w-auto !py-1.5 text-sm"
                        aria-label={t('admin.changeRole')}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`role.${r}`)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      t(`role.${u.role}`)
                    )}
                  </td>
                  <td>{u.xpTotal}</td>
                  <td>{u.enrollmentCount}</td>
                  <td className="whitespace-nowrap text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="text-right">
                    <Link
                      href={`/admin/telebeler/${u.id}`}
                      className="ib"
                      aria-label={t('users.open')}
                      title={t('users.open')}
                    >
                      <ChevronRight aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{data ? `${data.total} · ${page} / ${pages}` : ''}</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← {t('common.prev')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next')} →
          </Button>
        </div>
      </div>
    </div>
  );
}
