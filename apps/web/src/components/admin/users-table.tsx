'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ROLES, type AdminUserDto, type Paged, type Role } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
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

  useEffect(() => {
    const h = setTimeout(() => {
      setLoading(true);
      const p = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (q.trim()) p.set('q', q.trim());
      if (role) p.set('role', role);
      api<Paged<AdminUserDto>>(`/admin/users?${p}`)
        .then(setData)
        .catch((e) => toast.error(errorMessage(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(h);
  }, [q, role, page]);

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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{t('admin.students')}</h1>
        <span className="flex-1" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t('common.search')}
          className="max-w-xs"
          aria-label={t('common.search')}
        />
      </div>
      <div className="flex flex-wrap gap-2">
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
      <div className="card overflow-x-auto">
        <table className="tbl-admin">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('common.role')}</th>
              <th>XP</th>
              <th>{t('admin.enrollments')}</th>
              <th>{t('common.date')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              data?.items.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className="min-h-0 w-auto py-1 text-xs"
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
                  <td className="text-muted">{fmtDate(u.createdAt)}</td>
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
