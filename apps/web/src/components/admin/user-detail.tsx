'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Award,
  BookOpen,
  ChevronLeft,
  KeyRound,
  Route,
  RotateCcw,
  Trash2,
  UserMinus,
  UserRound,
  Zap,
} from 'lucide-react';
import { ROLES, updateUserSchema, type AdminUserDetailDto, type Role } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn, fmtNum, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { useAdmin } from './admin-context';
import { ConfirmDialog } from './confirm-dialog';
import { fmtAgo, fmtDate } from './format';

type Enrollment = AdminUserDetailDto['enrollments'][number];
type Cert = AdminUserDetailDto['certificates'][number];
type Pending =
  { kind: 'unenroll' | 'reset'; e: Enrollment } | { kind: 'revoke'; c: Cert } | { kind: 'delete' };

/**
 * Admin: istifadəçi kartı — profil (ad, e-poçt, rol), şifrə, kurslar (yaz / çıxar / sıfırla),
 * yollar, sertifikatlar (ləğv / bərpa), hesabı silmək. Müəllim yalnız baxır.
 */
export function UserDetail({
  initial,
  courses,
  meId,
}: {
  initial: AdminUserDetailDto;
  courses: Array<{ id: string; title: string }>;
  meId: string;
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [u, setU] = useState(initial);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const isMe = u.id === meId;

  async function reload() {
    try {
      setU(await api<AdminUserDetailDto>(`/admin/users/${u.id}`));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setPendingError(null);
    try {
      if (pending.kind === 'unenroll') {
        await api(`/admin/courses/${pending.e.courseId}/students/${u.id}`, { method: 'DELETE' });
        toast.success(t('users.unenrolled'));
      } else if (pending.kind === 'reset') {
        await api(`/admin/courses/${pending.e.courseId}/students/${u.id}/reset`, {
          method: 'POST',
        });
        toast.success(t('users.resetDone'));
      } else if (pending.kind === 'revoke') {
        await api(`/admin/certificates/${pending.c.id}/revoke`, { method: 'POST' });
        toast.success(t('users.revokeDone'));
      } else {
        await api(`/admin/users/${u.id}`, { method: 'DELETE' });
        toast.success(t('users.deleted'));
        router.push('/admin/telebeler');
        return;
      }
      setPending(null);
      await reload();
    } catch (e) {
      setPendingError(errorMessage(e));
    }
  }

  async function restoreCert(c: Cert) {
    try {
      await api(`/admin/certificates/${c.id}/restore`, { method: 'POST' });
      toast.success(t('users.restoreDone'));
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="user-detail">
      <Link href="/admin/telebeler" className="crumb-back">
        <ChevronLeft aria-hidden />
        {t('users.back')}
      </Link>

      <header className="ud-head">
        <span className="avatar lg">{initials(u.name)}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[1.75rem] font-bold">{u.name}</h1>
            <span
              className={cn(
                'badge',
                u.role === 'ADMIN'
                  ? 'badge-err'
                  : u.role === 'INSTRUCTOR'
                    ? 'badge-warn'
                    : 'badge-muted',
              )}
            >
              {t(`role.${u.role}`)}
            </span>
            {isMe ? <span className="badge badge-ok">{t('users.you')}</span> : null}
          </div>
          <p className="truncate text-muted">{u.email}</p>
          <p className="mt-1 text-sm text-muted">
            {t('users.joined')}: {fmtDate(u.createdAt)} · {t('users.lastActive')}:{' '}
            <span suppressHydrationWarning>
              {u.lastActiveAt ? fmtAgo(u.lastActiveAt) : t('users.never')}
            </span>
          </p>
        </div>
        <div className="ud-stats">
          <div>
            <Zap aria-hidden />
            <b>{fmtNum(u.xpTotal)}</b>
            <span>{t('users.statXp')}</span>
          </div>
          <div>
            <BookOpen aria-hidden />
            <b>{u.enrollmentCount}</b>
            <span>{t('users.statCourses', { n: u.enrollmentCount })}</span>
          </div>
          <div>
            <Award aria-hidden />
            <b>{u.certificateCount}</b>
            <span>{t('users.statCerts', { n: u.certificateCount })}</span>
          </div>
        </div>
      </header>

      <div className="ud-grid">
        <div className="flex min-w-0 flex-col gap-6">
          <EnrollmentsCard
            u={u}
            courses={courses}
            isAdmin={isAdmin}
            onChanged={reload}
            onAsk={(p) => {
              setPendingError(null);
              setPending(p);
            }}
          />

          <section className="box" aria-labelledby="ud-paths">
            <h2 id="ud-paths" className="box-h">
              <Route aria-hidden />
              {t('users.paths')}
            </h2>
            {u.paths.length ? (
              <ul className="flex flex-col gap-2">
                {u.paths.map((p) => (
                  <li key={p.slug} className="flex items-center gap-3 text-sm">
                    <span className="cdot-lg" style={{ ['--c' as string]: p.trackColor }} />
                    <Link
                      href={`/admin/yollar/${p.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {p.title}
                    </Link>
                    <span className="ml-auto text-muted">{fmtDate(p.enrolledAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('users.pathsEmpty')}</p>
            )}
          </section>

          <section className="box" aria-labelledby="ud-certs">
            <h2 id="ud-certs" className="box-h">
              <Award aria-hidden />
              {t('users.certs')}
            </h2>
            {u.certificates.length ? (
              <ul className="ud-list">
                {u.certificates.map((c) => (
                  <li key={c.id} data-testid={`cert-${c.serial}`}>
                    <div className="min-w-0">
                      <Link
                        href={`/sertifikat/${c.id}`}
                        target="_blank"
                        className="block truncate font-semibold hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="font-mono text-xs text-muted">
                        {c.serial} · {fmtDate(c.issuedAt)}
                      </span>
                    </div>
                    <span className={cn('badge', c.revokedAt ? 'badge-err' : 'badge-ok')}>
                      {c.revokedAt ? t('users.revoked') : t('users.valid')}
                    </span>
                    {isAdmin ? (
                      c.revokedAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreCert(c)}
                        >
                          <RotateCcw aria-hidden />
                          {t('users.restore')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPendingError(null);
                            setPending({ kind: 'revoke', c });
                          }}
                        >
                          {t('users.revoke')}
                        </Button>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('users.certsEmpty')}</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <ProfileCard u={u} isAdmin={isAdmin} isMe={isMe} onSaved={reload} />
          {isAdmin ? <PasswordCard userId={u.id} /> : null}
          {isAdmin && !isMe ? (
            <section className="box ud-danger" aria-labelledby="ud-danger">
              <h2 id="ud-danger" className="box-h">
                <Trash2 aria-hidden />
                {t('users.danger')}
              </h2>
              <p className="text-sm text-muted">{t('users.deleteDesc')}</p>
              <Button
                type="button"
                variant="dangerSolid"
                className="mt-3 w-full"
                onClick={() => {
                  setPendingError(null);
                  setPending({ kind: 'delete' });
                }}
                data-testid="user-delete"
              >
                <Trash2 aria-hidden />
                {t('users.deleteBtn')}
              </Button>
            </section>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === 'unenroll'
            ? t('users.unenrollTitle', { course: pending.e.title })
            : pending?.kind === 'reset'
              ? t('users.resetTitle', { course: pending.e.title })
              : pending?.kind === 'revoke'
                ? t('users.revokeTitle', { serial: pending.c.serial })
                : t('users.deleteConfirmTitle', { name: u.name })
        }
        description={
          pending?.kind === 'unenroll'
            ? t('users.unenrollDesc')
            : pending?.kind === 'reset'
              ? t('users.resetDesc')
              : pending?.kind === 'revoke'
                ? t('users.revokeDesc')
                : t('users.deleteDesc')
        }
        confirmLabel={
          pending?.kind === 'unenroll'
            ? t('users.unenroll')
            : pending?.kind === 'reset'
              ? t('users.reset')
              : pending?.kind === 'revoke'
                ? t('users.revoke')
                : t('users.deleteBtn')
        }
        confirmText={pending?.kind === 'delete' ? u.email : undefined}
        error={pendingError}
        onConfirm={confirmPending}
      />
    </div>
  );
}

function EnrollmentsCard({
  u,
  courses,
  isAdmin,
  onChanged,
  onAsk,
}: {
  u: AdminUserDetailDto;
  courses: Array<{ id: string; title: string }>;
  isAdmin: boolean;
  onChanged: () => Promise<void>;
  onAsk: (p: Pending) => void;
}) {
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const enrolledIds = new Set(u.enrollments.map((e) => e.courseId));
  const available = courses.filter((c) => !enrolledIds.has(c.id));

  async function enroll() {
    if (!pick) return;
    setBusy(true);
    try {
      await api(`/admin/courses/${pick}/students/${u.id}`, { method: 'POST' });
      toast.success(t('users.enrolled'));
      setPick('');
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="box" aria-labelledby="ud-courses">
      <h2 id="ud-courses" className="box-h">
        <BookOpen aria-hidden />
        {t('users.courses')}
      </h2>
      {u.enrollments.length ? (
        <ul className="ud-list">
          {u.enrollments.map((e) => (
            <li key={e.courseId} data-testid={`enr-${e.slug}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="cdot-lg" style={{ ['--c' as string]: e.trackColor }} />
                  <Link
                    href={`/admin/kurslar/${e.slug}?tab=telebeler`}
                    className="truncate font-semibold hover:underline"
                  >
                    {e.title}
                  </Link>
                  {e.deleted ? (
                    <span className="badge badge-err">{t('users.deletedCourse')}</span>
                  ) : null}
                  {e.completedAt ? <span className="badge badge-ok">{t('users.done')}</span> : null}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="nbar flex-1" aria-hidden>
                    <i style={{ width: `${e.percent}%` }} />
                  </span>
                  <b className="w-10 text-right text-sm">{e.percent}%</b>
                </div>
                <span className="text-xs text-muted" suppressHydrationWarning>
                  {fmtDate(e.enrolledAt)} · {t('users.lastActive')}: {fmtAgo(e.lastActivityAt)}
                </span>
              </div>
              {isAdmin ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="ib"
                    title={t('users.reset')}
                    aria-label={`${t('users.reset')}: ${e.title}`}
                    onClick={() => onAsk({ kind: 'reset', e })}
                  >
                    <RotateCcw aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    title={t('users.unenroll')}
                    aria-label={`${t('users.unenroll')}: ${e.title}`}
                    onClick={() => onAsk({ kind: 'unenroll', e })}
                  >
                    <UserMinus aria-hidden />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t('users.coursesEmpty')}</p>
      )}
      {isAdmin && available.length ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <Select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 flex-1"
            aria-label={t('users.enroll')}
            data-testid="enroll-pick"
          >
            <option value="">{t('users.enrollPick')}</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={enroll} disabled={!pick} loading={busy}>
            {t('users.enroll')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ProfileCard({
  u,
  isAdmin,
  isMe,
  onSaved,
}: {
  u: AdminUserDetailDto;
  isAdmin: boolean;
  isMe: boolean;
  onSaved: () => Promise<void>;
}) {
  const [v, setV] = useState({ name: u.name, email: u.email, role: u.role as Role });
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email', string>>>({});
  const [busy, setBusy] = useState(false);
  const dirty = v.name !== u.name || v.email !== u.email || v.role !== u.role;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (v.name !== u.name) body.name = v.name;
    if (v.email !== u.email) body.email = v.email;
    if (v.role !== u.role) body.role = v.role;
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (k === 'name' || k === 'email') next[k] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: parsed.data });
      toast.success(t('users.saved'));
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="box" aria-labelledby="ud-profile">
      <h2 id="ud-profile" className="box-h">
        <UserRound aria-hidden />
        {t('users.profile')}
      </h2>
      <form onSubmit={save} className="flex flex-col gap-3" noValidate>
        <Field label={t('users.name')} error={errors.name}>
          <Input
            value={v.name}
            onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))}
            disabled={!isAdmin}
            invalid={!!errors.name}
          />
        </Field>
        <Field label={t('users.email')} error={errors.email}>
          <Input
            type="email"
            value={v.email}
            onChange={(e) => setV((x) => ({ ...x, email: e.target.value }))}
            disabled={!isAdmin}
            invalid={!!errors.email}
          />
        </Field>
        <Field label={t('users.role')}>
          <Select
            value={v.role}
            onChange={(e) => setV((x) => ({ ...x, role: e.target.value as Role }))}
            disabled={!isAdmin || isMe}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        {isAdmin ? (
          <Button type="submit" disabled={!dirty} loading={busy} className="mt-1">
            {t('users.save')}
          </Button>
        ) : (
          <p className="text-xs text-muted">{t('users.readOnly')}</p>
        )}
      </form>
    </section>
  );
}

function PasswordCard({ userId }: { userId: string }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const short = pw.length > 0 && pw.length < 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return;
    setBusy(true);
    try {
      await api(`/admin/users/${userId}/password`, { method: 'POST', body: { password: pw } });
      toast.success(t('users.passwordDone'));
      setPw('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="box" aria-labelledby="ud-pw">
      <h2 id="ud-pw" className="box-h">
        <KeyRound aria-hidden />
        {t('users.passwordTitle')}
      </h2>
      <p className="mb-3 text-sm text-muted">{t('users.passwordDesc')}</p>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <Field
          label={t('users.passwordNew')}
          hint={t('users.passwordHint')}
          error={short ? t('users.passwordHint') : undefined}
        >
          <Input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            className="font-mono"
            invalid={short}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={pw.length < 8} loading={busy}>
          {t('users.passwordSet')}
        </Button>
      </form>
    </section>
  );
}
