'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { errorMessage } from '@/lib/errors-i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [token, setToken] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (reset) {
      const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
      setToken(value);
      if (!/^[a-f0-9]{64}$/.test(value)) setError(t('reliability.invalidLink'));
    }
  }, [reset]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (reset && password !== repeat) {
      setError(t('reliability.mismatch'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(reset ? '/auth/password-reset/confirm' : '/auth/password-reset/request', {
        method: 'POST',
        body: reset ? { token, password } : { email },
      });
      setDone(true);
      setPassword('');
      setRepeat('');
      if (reset) window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-md flex-col gap-5"
      data-testid="password-recovery"
    >
      <div>
        <KeyRound className="mb-4 size-8 text-brand" />
        <h1 className="text-3xl font-bold">
          {t(reset ? 'reliability.resetTitle' : 'reliability.recoverTitle')}
        </h1>
        <p className="mt-2 text-muted">
          {t(reset ? 'reliability.resetHint' : 'reliability.recoverHint')}
        </p>
      </div>
      {done ? (
        <p role="status" className="rounded-xl bg-soft p-4">
          {t(reset ? 'reliability.resetDone' : 'reliability.sent')}
        </p>
      ) : (
        <>
          {reset ? (
            <>
              <Field label={t('reliability.newPassword')}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label={t('reliability.repeatPassword')}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field label={t('auth.email')}>
              <Input
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          {error ? (
            <p role="alert" className="dlg-alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="full" loading={busy} disabled={reset && !token}>
            {t(reset ? 'reliability.reset' : 'reliability.sendLink')}
          </Button>
        </>
      )}
      <Link href="/giris" className="text-center underline">
        {t('reliability.backLogin')}
      </Link>
      {reset && !done ? (
        <Link href="/sifre-berpa" className="text-center text-sm underline">
          {t('reliability.sendLink')}
        </Link>
      ) : null}
    </form>
  );
}
