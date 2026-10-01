'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import type { PublicUser } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

export function ProfileForms({ user }: { user: PublicUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user.name);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy('name');
    try {
      await api('/me', { method: 'PATCH', body: { name } });
      toast(t('auth.profileSaved'));
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('pw');
    try {
      await api('/me/password', { method: 'PATCH', body: { current: cur, next } });
      toast(t('auth.passwordChanged'));
      setCur('');
      setNext('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={saveName} className="box grid gap-4 md:grid-cols-2">
        <Field label={t('common.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
        </Field>
        <Field label={t('common.email')}>
          <Input value={user.email} disabled />
        </Field>
        <Field label={t('common.role')}>
          <Input value={t(`role.${user.role}`)} disabled />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={busy === 'name'}>
            {t('common.save')}
          </Button>
        </div>
      </form>
      <form onSubmit={savePassword} className="box grid gap-4 md:grid-cols-2">
        <Field label={t('auth.currentPassword')}>
          <Input
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" variant="dark" loading={busy === 'pw'}>
            {t('auth.changePassword')}
          </Button>
        </div>
      </form>
      <div className="box grid gap-4 md:grid-cols-2">
        <Field label={t('common.theme')}>
          <Select value={theme ?? 'system'} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">{t('common.themeLight')}</option>
            <option value="dark">{t('common.themeDark')}</option>
            <option value="system">{t('common.themeSystem')}</option>
          </Select>
        </Field>
        <Field label={t('common.language')} hint="İngilis dili sonrakı mərhələdə">
          <Select value="az" disabled>
            <option value="az">Azərbaycan dili</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}
