import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  MessageSquare,
} from 'lucide-react';
import type { ClassroomTeacherDeskDto } from '@dacy/shared';
import { fmtZoned } from '@/components/academy/format';
import { t } from '@/lib/i18n';

export function TeacherDesk({ desk }: { desk: ClassroomTeacherDeskDto }) {
  return (
    <section className="cr-desk" data-testid="teacher-desk">
      <div className="cr-section-head">
        <div>
          <span className="cr-eyebrow">DaCy Academy</span>
          <h2>{t('classroom.teacherDesk')}</h2>
          <p>{t('classroom.teacherDeskHint')}</p>
        </div>
        <span className="cr-desk-mark" aria-hidden>
          <ClipboardCheck />
        </span>
      </div>
      <div className="cr-desk-grid">
        <section className="cr-card">
          <h3 className="cr-side-kicker">
            <CalendarDays className="size-4" />
            {t('classroom.upcomingClasses')}
            <span className="cr-count">{desk.sessions.length}</span>
          </h3>
          {desk.sessions.length ? (
            <ul className="cr-desk-list">
              {desk.sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/muellim/dersler/${s.id}`}>
                    <span className="cr-list-icon blue">
                      <CalendarDays />
                    </span>
                    <span>
                      <small>
                        {s.groupCode} · {fmtZoned(s.startsAt, { tz: s.timezone })}
                      </small>
                      <b>{s.title}</b>
                    </span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cr-empty-small">
              <Clock3 className="size-5" />
              <p>{t('classroom.noEvents')}</p>
            </div>
          )}
        </section>
        <section className="cr-card">
          <h3 className="cr-side-kicker">
            <ClipboardCheck className="size-4" />
            {t('classroom.reviewQueue')}
            <span className="cr-count">{desk.reviewCount}</span>
          </h3>
          {desk.reviews.length ? (
            <ul className="cr-desk-list">
              {desk.reviews.map((r) => (
                <li key={r.submissionId}>
                  <Link href={`/muellim/gonderisler/${r.submissionId}`}>
                    <span className="cr-list-icon">
                      <ClipboardCheck />
                    </span>
                    <span>
                      <small>
                        {r.studentName} · {r.groupCode}
                      </small>
                      <b>{r.title}</b>
                    </span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cr-empty-small">
              <CheckCheck className="size-5" />
              <p>{t('classroom.noReviews')}</p>
            </div>
          )}
        </section>
        <section className="cr-card">
          <h3 className="cr-side-kicker">
            <MessageSquare className="size-4" />
            {t('classroom.waitingQuestions')}
            <span className="cr-count">{desk.questionCount}</span>
          </h3>
          {desk.questions.length ? (
            <ul className="cr-desk-list">
              {desk.questions.map((q) => (
                <li key={q.id}>
                  <Link href={`/akademiya/sinif/${q.groupId}/sual/${q.id}`}>
                    <span className="cr-list-icon">
                      {q.isPrivate ? <LockKeyhole /> : <MessageSquare />}
                    </span>
                    <span>
                      <small>
                        {q.authorName} · {q.groupCode}
                      </small>
                      <b>{q.title}</b>
                    </span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cr-empty-small">
              <MessageSquare className="size-5" />
              <p>{t('classroom.noQuestions')}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
