'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Repeat } from 'lucide-react';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { fromLocalInput } from '../format';

/** Dərs yaratmaq: tək dərs (brauzer vaxtı) və ya həftəlik cədvəl (qrupun vaxt zonası) */
export function SessionForms({ groupId, timezone }: { groupId: string; timezone: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'single' | 'series'>('single');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('19:00');
  const [duration, setDuration] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'single') {
        await api(`/academy/groups/${groupId}/sessions`, {
          method: 'POST',
          body: {
            title,
            startsAt: fromLocalInput(startsAt),
            endsAt: fromLocalInput(endsAt),
            meetingUrl: meetingUrl || null,
          },
        });
        toast.success(t('academy.sessions.saved'));
      } else {
        const r = await api<unknown[]>(`/academy/groups/${groupId}/sessions/series`, {
          method: 'POST',
          body: {
            title,
            startDate,
            endDate,
            weekdays,
            startTime,
            durationMinutes: duration,
            meetingUrl: meetingUrl || null,
          },
        });
        toast.success(t('academy.sessions.created', { n: r.length }));
      }
      setTitle('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="session-form">
      <div className="flex gap-2">
        <button
          type="button"
          className={cn('chip', mode === 'single' && 'on')}
          onClick={() => setMode('single')}
        >
          <CalendarPlus className="size-4" aria-hidden /> {t('academy.sessions.new')}
        </button>
        <button
          type="button"
          className={cn('chip', mode === 'series' && 'on')}
          onClick={() => setMode('series')}
        >
          <Repeat className="size-4" aria-hidden /> {t('academy.sessions.series')}
        </button>
      </div>
      <Field label={t('academy.f.title')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </Field>
      {mode === 'single' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('academy.f.start')}>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </Field>
          <Field label={t('academy.f.end')}>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </Field>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('academy.f.startDate')}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Field>
            <Field label={t('academy.f.endDate')}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">{t('academy.sessions.weekdays')}</legend>
            <div className="ac-att">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={weekdays.includes(d)}
                  onClick={() =>
                    setWeekdays((w) =>
                      w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort(),
                    )
                  }
                >
                  {t(`academy.sessions.wd${d}` as TKey)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t('academy.sessions.startTime')} · ${timezone}`}>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </Field>
            <Field label={t('academy.sessions.duration')}>
              <Input
                type="number"
                min={15}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </Field>
          </div>
        </>
      )}
      <Field label={t('academy.f.meetingUrl')}>
        <Input
          type="url"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://"
        />
      </Field>
      {error ? (
        <p className="text-sm text-error-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy} disabled={!title.trim()} className="self-start">
        {t('common.save')}
      </Button>
    </form>
  );
}
