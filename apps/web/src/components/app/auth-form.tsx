'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isLogin = mode === 'login';
  const form = useForm<RegisterInput>({
    resolver: zodResolver(
      isLogin ? (loginSchema as unknown as typeof registerSchema) : registerSchema,
    ),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { register, handleSubmit, formState } = form;

  async function onSubmit(values: RegisterInput | LoginInput) {
    setError(null);
    try {
      await api(isLogin ? '/auth/login' : '/auth/register', { method: 'POST', body: values });
      const target = next && next.startsWith('/') ? next : isLogin ? '/panel' : '/baslangic';
      router.push(target);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-2xl">{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
        </p>
      </div>
      {!isLogin ? (
        <Field label={t('auth.name')} error={formState.errors.name?.message}>
          <Input {...register('name')} autoComplete="name" invalid={!!formState.errors.name} />
        </Field>
      ) : null}
      <Field label={t('auth.email')} error={formState.errors.email?.message}>
        <Input
          type="email"
          {...register('email')}
          autoComplete="email"
          invalid={!!formState.errors.email}
        />
      </Field>
      <Field
        label={t('auth.password')}
        hint={isLogin ? undefined : t('auth.passwordHint')}
        error={formState.errors.password?.message}
      >
        <Input
          type="password"
          {...register('password')}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          invalid={!!formState.errors.password}
        />
      </Field>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
        >
          {error}
        </div>
      ) : null}
      <Button type="submit" loading={formState.isSubmitting} size="full">
        {isLogin ? t('auth.login') : t('auth.register')}
      </Button>
      <p className="text-center text-sm text-muted">
        {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <Link
          href={
            isLogin
              ? `/qeydiyyat${next ? `?next=${encodeURIComponent(next)}` : ''}`
              : `/giris${next ? `?next=${encodeURIComponent(next)}` : ''}`
          }
          className="font-semibold text-ink underline"
        >
          {isLogin ? t('auth.register') : t('auth.login')}
        </Link>
      </p>
    </form>
  );
}
