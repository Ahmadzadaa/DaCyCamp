'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Compass, GraduationCap, Users } from 'lucide-react';
import {
  academyJoinCodeSchema,
  academyJoinRegisterSchema,
  isLocale,
  type AcademyJoinPreviewDto,
  type AcademyJoinRegisterInput,
  type PublicUser,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { syncLocaleAfterLogin } from '@/components/app/language-switcher';
import { AuthForm, BackToChoice } from '@/components/app/auth-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

type Path = 'camp' | 'academy';

/**
 * Qeydiyyat: əvvəlcə yol seçilir. Camp — adi qeydiyyat (yalnız kurslar). Akademiya — admin verdiyi qrup kodu
 * ilə: hesab yaranır, tələbə birbaşa həmin qrupa düşür, Camp da açıq qalır.
 * `?kod=` ilə gələn link Akademiya formasını kod yazılmış halda açır.
 */
export function RegisterFlow({
  next,
  academyEnabled,
  initialCode,
}: {
  next?: string;
  academyEnabled: boolean;
  initialCode?: string;
}) {
  const [path, setPath] = useState<Path | null>(
    !academyEnabled ? 'camp' : initialCode ? 'academy' : null,
  );
  if (path === 'camp')
    return (
      <AuthForm
        mode="register"
        next={next}
        onBack={academyEnabled ? () => setPath(null) : undefined}
      />
    );
  if (path === 'academy')
    return <AcademyRegisterForm initialCode={initialCode} onBack={() => setPath(null)} />;
  return <PathChoice next={next} onContinue={setPath} />;
}

const PATHS = [
  { id: 'camp', icon: Compass, color: '#12B886', title: 'auth.campTitle', text: 'auth.campText' },
  {
    id: 'academy',
    icon: GraduationCap,
    color: '#0A84FF',
    title: 'auth.academyTitle',
    text: 'auth.academyText',
  },
] as const;

/** Yol seçimi: üstünə gəlinən kart öz rəngini alıb qalxır (kölgə, rəngli çərçivə); basanda forma açılır */
function PathChoice({ next, onContinue }: { next?: string; onContinue: (p: Path) => void }) {
  return (
    <div className="flex flex-col gap-4" data-testid="register-choice">
      <div className="mb-2">
        <h1 className="text-[32px] font-bold tracking-[-0.01em]">{t('auth.choiceTitle')}</h1>
        <p className="mt-2 text-muted">{t('auth.choiceSubtitle')}</p>
      </div>
      <div className="flex flex-col gap-3">
        {PATHS.map((o) => (
          <button
            key={o.id}
            type="button"
            className="reg-choice"
            style={{ ['--ic' as string]: o.color }}
            onClick={() => onContinue(o.id)}
            data-testid={`choose-${o.id}`}
          >
            <span className="reg-choice-ic">
              <o.icon aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <b>{t(o.title)}</b>
              <span>{t(o.text)}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link
          href={`/giris${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-ink underline"
        >
          {t('auth.login')}
        </Link>
      </p>
    </div>
  );
}

function AcademyRegisterForm({
  initialCode,
  onBack,
}: {
  initialCode?: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AcademyJoinPreviewDto | null>(null);
  const [checking, setChecking] = useState(false);
  const form = useForm<AcademyJoinRegisterInput>({
    resolver: zodResolver(academyJoinRegisterSchema),
    defaultValues: { name: '', email: '', password: '', code: initialCode ?? '' },
  });
  const { register, handleSubmit, formState, getValues, setError: setFieldError } = form;

  async function check() {
    const parsed = academyJoinCodeSchema.safeParse(getValues('code'));
    if (!parsed.success) {
      setPreview(null);
      setFieldError('code', { message: parsed.error.issues[0]?.message });
      return;
    }
    setChecking(true);
    try {
      setPreview(
        await api<AcademyJoinPreviewDto>('/academy/join/check', {
          method: 'POST',
          body: { code: parsed.data },
        }),
      );
      form.clearErrors('code');
    } catch (e) {
      setPreview(null);
      setFieldError('code', { message: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(values: AcademyJoinRegisterInput) {
    setError(null);
    try {
      const r = await api<{ user: PublicUser }>('/academy/join/register', {
        method: 'POST',
        body: values,
      });
      const target = '/akademiya';
      if (syncLocaleAfterLogin(isLocale(r.user.locale) ? r.user.locale : undefined))
        window.location.assign(target);
      else router.push(target);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const codeField = register('code');
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
      data-testid="academy-register"
    >
      <div className="mb-2">
        <BackToChoice onBack={onBack} />
        <h1 className="text-[32px] font-bold tracking-[-0.01em]">
          {t('auth.academyRegisterTitle')}
        </h1>
        <p className="mt-2 text-muted">{t('auth.academyRegisterSubtitle')}</p>
      </div>
      <Field
        label={t('auth.joinCode')}
        hint={t('auth.joinCodeHint')}
        error={formState.errors.code?.message}
      >
        <div className="flex gap-2">
          <Input
            {...codeField}
            onChange={(e) => {
              setPreview(null);
              void codeField.onChange(e);
            }}
            onBlur={(e) => {
              void codeField.onBlur(e);
              if (e.target.value.trim()) void check();
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono uppercase tracking-[0.12em]"
            invalid={!!formState.errors.code}
            data-testid="join-code"
          />
          <Button type="button" variant="ghost" onClick={check} loading={checking}>
            {t('auth.checkCode')}
          </Button>
        </div>
      </Field>
      {preview ? (
        <div className="reg-group" data-testid="join-preview">
          <span className="reg-choice-ic" style={{ ['--ic' as string]: '#0A84FF' }}>
            <Users aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="reg-group-k">{t('auth.joinGroup')}</span>
            <b>
              {preview.group.code} · {preview.group.name}
            </b>
            <span className="reg-group-p">{preview.program.title}</span>
          </span>
        </div>
      ) : null}
      <Field label={t('auth.name')} error={formState.errors.name?.message}>
        <Input {...register('name')} autoComplete="name" invalid={!!formState.errors.name} />
      </Field>
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
        hint={t('auth.passwordHint')}
        error={formState.errors.password?.message}
      >
        <Input
          type="password"
          {...register('password')}
          autoComplete="new-password"
          invalid={!!formState.errors.password}
        />
      </Field>
      {error ? (
        <div role="alert" className="dlg-alert">
          {error}
        </div>
      ) : null}
      <Button type="submit" loading={formState.isSubmitting} size="full">
        {t('auth.register')}
      </Button>
      <p className="text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link href="/giris" className="font-semibold text-ink underline">
          {t('auth.login')}
        </Link>
      </p>
    </form>
  );
}

/** Daxil olmuş istifadəçi üçün: kodla qrupa qoşulma (akademiya boş səhifəsi və profil) */
export function JoinGroupForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = academyJoinCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ groupCode: string; groupName: string }>('/academy/join', {
        method: 'POST',
        body: { code: parsed.data },
      });
      toast.success(t('academy.join.joined', { group: r.groupCode }));
      router.push('/akademiya');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate data-testid="join-form">
      {!compact ? <p className="text-sm text-muted">{t('academy.join.text')}</p> : null}
      <Field label={t('auth.joinCode')} hint={t('auth.joinCodeHint')} error={error ?? undefined}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-[0.12em]"
          invalid={!!error}
          data-testid="join-code"
        />
      </Field>
      <Button type="submit" loading={busy} className="self-start">
        {t('academy.join.submit')}
      </Button>
    </form>
  );
}
