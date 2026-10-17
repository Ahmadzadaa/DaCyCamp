import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Video } from 'lucide-react';
import type { AcademyAction, AcademyAttendanceRowDto, AcademySessionDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { ClassStatusBadge } from '@/components/academy/badges';
import { fmtZoned } from '@/components/academy/format';
import { AttendanceForm, SessionActions } from '@/components/academy/teacher/attendance-form';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.sessions.attendance')} · ${t('academy.teacherTitle')}` };
}

interface SessionView {
  session: AcademySessionDto;
  group: { id: string; code: string; name: string; timezone: string };
  permissions: AcademyAction[];
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await apiTry<SessionView>(`/academy/sessions/${id}`);
  if (!v || !v.permissions.includes('attendance.manage')) notFound();
  const rows =
    (await apiTry<AcademyAttendanceRowDto[]>(`/academy/sessions/${id}/attendance`)) ?? [];
  const s = v.session;
  const started = new Date(s.startsAt).getTime() - 15 * 60_000 <= Date.now();
  return (
    <>
      <Link href={`/muellim/qruplar/${v.group.id}?tab=sessions`} className="back-link">
        <ArrowLeft aria-hidden />
        {v.group.code} · {v.group.name}
      </Link>
      <div className="ph1 !mb-0">
        <div className="min-w-0">
          <h1>{s.title}</h1>
          <p className="flex flex-wrap items-center gap-2">
            <span>{fmtZoned(s.startsAt, { tz: v.group.timezone })}</span>
            <span>({v.group.timezone})</span>
            <ClassStatusBadge status={s.status} />
          </p>
        </div>
        {s.meetingUrl ? (
          <div className="ph1-act">
            <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="b b-ghost">
              <Video aria-hidden />
              {t('academy.f.meetingUrl')}
            </a>
          </div>
        ) : null}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="box" aria-labelledby="s-att">
          <h2 id="s-att" className="box-h">
            {t('academy.sessions.attendance')}
          </h2>
          {s.status === 'CANCELLED' ? (
            <p className="text-sm text-muted">{t('errors.ACADEMY_SESSION_CANCELLED')}</p>
          ) : !started ? (
            <p className="text-sm text-muted">{t('errors.ACADEMY_SESSION_NOT_STARTED')}</p>
          ) : (
            <AttendanceForm sessionId={s.id} rows={rows} />
          )}
        </section>
        {v.permissions.includes('session.manage') ? (
          <section className="box" aria-labelledby="s-act">
            <h2 id="s-act" className="box-h">
              {t('academy.sessions.reschedule')}
            </h2>
            <SessionActions session={s} />
          </section>
        ) : null}
      </div>
    </>
  );
}
