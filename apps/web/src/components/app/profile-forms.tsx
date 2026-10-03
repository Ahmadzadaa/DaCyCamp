'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { KeyRound, Monitor, Moon, Palette, Sun, Target, UserRound } from 'lucide-react';
import type { PublicUser } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';

const GOALS = [3, 5, 8, 12, 20];
const THEMES = [
  { value: 'light', label: 'shell.themeLight', icon: Sun },
  { value: 'dark', label: 'shell.themeDark', icon: Moon },
  { value: 'system', label: 'shell.themeSystem', icon: Monitor },
] as const;

export function ProfileForms({ user }: { user: PublicUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [name, setName] = useState(user.name);
  const [goal, setGoal] = useState(user.weeklyGoal);
  const [visible, setVisible] = useState(user.showOnLeaderboard);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function patchMe(body: Record<string, unknown>, key: string, msg: string) {
    setBusy(key);
    try {
      await api('/me', { method: 'PATCH', body });
      toast.success(msg);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('pw');
    try {
      await api('/me/password', { method: 'PATCH', body: { current: cur, next } });
      toast.success(t('auth.passwordChanged'));
      setCur('');
      setNext('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void patchMe({ name }, 'name', t('auth.profileSaved'));
        }}
        className="box flex flex-col gap-4"
      >
        <h2 className="box-h">
          <UserRound aria-hidden />
          {t('profile.personal')}
        </h2>
        <Field label={t('common.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
        </Field>
        <Field label={t('common.email')}>
          <Input value={user.email} disabled />
        </Field>
        <div>
          <Button type="submit" loading={busy === 'name'}>
            {t('common.save')}
          </Button>
        </div>
      </form>

      <section className="box flex flex-col gap-4" aria-labelledby="goal-h">
        <h2 id="goal-h" className="box-h">
          <Target aria-hidden />
          {t('profile.goalTitle')}
        </h2>
        <p className="text-sm text-muted">{t('profile.goalHint')}</p>
        <div className="chips" role="radiogroup" aria-label={t('profile.goalTitle')}>
          {GOALS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={goal === n}
              className={cn('chip', goal === n && 'on')}
              disabled={busy === 'goal'}
              onClick={async () => {
                const prev = goal;
                setGoal(n);
                if (!(await patchMe({ weeklyGoal: n }, 'goal', t('profile.goalSaved'))))
                  setGoal(prev);
              }}
            >
              {t('profile.goalOption', { n })}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-start justify-between gap-4 border-t border-line pt-4">
          <span>
            <b className="block text-[0.95rem]">{t('profile.leaderboard')}</b>
            <span className="text-sm text-muted">{t('profile.leaderboardHint')}</span>
          </span>
          <Switch
            checked={visible}
            disabled={busy === 'lb'}
            onCheckedChange={async (v) => {
              setVisible(v);
              if (!(await patchMe({ showOnLeaderboard: v }, 'lb', t('auth.profileSaved'))))
                setVisible(!v);
            }}
            aria-label={t('profile.leaderboard')}
          />
        </label>
      </section>

      <form onSubmit={savePassword} className="box flex flex-col gap-4">
        <h2 className="box-h">
          <KeyRound aria-hidden />
          {t('profile.security')}
        </h2>
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
        <div>
          <Button type="submit" variant="dark" loading={busy === 'pw'}>
            {t('auth.changePassword')}
          </Button>
        </div>
      </form>

      <section className="box flex flex-col gap-4" aria-labelledby="look-h">
        <h2 id="look-h" className="box-h">
          <Palette aria-hidden />
          {t('profile.appearance')}
        </h2>
        <div className="theme-picks" role="radiogroup" aria-label={t('shell.themeTitle')}>
          {THEMES.map((th) => (
            <button
              key={th.value}
              type="button"
              role="radio"
              aria-checked={mounted && (theme ?? 'system') === th.value}
              className="theme-pick"
              onClick={() => setTheme(th.value)}
            >
              <span className={cn('theme-swatch', th.value)} aria-hidden />
              <span className="flex items-center gap-2">
                <th.icon aria-hidden className="size-4" />
                {t(th.label)}
              </span>
            </button>
          ))}
        </div>
        <Field label={t('common.language')} hint="İngilis dili sonrakı mərhələdə">
          <Select value="az" disabled>
            <option value="az">Azərbaycan dili</option>
          </Select>
        </Field>
      </section>
    </div>
  );
}
