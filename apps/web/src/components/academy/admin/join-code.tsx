'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Link2, RefreshCw, UserPlus } from 'lucide-react';
import { formatJoinCode, type AcademyGroupDto, type AdminUserDto, type Paged } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { CreateUserDialog } from '@/components/admin/user-dialogs';

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t('academy.admin.copied'));
  } catch {
    toast.error(text);
  }
}

/**
 * Qrupun qoşulma kodu (yalnız admin): kodu və kod yazılmış qeydiyyat linkini kopyalamaq, yeni kod yaratmaq,
 * kodla qoşulmanı açıb-bağlamaq. Admin kodu tələbələrə göndərir — onlar qeydiyyatda yazıb bu qrupa düşür.
 */
export function JoinCodeBox({ g }: { g: AcademyGroupDto }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  if (!g.joinCode) return null;
  const pretty = formatJoinCode(g.joinCode);
  const link = `${origin}/qeydiyyat?kod=${g.joinCode}`;

  async function rotate() {
    try {
      await api(`/academy/groups/${g.id}/join-code/rotate`, { method: 'POST' });
      toast.success(t('academy.admin.rotated'));
      setConfirm(false);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function toggle(on: boolean) {
    setBusy(true);
    try {
      await api(`/academy/groups/${g.id}`, { method: 'PATCH', body: { joinEnabled: on } });
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="join-code-box">
      <p className="text-sm text-muted">{t('academy.admin.joinCodeHint')}</p>
      <div className={`join-code${g.joinEnabled ? '' : ' off'}`}>
        <code data-testid="join-code-value">{pretty}</code>
        <Button size="sm" variant="ghost" onClick={() => copy(pretty)}>
          <Copy aria-hidden />
          {t('academy.admin.copy')}
        </Button>
      </div>
      <button
        type="button"
        className="join-link"
        onClick={() => copy(link)}
        title={t('academy.admin.joinLink')}
      >
        <Link2 aria-hidden />
        <span className="min-w-0 flex-1 truncate">{link || '/qeydiyyat'}</span>
        <Copy aria-hidden />
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch
            checked={!!g.joinEnabled}
            onCheckedChange={toggle}
            disabled={busy}
            aria-label={t('academy.admin.joinEnabled')}
          />
          {t('academy.admin.joinEnabled')}
        </label>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          <RefreshCw aria-hidden />
          {t('academy.admin.rotate')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('academy.admin.rotate')}
        description={t('academy.admin.rotateConfirm')}
        confirmLabel={t('academy.admin.rotate')}
        danger={false}
        onConfirm={rotate}
      />
    </div>
  );
}

/** Akademiya müəllimi hesabları (TEACHER): siyahı və yeni hesab — müəllim öz e-poçtu və şifrəsi ilə daxil olur */
export function TeacherAccounts() {
  const [rows, setRows] = useState<AdminUserDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = () =>
    api<Paged<AdminUserDto>>('/admin/users?role=TEACHER&pageSize=50')
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="flex flex-col gap-3" data-testid="teacher-accounts">
      <p className="text-sm text-muted">{t('academy.admin.teachersHint')}</p>
      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted">{t('academy.admin.noTeachers')}</p>
      ) : null}
      {rows?.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {rows.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <b className="block truncate">{u.name}</b>
                <span className="block truncate text-xs text-muted">{u.email}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button size="sm" onClick={() => setOpen(true)} className="self-start">
        <UserPlus aria-hidden />
        {t('academy.admin.newTeacher')}
      </Button>
      {open ? (
        <CreateUserDialog
          fixedRole="TEACHER"
          title={t('academy.admin.newTeacher')}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
