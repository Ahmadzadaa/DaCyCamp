import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarCheck } from 'lucide-react';
import type { AcademyMyAttendanceDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { AttendanceBadge } from '@/components/academy/badges';
import { fmtPct, fmtZoned } from '@/components/academy/format';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.tabs.attendance')} · ${t('academy.title')}` };
}

interface MyAttendance {
  records: AcademyMyAttendanceDto[];
  groups: Array<{
    groupId: string;
    groupCode: string;
    rate: number | null;
    present: number;
    late: number;
    absent: number;
    excused: number;
  }>;
}

export default async function MyAttendancePage() {
  const d = await apiTry<MyAttendance>('/academy/me/attendance');
  if (!d) notFound();
  if (!d.records.length)
    return <EmptyState icon={CalendarCheck} title={t('academy.empty.attendance')} />;
  return (
    <div className="flex flex-col gap-6">
      <section className="ac-cards" aria-label={t('academy.attendancePage.byGroup')}>
        {d.groups.map((g) => (
          <div key={g.groupId} className="ac-card" data-testid="academy-attendance-group">
            <span className="text-sm text-muted">{g.groupCode}</span>
            <b className="text-3xl">{fmtPct(g.rate)}</b>
            <span className="ac-meta">
              <span>
                {t('academy.attendanceStatus.PRESENT')}: <b>{g.present}</b>
              </span>
              <span>
                {t('academy.attendanceStatus.LATE')}: <b>{g.late}</b>
              </span>
              <span>
                {t('academy.attendanceStatus.ABSENT')}: <b>{g.absent}</b>
              </span>
              <span>
                {t('academy.attendanceStatus.EXCUSED')}: <b>{g.excused}</b>
              </span>
            </span>
            <span className="text-xs text-muted">{t('academy.attendancePage.rateHint')}</span>
          </div>
        ))}
      </section>
      <section className="box" aria-labelledby="att-rec">
        <h2 id="att-rec" className="box-h">
          {t('academy.attendancePage.records')}
        </h2>
        <ul className="sup-list">
          {d.records.map((r) => (
            <li key={r.sessionId} className="ac-row py-3">
              <span className="flex min-w-0 flex-col gap-1">
                <b className="truncate">{r.title}</b>
                <span className="ac-meta">
                  <span>{r.groupCode}</span>
                  <span>{fmtZoned(r.startsAt)}</span>
                </span>
              </span>
              <AttendanceBadge status={r.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
