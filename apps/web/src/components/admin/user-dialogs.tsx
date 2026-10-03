'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { ROLES, createUserSchema, type PublicUser, type Role } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';

/** Admin: yeni hesab (ad, e-poçt, şifrə, rol) — dərhal aktiv */
export function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (u: PublicUser) => void;
}) {
  const [v, setV] = useState({ name: '', email: '', password: '', role: 'STUDENT' as Role });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createUserSchema.safeParse(v);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof typeof v] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const u = await api<PublicUser>('/admin/users', { method: 'POST', body: parsed.data });
      toast.success(t('users.created'));
      onCreated(u);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('users.createTitle')}
        description={t('users.createDesc')}
        icon={<UserPlus />}
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label={t('users.name')} error={errors.name}>
            <Input
              value={v.name}
              onChange={set('name')}
              autoComplete="off"
              invalid={!!errors.name}
            />
          </Field>
          <Field label={t('users.email')} error={errors.email}>
            <Input
              type="email"
              value={v.email}
              onChange={set('email')}
              autoComplete="off"
              invalid={!!errors.email}
            />
          </Field>
          <Field label={t('users.password')} hint={t('users.passwordHint')} error={errors.password}>
            <Input
              type="text"
              value={v.password}
              onChange={set('password')}
              autoComplete="new-password"
              className="font-mono"
              invalid={!!errors.password}
            />
          </Field>
          <Field label={t('users.role')}>
            <Select value={v.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" loading={busy}>
              {t('users.new')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
