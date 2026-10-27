import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';
import type { ClassroomDto, ClassroomQuestionDto, ClassroomReplyDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Markdown } from '@/components/app/markdown';
import { Discussion } from '@/components/classroom/discussions';
import { ClassroomAction } from '@/components/classroom/actions';
import { fmtZoned } from '@/components/academy/format';
export const generateMetadata = () => ({ title: t('classroom.questions') });
export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { id, questionId } = await params;
  const [result, classroom] = await Promise.all([
    apiTry<{ question: ClassroomQuestionDto; replies: ClassroomReplyDto[] }>(
      `/academy/classroom/questions/${questionId}`,
    ),
    apiTry<ClassroomDto>(`/academy/groups/${id}/classroom`),
  ]);
  if (!result || !classroom || result.question.groupId !== id) notFound();
  const q = result.question;
  const canWrite =
    !classroom.readOnly &&
    (classroom.group.myRole !== 'STUDENT' ||
      classroom.group.permissions.includes('student.submit'));
  return (
    <div className="cr-classroom cr-question-page">
      <Link href={`/akademiya/sinif/${id}?tab=questions`} className="cr-back">
        <ArrowLeft className="size-4" />
        {classroom.group.code} · {t('classroom.back')}
      </Link>
      <article className="cr-card">
        <div className="cr-question-heading">
          <span className="cr-tag">
            {q.isPrivate ? (
              <>
                <LockKeyhole className="size-3" />
                {t('classroom.private')}
              </>
            ) : (
              t('classroom.public')
            )}
          </span>
          {q.resolvedAt ? (
            <span className="cr-tag published">
              <CheckCircle2 className="size-3" />
              {t('classroom.resolved')}
            </span>
          ) : null}
        </div>
        <h1>{q.title}</h1>
        <p className="cr-row-meta">
          {q.authorName} · {fmtZoned(q.createdAt, { tz: classroom.group.timezone })}
        </p>
        <Markdown content={q.body} />
        {q.assignmentId ? (
          <Link
            className="cr-external-link"
            href={
              classroom.group.myRole === 'STUDENT'
                ? `/akademiya/tapsiriqlar/${q.assignmentId}`
                : `/muellim/tapsiriqlar/${q.assignmentId}`
            }
          >
            {t('classroom.assignments')}
          </Link>
        ) : null}
        {q.canResolve && canWrite ? (
          <ClassroomAction
            path={`/academy/classroom/questions/${q.id}/resolve`}
            body={{ resolved: !q.resolvedAt }}
          >
            {t(q.resolvedAt ? 'classroom.reopen' : 'classroom.resolve')}
          </ClassroomAction>
        ) : null}
      </article>
      <section className="cr-card">
        <h2 className="cr-side-kicker">{t('classroom.comments')}</h2>
        <Discussion
          kind="question"
          id={q.id}
          initial={result.replies}
          readOnly={!canWrite || !!q.resolvedAt}
        />
      </section>
    </div>
  );
}
