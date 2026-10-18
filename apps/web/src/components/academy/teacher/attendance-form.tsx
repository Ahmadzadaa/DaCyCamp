'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, CheckCheck, Clock } from 'lucide-react';
import {
  ACADEMY_ATTENDANCE_STATUSES,
  type AcademyAttendanceRowDto,
  type AcademyAttendanceStatus,
  type AcademySessionDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EnrollmentBadge } from '../badges';
import { fromLocalInput, toLocalInput } from '../format';

/** Davamiyyət: hər tələbə üçün vəziyyət; toplu saxlama (upsert) */
export function AttendanceForm({
  sessionId,
  rows,
}: {
  sessionId: string;
  rows: AcademyAttendanceRowDto[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, AcademyAttendanceStatus | null>>(() =>
    Object.fromEntries(rows.map((r) => [r.student.id, r.status])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.student.id, r.note ?? ''])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marked = Object.entries(state).filter(([, v]) => v) as Array<
    [string, AcademyAttendanceStatus]
  >;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/academy/sessions/${sessionId}/attendance`, {
        method: 'PUT',
        body: {
          records: marked.map(([studentId, status]) => ({
            studentId,
            status,
            ...(notes[studentId] ? { note: notes[studentId] } : {}),
          })),
        },
      });
      toast.success(t('academy.sessions.attendanceSaved'));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="attendance-form">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() =>
          setState((s) =>
            Object.fromEntries(
              Object.keys(s).map((k) => [
                k,
                rows.find((r) => r.student.id === k)?.enrollmentStatus === 'ACTIVE'
                  ? 'PRESENT'
                  : (s[k] ?? null),
              ]),
            ),
          )
        }
      >
        <CheckCheck className="size-4" />
        {t('academy.sessions.markAll')}
      </Button>
      <ul className="sup-list">
        {rows.map((r) => (
          <li
            key={r.student.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex min-w-0 items-center gap-2">
              <b className="truncate">{r.student.name}</b>
              {r.enrollmentStatus !== 'ACTIVE' ? (
                <EnrollmentBadge status={r.enrollmentStatus} />
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="ac-att" role="group" aria-label={r.student.name}>
                {ACADEMY_ATTENDANCE_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={state[r.student.id] === st}
                    onClick={() => setState((s) => ({ ...s, [r.student.id]: st }))}
                    data-testid={`att-${st}`}
                  >
                    {t(`academy.attendanceStatus.${st}`)}
                  </button>
                ))}
              </span>
              <Input
                className="w-40"
                value={notes[r.student.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [r.student.id]: e.target.value }))}
                placeholder={t('academy.f.note')}
                aria-label={`${t('academy.f.note')} · ${r.student.name}`}
                maxLength={500}
              />
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-error-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        onClick={save}
        loading={busy}
        disabled={!marked.length}
        className="self-start"
        data-testid="attendance-save"
      >
        {t('academy.sessions.saveAttendance')}
      </Button>
    </div>
  );
}

/** Dərsin vaxtını dəyişmək / ləğv etmək (aparıcı / admin) */
export function SessionActions({ session }: { session: AcademySessionDto }) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState(toLocalInput(session.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(session.endsAt));
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  async function patch(key: string, body: Record<string, unknown>) {
    setBusy(key);
    try {
      await api(`/academy/sessions/${session.id}`, { method: 'PATCH', body });
      toast.success(t('academy.sessions.saved'));
      setConfirm(false);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  if (session.status === 'CANCELLED') return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('academy.f.start')}>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label={t('academy.f.end')}>
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="navy"
          loading={busy === 'move'}
          onClick={() =>
            patch('move', { startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt) })
          }
        >
          <Clock className="size-4" />
          {t('academy.sessions.reschedule')}
        </Button>
        <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>
          <Ban className="size-4" />
          {t('academy.sessions.cancelSession')}
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          tone="danger"
          title={t('academy.sessions.cancelSession')}
          description={t('academy.sessions.cancelConfirm')}
        >
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="dangerSolid"
              loading={busy === 'cancel'}
              onClick={() => patch('cancel', { status: 'CANCELLED' })}
            >
              {t('academy.sessions.cancelSession')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
